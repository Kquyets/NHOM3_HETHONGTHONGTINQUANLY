import { describe, expect, it } from "vitest";

import { assertLocalDatabaseUrl } from "./migration";

describe("local database migration guard", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("accepts loopback host %s", (host) => {
    expect(() => assertLocalDatabaseUrl(`postgres://demo:secret@${host}:5432/demo`)).not.toThrow();
  });

  it("rejects a remote database before connecting", () => {
    expect(() => assertLocalDatabaseUrl("postgres://demo:secret@db.example.com:5432/demo")).toThrow(
      "Database migrations are restricted to localhost",
    );
  });
});
