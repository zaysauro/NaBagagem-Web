import { types, Pool, type QueryResult, type QueryResultRow, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { getCurrentUser } from "./auth";

types.setTypeParser(1082, value => value);
let pool: Pool | undefined;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Serviço de dados indisponível.");
    const target = new URL(connectionString);
    if (!process.env.NEON_DATABASE_HOST || target.hostname !== process.env.NEON_DATABASE_HOST) throw new Error("Destino do banco não validado.");
    pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
    attachDatabasePool(pool);
  }
  return pool;
}

// Each operation has its own transaction: identity and role cannot leak through the pool.
// RLS is enforced even when the configured connection is owned by neondb_owner.
export async function transaction<T>(operation: (client: Pick<PoolClient, "query">) => Promise<T>, shareToken?: string): Promise<T> {
  const user = await getCurrentUser();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role nabagagem_app");
    await client.query("select set_config('app.user_id',$1,true), set_config('app.share_token',$2,true)", [user?.id || "", shareToken || ""]);
    if (user) await client.query("insert into profiles(id,display_name) values($1,$2) on conflict(id) do nothing", [user.id, user.user_metadata?.name || user.user_metadata?.display_name || null]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    // Never log SQL parameters, credentials, private content or driver messages.
    console.error("database_operation_failed", { code: (error as { code?: string }).code || "unknown" });
    throw new Error("Não foi possível acessar os dados. Tente novamente.");
  } finally { client.release(); }
}

export async function query<T extends QueryResultRow = any>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  return transaction(client => client.query<T>(text, values));
}
export function quoteIdentifier(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) throw new Error("Campo inválido.");
  return `"${identifier}"`;
}
