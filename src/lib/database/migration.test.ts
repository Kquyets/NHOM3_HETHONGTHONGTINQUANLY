import { describe, expect, it } from "vitest";
import { assertLocalDatabaseUrl } from "./migration";

describe("assertLocalDatabaseUrl", () => {
  it("allows localhost, 127.0.0.1, and [::1]", () => {
    expect(() => assertLocalDatabaseUrl("postgres://user:pass@localhost:5432/db")).not.toThrow();
    expect(() => assertLocalDatabaseUrl("postgres://user:pass@127.0.0.1:5432/db")).not.toThrow();
    expect(() => assertLocalDatabaseUrl("postgres://user:pass@[::1]:5432/db")).not.toThrow();
  });

  it("throws for non-localhost hosts", () => {
    expect(() => assertLocalDatabaseUrl("postgres://user:pass@production-db.internal:5432/db")).toThrow(
      "Database migrations are restricted to localhost",
    );
    expect(() => assertLocalDatabaseUrl("postgres://user:pass@remotehost.com:5432/db")).toThrow(
      "Database migrations are restricted to localhost",
    );
  });
});
