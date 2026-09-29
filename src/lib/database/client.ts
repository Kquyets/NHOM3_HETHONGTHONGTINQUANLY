import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "../../config/env";

type Database = ReturnType<typeof drizzle>;

let pool: Pool | undefined;
let database: Database | undefined;

export function getDatabase() {
  if (!database) {
    pool ??= new Pool({ connectionString: getDatabaseUrl() });
    database = drizzle({ client: pool });
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
