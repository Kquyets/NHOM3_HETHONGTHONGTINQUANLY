import { migrateLocalDatabase } from "../lib/database/migration";

async function main(): Promise<void> {
  try {
    const applied = await migrateLocalDatabase();
    console.log(applied ? "Core database migration applied." : "Core database migration already applied.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Database migration failed.");
    process.exitCode = 1;
  }
}

void main();
