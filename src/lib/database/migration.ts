import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

import { getDatabaseUrl } from "../../config/env";

const migrationName = "0000_core_schema.sql";

export function assertLocalDatabaseUrl(databaseUrl: string): void {
  const host = new URL(databaseUrl).hostname.toLowerCase();
  if (!new Set(["localhost", "127.0.0.1", "[::1]"]).has(host)) {
    throw new Error("Database migrations are restricted to localhost");
  }
}

export async function migrateLocalDatabase(customUrl?: string): Promise<boolean> {
  const databaseUrl = customUrl ?? getDatabaseUrl();
  assertLocalDatabaseUrl(databaseUrl);

  const migrationSql = await readFile(resolve(process.cwd(), "drizzle", migrationName), "utf8");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [migrationName]);
      await client.query(
        "CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
      );
      const applied = await client.query("SELECT 1 FROM public.schema_migrations WHERE name = $1", [
        migrationName,
      ]);
      if (applied.rowCount) {
        await client.query("COMMIT");
        return false;
      }

      await client.query(migrationSql);
      await client.query("INSERT INTO public.schema_migrations (name) VALUES ($1)", [migrationName]);
      await client.query("COMMIT");
      return true;
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
