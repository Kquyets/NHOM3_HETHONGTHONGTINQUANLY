import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import { getDatabaseUrl } from "../../config/env";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle>;

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;

let pool: Pool | undefined;
let database: Database | undefined;

export function resolveDatabaseConnectionString(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);

  if (parsedUrl.hostname.toLowerCase() === "localhost") {
    parsedUrl.hostname = "127.0.0.1";
    return parsedUrl.toString();
  }

  return databaseUrl;
}

export function createDatabasePoolConfig(databaseUrl = getDatabaseUrl()): PoolConfig {
  return {
    connectionString: resolveDatabaseConnectionString(databaseUrl),
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
  };
}

export function createDatabasePool(databaseUrl = getDatabaseUrl()): Pool {
  return new Pool(createDatabasePoolConfig(databaseUrl));
}

export function getDatabase() {
  if (!database) {
    pool ??= createDatabasePool();
    database = drizzle({ client: pool, schema });
  }

  return database;
}

export async function closeDatabase(): Promise<void> {
  const activePool = pool;
  pool = undefined;
  database = undefined;

  if (activePool) {
    await activePool.end();
  }
}
