import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

import { getDatabaseUrl } from "../../config/env";

export function assertLocalDatabaseUrl(databaseUrl: string): void {
  const host = new URL(databaseUrl).hostname.toLowerCase();
  if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(host)) {
    throw new Error("Database migrations are restricted to localhost");
  }
}

export async function migrateLocalDatabase(customUrl?: string): Promise<boolean> {
  const databaseUrl = customUrl ?? getDatabaseUrl();
  assertLocalDatabaseUrl(databaseUrl);

  const drizzleDir = resolve(process.cwd(), "drizzle");
  const files = await readdir(drizzleDir);
  const migrationFiles = files
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('schema_migrations_lock'))");
      await client.query(
        "CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
      );

      let anyApplied = false;
      for (const file of migrationFiles) {
        const applied = await client.query("SELECT 1 FROM public.schema_migrations WHERE name = $1", [
          file,
        ]);
        if (!applied.rowCount) {
          const migrationSql = await readFile(resolve(drizzleDir, file), "utf8");
          await client.query(migrationSql);
          await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [file]);
          anyApplied = true;
        }
      }

      await client.query("COMMIT");
      return anyApplied;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
