import { sql } from "drizzle-orm";
import { closeDatabase, getDatabase } from "../lib/database/client";

async function checkDatabaseConnection(): Promise<void> {
  try {
    await getDatabase().execute(sql`select 1`);
    console.log("PostgreSQL connection verified.");
  } catch {
    console.error("PostgreSQL connection failed. Check the local environment and service.");
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void checkDatabaseConnection();
