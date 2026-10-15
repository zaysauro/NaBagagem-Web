export type FeedCursor = { createdAt: string; id: string };
export const feedSources = ["all", "mine", "friends", "following", "discover"] as const;
export type FeedSource = typeof feedSources[number];

export function decodeFeedCursor(value: string | null): FeedCursor | null {
  if (!value) return null;
  if (value.length > 512) throw new Error("Cursor inválido.");
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cursor.id) ||
        typeof cursor.createdAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:\d{2})?)$/.test(cursor.createdAt) ||
        !Number.isFinite(Date.parse(cursor.createdAt))) throw new Error();
    return { id: cursor.id, createdAt: cursor.createdAt };
  } catch { throw new Error("Cursor inválido."); }
}
export const encodeFeedCursor = (row: { id: string; cursor_created_at: string }) =>
  Buffer.from(JSON.stringify({ id: row.id, createdAt: row.cursor_created_at })).toString("base64url");

// Apply source filters and the keyset boundary in SQL before limiting rows.
// Keep PostgreSQL timestamp precision in the cursor, including microseconds.
export function feedPageQuery(userId: string, source: FeedSource, pageSize: number, cursor: FeedCursor | null) {
  const values: unknown[] = [userId];
  const followed = "exists(select 1 from user_follows f where f.follower_id::text=$1 and f.following_id=p.user_id)";
  const follower = "exists(select 1 from user_follows f where f.following_id::text=$1 and f.follower_id=p.user_id)";
  const predicates: Record<FeedSource, string> = {
    all: "true", mine: "p.user_id::text=$1",
    friends: `(p.user_id::text=$1 or (${followed} and ${follower}))`,
    following: `(p.user_id::text<>$1 and ${followed} and not ${follower})`,
    discover: `(p.user_id::text<>$1 and not ${followed})`,
  };
  let where = predicates[source];
  // Reference $1 for the all filter too, avoiding an untyped unused parameter.
  if (source === "all") where = "$1::text is not null";
  if (cursor) {
    values.push(cursor.createdAt, cursor.id);
    where += " and (p.created_at,p.id)<($2::timestamptz,$3::uuid)";
  }
  values.push(pageSize + 1);
  return {
    text: `select p.id,p.user_id,p.trip_id,p.title,p.body,p.visibility,p.created_at,
      p.created_at::text as cursor_created_at from feed_posts p where ${where}
      order by p.created_at desc,p.id desc limit $${values.length}`,
    values,
  };
}
