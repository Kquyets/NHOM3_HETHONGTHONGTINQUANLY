type DatabaseEnvironment = Record<string, string | undefined>;

export function getDatabaseUrl(env: DatabaseEnvironment = process.env): string {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to access PostgreSQL.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  if (!parsedUrl.hostname) {
    throw new Error("DATABASE_URL must include a PostgreSQL host.");
  }

  if (parsedUrl.pathname.length < 2) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return databaseUrl;
}
