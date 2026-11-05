import { seedLocalDatabase } from "../lib/database/seed";

async function main(): Promise<void> {
  try {
    const result = await seedLocalDatabase();
    console.log(
      `Demo database seeded successfully: ${result.propertyCount} properties, ${result.roomCount} rooms, ${result.contractCount} new contracts for owner ${result.ownerId}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Database seeding failed.");
    process.exitCode = 1;
  }
}

void main();
