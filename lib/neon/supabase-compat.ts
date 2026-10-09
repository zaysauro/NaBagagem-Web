import { query, quoteIdentifier, transaction } from "./db";
import { getCurrentUser, type AppUser } from "./auth";
import { storage } from "./storage";

type Result<T = any> = { data: T | null; error: Error | null; count?: number | null };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean };

const OPERATORS: Record<string, string> = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  ilike: "ILIKE",
};

export function createCompatClient(shareToken?: string) {
  return {
    auth: {
      async getUser(): Promise<{ data: { user: AppUser | null }; error: Error | null }> {
        try {
          return { data: { user: await getCurrentUser() }, error: null };
        } catch (error) {
          return { data: { user: null }, error: normalizeError(error) };
        }
      },

    },
    storage,
    from(table: string) {
      return new QueryBuilder(table, shareToken);
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return runRpc(name, args);
    },
  };
}

class QueryBuilder implements PromiseLike<Result<any>> {
  private filters: { sql: string; values: unknown[] }[] = [];
  private orders: Order[] = [];
  private selected = "*";
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any;
  private singleMode: "none" | "single" | "maybeSingle" = "none";
  private countMode: "exact" | null = null;
  private head = false;
  private fromIndex: number | null = null;
  private toIndex: number | null = null;
  private maxRows: number | null = null;
  private conflictColumns: string[] = [];
  private ignoreDuplicates = false;

  constructor(private table: string, private shareToken?: string) {}

  private query(sql: string, values: unknown[] = []) {
    return this.shareToken ? transaction(client => client.query(sql, values), this.shareToken) : query(sql, values);
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selected = columns || "*";
    this.countMode = options?.count || null;
    this.head = options?.head === true;
    return this;
  }

  insert(payload: any) { this.mode = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.mode = "update"; this.payload = payload; return this; }
  delete() { this.mode = "delete"; return this; }

  upsert(payload: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mode = "upsert";
    this.payload = payload;
    this.conflictColumns = (options?.onConflict || ({ profiles: "id", feed_likes: "post_id,user_id", feed_bookmarks: "post_id,user_id", feed_reports: "post_id,user_id", user_follows: "follower_id,following_id", notification_preferences: "user_id", travel_stats: "user_id" }[this.table] || "id")).split(",").map((x) => x.trim()).filter(Boolean);
    this.ignoreDuplicates = options?.ignoreDuplicates === true || ["feed_likes", "feed_bookmarks", "feed_reports", "user_follows"].includes(this.table);
    return this;
  }

  eq(column: string, value: unknown) { return this.addFilter(column, "eq", value); }
  neq(column: string, value: unknown) { return this.addFilter(column, "neq", value); }
  gt(column: string, value: unknown) { return this.addFilter(column, "gt", value); }
  gte(column: string, value: unknown) { return this.addFilter(column, "gte", value); }
  lt(column: string, value: unknown) { return this.addFilter(column, "lt", value); }
  lte(column: string, value: unknown) { return this.addFilter(column, "lte", value); }

  is(column: string, value: unknown) {
    this.filters.push({ sql: `${quoteIdentifier(column)} IS ${value === null ? "NULL" : "NOT NULL"}`, values: [] });
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.filters.push({ sql: `${quoteIdentifier(column)} IS NOT ${value === null ? "NULL" : "NOT NULL"}`, values: [] });
      return this;
    }

    const op = OPERATORS[operator];
    if (!op) throw new Error(`Operador não suportado: ${operator}`);
    this.filters.push({ sql: `NOT (${quoteIdentifier(column)} ${op} ?)`, values: [value] });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push(values.length
      ? { sql: `${quoteIdentifier(column)} = ANY(?)`, values: [values] }
      : { sql: "false", values: [] });
    return this;
  }

  or(expression: string) {
    const values: unknown[] = [];
    const sql = expression.split(",").map((part) => {
      const [column, operator, ...rest] = part.trim().split(".");
      const op = OPERATORS[operator];
      if (!op) throw new Error(`Operador OR não suportado: ${operator}`);
      values.push(rest.join(".").replaceAll("*", "%"));
      return `${quoteIdentifier(column)} ${op} ?`;
    }).join(" OR ");

    this.filters.push({ sql: `(${sql})`, values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst });
    return this;
  }

  limit(value: number) { this.maxRows = value; return this; }
  range(from: number, to: number) { this.fromIndex = from; this.toIndex = to; return this; }
  single() { this.singleMode = "single"; return this; }
  maybeSingle() { this.singleMode = "maybeSingle"; return this; }

  then<TResult1 = Result<any>, TResult2 = never>(
    onfulfilled?: ((value: Result<any>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private addFilter(column: string, operator: string, value: unknown) {
    this.filters.push({ sql: `${quoteIdentifier(column)} ${OPERATORS[operator]} ?`, values: [value] });
    return this;
  }

  private async execute(): Promise<Result<any>> {
    try {
      const result = await this.executeSql();
      const rows = await hydrateRelations(this.table, this.selected, result.rows);
      const data = this.head ? null : this.singleMode === "none" ? rows : rows[0] || null;

      if (this.singleMode === "single" && !rows[0]) {
        return { data: null, error: new Error("Nenhum registro encontrado."), count: result.rowCount };
      }

      return {
        data,
        error: null,
        count: this.countMode ? Number(result.rows[0]?.__count ?? result.rowCount ?? 0) : undefined,
      };
    } catch (error) {
      return { data: null, error: normalizeError(error), count: null };
    }
  }

  private executeSql() {
    if (this.mode === "insert") return this.executeInsert();
    if (this.mode === "update") return this.executeUpdate();
    if (this.mode === "delete") return this.executeDelete();
    if (this.mode === "upsert") return this.executeUpsert();
    return this.executeSelect();
  }

  private executeSelect() {
    const values: unknown[] = [];
    const columns = this.countMode && this.head ? "count(*)::int as __count" : selectedColumns(this.selected);
    return this.query(`select ${columns} from ${quoteIdentifier(this.table)}${this.whereClause(values)}${this.orderClause()}${this.limitClause(values)}`, values);
  }

  private executeInsert() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (!rows.length) return this.query("select null where false");
    const columns = Object.keys(rows[0]);
    const values: unknown[] = [];
    const tuples = rows.map((row) => `(${columns.map((column) => {
      values.push(row[column]);
      return `$${values.length}`;
    }).join(", ")})`).join(", ");
    return this.query(`insert into ${quoteIdentifier(this.table)} (${columns.map(quoteIdentifier).join(", ")}) values ${tuples} returning ${selectedColumns(this.selected)}`, values);
  }

  private executeUpdate() {
    const values: unknown[] = [];
    const assignments = Object.entries(this.payload || {}).map(([column, value]) => {
      values.push(value);
      return `${quoteIdentifier(column)} = $${values.length}`;
    }).join(", ");
    return this.query(`update ${quoteIdentifier(this.table)} set ${assignments}${this.whereClause(values)} returning ${selectedColumns(this.selected)}`, values);
  }

  private executeDelete() {
    const values: unknown[] = [];
    return this.query(`delete from ${quoteIdentifier(this.table)}${this.whereClause(values)} returning ${selectedColumns(this.selected)}`, values);
  }

  private executeUpsert() {
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
    if (!rows.length) return this.query("select null where false");
    const columns = Object.keys(rows[0]);
    const values: unknown[] = [];
    const tuples = rows.map((row) => `(${columns.map((column) => {
      values.push(row[column]);
      return `$${values.length}`;
    }).join(", ")})`).join(", ");
    const conflict = this.conflictColumns.length ? `(${this.conflictColumns.map(quoteIdentifier).join(", ")})` : "";
    const update = this.ignoreDuplicates
      ? "do nothing"
      : `do update set ${columns.map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`).join(", ")}`;
    return this.query(`insert into ${quoteIdentifier(this.table)} (${columns.map(quoteIdentifier).join(", ")}) values ${tuples} on conflict ${conflict} ${update} returning ${selectedColumns(this.selected)}`, values);
  }

  private whereClause(values: unknown[]) {
    if (!this.filters.length) return "";
    const parts = this.filters.map((filter) => {
      let sql = filter.sql;
      for (const value of filter.values) {
        values.push(value);
        sql = sql.replace("?", `$${values.length}`);
      }
      return sql;
    });
    return ` where ${parts.join(" and ")}`;
  }

  private orderClause() {
    if (!this.orders.length) return "";
    return " order by " + this.orders.map((order) => {
      const nulls = order.nullsFirst === undefined ? "" : order.nullsFirst ? " nulls first" : " nulls last";
      return `${quoteIdentifier(order.column)} ${order.ascending ? "asc" : "desc"}${nulls}`;
    }).join(", ");
  }

  private limitClause(values: unknown[]) {
    const limit = this.maxRows ?? (this.fromIndex !== null && this.toIndex !== null ? this.toIndex - this.fromIndex + 1 : null);
    const offset = this.fromIndex;
    const parts: string[] = [];
    if (limit !== null) { values.push(limit); parts.push(` limit $${values.length}`); }
    if (offset !== null) { values.push(offset); parts.push(` offset $${values.length}`); }
    return parts.join("");
  }
}

function selectedColumns(selection: string) {
  if (!selection || selection === "*" || selection.includes("(") || selection.includes(":")) return "*";
  return selection.split(",").map((column) => quoteIdentifier(column.trim())).join(", ");
}

async function hydrateRelations(table: string, selection: string, rows: any[]) {
  if (!rows.length || !selection.includes("profiles")) return rows;
  if (table === "trip_members") return attachProfiles(rows, "user_id", "profiles");
  if (table === "user_follows") return attachProfiles(rows, selection.includes("profiles:following_id") ? "following_id" : "follower_id", "profiles");

  if (table === "feed_bookmarks" && selection.includes("feed_posts")) {
    const postIds = rows.map((row) => row.post_id).filter(Boolean);
    if (!postIds.length) return rows;
    const posts = await query("select * from feed_posts where id = any($1)", [postIds]);
    const media = await query("select * from feed_post_media where post_id = any($1) order by created_at asc", [postIds]);
    const profiles = await profilesById([...new Set(posts.rows.map((post: any) => post.user_id))]);
    const mediaByPost = groupBy(media.rows, "post_id");
    const postsById = new Map(posts.rows.map((post: any) => [post.id, { ...post, profiles: profiles.get(post.user_id) || null, feed_post_media: mediaByPost.get(post.id) || [] }]));
    return rows.map((row) => ({ ...row, feed_posts: postsById.get(row.post_id) || null }));
  }

  return rows;
}

async function attachProfiles(rows: any[], key: string, property: string) {
  const profiles = await profilesById([...new Set(rows.map((row) => row[key]).filter(Boolean))]);
  return rows.map((row) => ({ ...row, [property]: profiles.get(row[key]) || null }));
}

async function profilesById(ids: unknown[]) {
  if (!ids.length) return new Map();
  const result = await query("select id, display_name, username, avatar_url, bio from profiles where id = any($1)", [ids]);
  return new Map(result.rows.map((profile: any) => [profile.id, profile]));
}

function groupBy(rows: any[], key: string) {
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    const list = grouped.get(row[key]) || [];
    list.push(row);
    grouped.set(row[key], list);
  }
  return grouped;
}

async function runRpc(name: string, args: Record<string, unknown>) {
  try {
    if (name === "search_profiles") {
      const result = await query("select * from search_profiles($1, $2)", [args.search_query ?? args.search_term, args.limit_count ?? 20]);
      return { data: result.rows, error: null };
    }
    if (name === "profile_contribution_score") {
      const result = await query("select profile_contribution_score($1) as value", [args.p_user_id]);
      return { data: result.rows[0]?.value ?? 0, error: null };
    }
    return { data: null, error: new Error(`RPC não suportada: ${name}`) };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

function normalizeError(error: unknown) {
  return new Error("Não foi possível acessar os dados. Tente novamente.");
}
