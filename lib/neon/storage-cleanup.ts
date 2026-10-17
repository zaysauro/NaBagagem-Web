import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

type Client = Pick<PoolClient, "query">;
type Job = { id: string; storage_path: string; attempts: number };
type Options = { actorId?: string; limit?: number; timeBudgetMs?: number };
type Summary = { deleted: number; referenced: number; failed: number; skipped: number };
let cleanupPool: Pool | undefined;

export function isStorageCronAuthorized(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

export function cleanupDatabaseTarget(env: NodeJS.ProcessEnv) {
  const connectionString = env.NEON_DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL;
  if (!connectionString) throw new Error("Storage cleanup database unavailable");
  const target = new URL(connectionString);
  if (!env.NEON_DATABASE_HOST || target.hostname !== env.NEON_DATABASE_HOST
    || !["postgres:", "postgresql:"].includes(target.protocol)
    || !target.hostname.endsWith(".neon.tech") || target.pathname !== "/neondb"
    || (target.port && target.port !== "5432")
    || ["host", "hostaddr", "port", "dbname"].some(key => target.searchParams.has(key))) {
    throw new Error("Storage cleanup database target mismatch");
  }
  return target.toString();
}

function ownerPool() {
  if (!cleanupPool) {
    cleanupPool = new Pool({ connectionString: cleanupDatabaseTarget(process.env), max: 2, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
    attachDatabasePool(cleanupPool);
  }
  return cleanupPool;
}

async function inTransaction<T>(client: Client, operation: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("set local statement_timeout='5s'");
    await client.query("set local lock_timeout='2s'");
    const result = await operation();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function lockPath(client: Client, path: string) {
  return (await client.query("select pg_try_advisory_xact_lock(hashtextextended('nabagagem-storage:'||$1,0)) as locked", [path])).rows[0]?.locked === true;
}

async function hasReferences(client: Client, path: string) {
  return (await client.query(`select exists(
    select 1 from public.trip_photos where storage_path=$1
    union all select 1 from public.trip_documents where storage_path=$1
    union all select 1 from public.feed_post_media where storage_path=$1
  ) as referenced`, [path])).rows[0]?.referenced === true;
}

// Owner-only queue access stays in this server module. The caller supplies no SQL
// or storage paths. Durable leases cover the external operation between commits.
export async function processStorageDeletionBatch(client: Client, deleteObject: (path: string) => Promise<void>, options: Options = {}): Promise<Summary> {
  const limit = Math.min(20, Math.max(1, Math.floor(options.limit ?? 20)));
  const deadline = Date.now() + Math.min(40000, Math.max(1000, options.timeBudgetMs ?? 40000));
  const summary: Summary = { deleted: 0, referenced: 0, failed: 0, skipped: 0 };
  const candidates = await client.query<Job>(`select id,storage_path,attempts from app_private.storage_deletions
    where not_before<=now() and (lease_token is null or lease_until<=now())
      and ($1::text is null or actor_id=$1)
    order by not_before,created_at limit $2`, [options.actorId ?? null, limit * 3]);

  for (const candidate of candidates.rows) {
    if (Date.now() >= deadline || summary.deleted + summary.referenced + summary.failed >= limit) break;
    const token = randomUUID();
    const claim = await inTransaction(client, async () => {
      // Acquire the path lock BEFORE the row lock, matching upload triggers.
      if (!await lockPath(client, candidate.storage_path)) return null;
      const current = await client.query<Job>(`select id,storage_path,attempts from app_private.storage_deletions
        where id=$1 and not_before<=now() and (lease_token is null or lease_until<=now())
        for update skip locked`, [candidate.id]);
      const job = current.rows[0];
      if (!job) return null;
      if (await hasReferences(client, job.storage_path)) {
        await client.query("delete from app_private.storage_deletions where id=$1", [job.id]);
        return { kind: "referenced" as const };
      }
      const occupied = await client.query(`select 1 from app_private.storage_deletions where storage_path=$1
        and (not_before>now() or (id<>$2 and lease_token is not null and lease_until>now())) limit 1`, [job.storage_path, job.id]);
      if (occupied.rows.length) return null;
      const claimed = await client.query<Job>(`update app_private.storage_deletions
        set lease_token=$2,lease_until=now()+interval '5 minutes',attempts=attempts+1
        where id=$1 returning id,storage_path,attempts`, [job.id, token]);
      return { kind: "claimed" as const, job: claimed.rows[0] };
    });
    if (!claim) { summary.skipped++; continue; }
    if (claim.kind === "referenced") { summary.referenced++; continue; }

    try {
      await deleteObject(claim.job.storage_path);
    } catch {
      const delaySeconds = Math.min(86400, 60 * 2 ** Math.min(claim.job.attempts - 1, 11));
      // Retain lease_token even on failure: the storage provider might have
      // accepted deletion before timing out, so late attachment remains unsafe.
      await client.query(`update app_private.storage_deletions
        set not_before=now()+$3::integer*interval '1 second',lease_until=now()
        where id=$1 and lease_token=$2`, [claim.job.id, token, delaySeconds]);
      summary.failed++;
      continue;
    }

    const completed = await inTransaction(client, async () => {
      if (!await lockPath(client, claim.job.storage_path)) return false;
      const owned = await client.query("select id from app_private.storage_deletions where id=$1 and lease_token=$2 for update", [claim.job.id, token]);
      if (!owned.rows.length) return false;
      await client.query("insert into app_private.storage_tombstones(storage_path) values($1) on conflict(storage_path) do nothing", [claim.job.storage_path]);
      await client.query("delete from app_private.storage_deletions where storage_path=$1", [claim.job.storage_path]);
      return true;
    });
    if (completed) summary.deleted++; else summary.skipped++;
  }
  return summary;
}

export async function runStorageCleanup(options: Options = {}) {
  const { privateFiles } = await import("./storage");
  const files = privateFiles(); // Validate storage configuration before claiming jobs.
  const client = await ownerPool().connect();
  let failed = false;
  try {
    return await processStorageDeletionBatch(client, path => files.delete(path, { timeout: 5000, retries: 0 }), options);
  } catch {
    failed = true;
    throw new Error("Storage cleanup unavailable");
  } finally {
    client.release(failed);
  }
}

export async function cleanupDeletedObjects() {
  try {
    const { getCurrentUser } = await import("./auth");
    const user = await getCurrentUser();
    if (!user) return;
    const summary = await runStorageCleanup({ actorId: user.id, limit: 5, timeBudgetMs: 10000 });
    if (summary.failed) console.error("storage_cleanup_pending", { count: summary.failed });
  } catch {
    console.error("storage_cleanup_unavailable");
  }
}
