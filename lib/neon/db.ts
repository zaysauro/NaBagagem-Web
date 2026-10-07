import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@vercel/functions";

let pool: Pool | undefined;

function databaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!url) {
    throw new Error("Configure DATABASE_URL ou POSTGRES_URL com a conexão pooled do Neon.");
  }

  return url;
}

export function getPool() {
  if (!pool) {
    const connectionString = databaseUrl();
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    attachDatabasePool(pool);
  }

  return pool;
}

export async function query<T extends QueryResultRow = any>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export function quoteIdentifier(identifier: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Identificador SQL inválido: ${identifier}`);
  }

  return `"${identifier}"`;
}
