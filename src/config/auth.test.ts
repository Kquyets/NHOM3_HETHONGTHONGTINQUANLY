import { describe, expect, it } from "vitest";

import { getAuthSecret } from "./auth";

describe("authentication secret configuration", () => {
  it("requires a 32-byte secret without exposing its value in errors", () => {
    expect(() => getAuthSecret({})).toThrow("AUTH_SECRET must contain at least 32 bytes");
    let error: unknown;
    try {
      getAuthSecret({ AUTH_SECRET: "too-short" });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("too-short");
  });

  it("returns a configured secret as signing key bytes", () => {
    const secret = "0123456789abcdef0123456789abcdef";
    expect(getAuthSecret({ AUTH_SECRET: secret })).toEqual(new TextEncoder().encode(secret));
  });
});
