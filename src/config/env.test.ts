import { describe, expect, it } from "vitest";
import { getDatabaseUrl, getJwtSecret, getJwtRefreshSecret, getGeminiApiKey } from "./env";

describe("getDatabaseUrl", () => {
  it("requires a database URL", () => {
    expect(() => getDatabaseUrl({})).toThrow("DATABASE_URL is required");
  });

  it("rejects URLs without a database name without exposing credentials", () => {
    const secretUrl = "postgresql://owner:private-secret@localhost:5432";
    let caughtError: unknown;

    try {
      getDatabaseUrl({ DATABASE_URL: secretUrl });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("DATABASE_URL must include a database name.");
    expect((caughtError as Error).message).not.toContain("private-secret");
  });

  it("rejects non-PostgreSQL URLs", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "http://localhost/housing" })).toThrow(
      "DATABASE_URL must use the PostgreSQL protocol",
    );
  });

  it("returns a valid PostgreSQL connection URL", () => {
    const url = "postgresql://owner:password@localhost:5432/housing";

    expect(getDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });
});

describe("getJwtSecret", () => {
  it("throws when JWT_SECRET is missing", () => {
    expect(() => getJwtSecret({})).toThrow("JWT_SECRET is required");
  });

  it("throws when JWT_SECRET is too short", () => {
    expect(() => getJwtSecret({ JWT_SECRET: "tooshort" })).toThrow("JWT_SECRET is required");
  });

  it("returns secret when valid", () => {
    const secret = "a".repeat(32);
    expect(getJwtSecret({ JWT_SECRET: secret })).toBe(secret);
  });
});

describe("getJwtRefreshSecret", () => {
  it("throws when JWT_REFRESH_SECRET is missing", () => {
    expect(() => getJwtRefreshSecret({})).toThrow("JWT_REFRESH_SECRET is required");
  });

  it("returns secret when valid", () => {
    const secret = "b".repeat(32);
    expect(getJwtRefreshSecret({ JWT_REFRESH_SECRET: secret })).toBe(secret);
  });
});

describe("getGeminiApiKey", () => {
  it("returns undefined when GEMINI_API_KEY is not set", () => {
    expect(getGeminiApiKey({})).toBeUndefined();
  });

  it("returns trimmed API key when set", () => {
    expect(getGeminiApiKey({ GEMINI_API_KEY: " AIzaSyTestKey123 " })).toBe("AIzaSyTestKey123");
  });
});
