import { describe, expect, it } from "vitest";

import {
  createDatabasePoolConfig,
  resolveDatabaseConnectionString,
} from "./client";

describe("resolveDatabaseConnectionString", () => {
  it("rewrites localhost to 127.0.0.1 to avoid IPv6 loopback stalls on Windows", () => {
    expect(
      resolveDatabaseConnectionString("postgresql://postgres:secret@localhost:5432/nhom3"),
    ).toBe("postgresql://postgres:secret@127.0.0.1:5432/nhom3");

    expect(
      resolveDatabaseConnectionString(
        "postgres://user:p%40ss@LOCALHOST:5433/app_db?sslmode=disable",
      ),
    ).toBe("postgres://user:p%40ss@127.0.0.1:5433/app_db?sslmode=disable");
  });

  it("keeps explicit IPs and remote hostnames unchanged", () => {
    expect(
      resolveDatabaseConnectionString("postgresql://postgres:secret@127.0.0.1:5432/nhom3"),
    ).toBe("postgresql://postgres:secret@127.0.0.1:5432/nhom3");

    expect(
      resolveDatabaseConnectionString("postgresql://postgres:secret@[::1]:5432/nhom3"),
    ).toBe("postgresql://postgres:secret@[::1]:5432/nhom3");

    expect(
      resolveDatabaseConnectionString("postgresql://postgres:secret@db.internal:5432/nhom3?sslmode=require"),
    ).toBe("postgresql://postgres:secret@db.internal:5432/nhom3?sslmode=require");
  });
});

describe("createDatabasePoolConfig", () => {
  it("normalizes localhost URLs and sets a finite connectionTimeoutMillis", () => {
    const config = createDatabasePoolConfig("postgresql://postgres:secret@localhost:5432/nhom3");

    expect(config.connectionString).toBe("postgresql://postgres:secret@127.0.0.1:5432/nhom3");
    expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
    expect(config.connectionTimeoutMillis).toBeLessThanOrEqual(15_000);
  });
});
