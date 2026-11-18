import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";
import { hashRefreshToken, issueAccessToken, newRefreshToken, verifyAccessToken } from "./tokens";
import { signAccessToken } from "./jwt";
import { requireAuthenticatedUser } from "./session";

describe("password credentials", () => {
  it("verifies only the password used to create a salted hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("verifies legacy scrypt hashes from earlier database seeds", async () => {
    const saltHex = "0123456789abcdef0123456789abcdef";
    const digestHex = scryptSync("DemoPassword123!", Buffer.from(saltHex, "hex"), 64, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }).toString("hex");
    const legacyHash = `scrypt$16384$8$1$${saltHex}$${digestHex}`;

    expect(await verifyPassword("DemoPassword123!", legacyHash)).toBe(true);
    expect(await verifyPassword("WrongPassword123!", legacyHash)).toBe(false);
  });

  it("rejects malformed or out-of-range scrypt hashes safely", async () => {
    expect(await verifyPassword("DemoPassword123!", "scrypt$16384$8$1$bad$bad")).toBe(false);
    expect(await verifyPassword("DemoPassword123!", "scrypt$1073741824$8$1$0123456789abcdef0123456789abcdef$" + "00".repeat(64))).toBe(false);
  });
});

describe("bearer tokens", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  const user = { id: "d6c72ff9-c144-4707-b05f-02520fc637af", role: "owner" as const };

  it("signs an access token that verifies to its subject and role", async () => {
    const token = await issueAccessToken(user, secret);
    await expect(verifyAccessToken(token, secret)).resolves.toEqual({ userId: user.id, role: user.role });
  });

  it("rejects a token modified after signing", async () => {
    const token = await issueAccessToken(user, secret);
    await expect(verifyAccessToken(`${token.slice(0, -1)}x`, secret)).rejects.toThrow();
  });

  it("stores a hash instead of the refresh-token value", () => {
    const token = newRefreshToken();
    const hash = hashRefreshToken(token);
    expect(token).toHaveLength(43);
    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
  });

  it("rejects requests without a bearer token before accessing PostgreSQL", async () => {
    await expect(requireAuthenticatedUser(new Request("http://localhost/api/properties"))).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("authenticates requests with jwt.ts signed access token", async () => {
    process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";
    const token = signAccessToken({
      sub: user.id,
      role: user.role,
    });
    const authUser = await requireAuthenticatedUser(
      new Request("http://localhost/api/rooms/room-1", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    expect(authUser.userId).toBe(user.id);
    expect(authUser.role).toBe(user.role);
  });
});
