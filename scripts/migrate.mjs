import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
// Explicitly supplied isolated target; no fallback to production app variables.
if (!process.env.MIGRATION_DATABASE_URL || !process.env.MIGRATION_EXPECTED_HOST) throw new Error('Configure MIGRATION_DATABASE_URL and MIGRATION_EXPECTED_HOST for the verified branch.');
const target = new URL(process.env.MIGRATION_DATABASE_URL);
if (target.hostname !== process.env.MIGRATION_EXPECTED_HOST || target.pathname !== '/neondb') throw new Error('Migration target mismatch.');
const pool = new pg.Pool({ connectionString: target.toString() });
const client = await pool.connect();
try {
 await client.query('begin');
 await client.query("select pg_advisory_xact_lock(hashtext('nabagagem-migrations'))");
 await client.query('create table if not exists public.app_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())');
 for (const name of (await readdir(new URL('../db/migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()) {
  const sql=await readFile(new URL('../db/migrations/'+name,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const old=await client.query('select checksum from public.app_migrations where name=$1',[name]);
  if(old.rows[0]) { if(old.rows[0].checksum!==checksum) throw new Error('Applied migration checksum mismatch: '+name); continue; }
  await client.query(sql);
  await client.query('insert into public.app_migrations(name,checksum) values($1,$2)',[name,checksum]);
  console.log('Applied',name);
 }
 await client.query('commit');
} catch(error) { await client.query('rollback'); console.error('Migration rolled back.', error.code || 'migration_error'); process.exitCode=1; }
finally {client.release();await pool.end();}
