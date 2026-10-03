import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock database and external libs before importing the service
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../lib/auth/password", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

vi.mock("../../lib/auth/jwt", () => ({
  signAccessToken: vi.fn(() => "access.token.mock"),
  signRefreshToken: vi.fn(() => "refresh.token.mock"),
  verifyRefreshToken: vi.fn(() => ({
    sub: "user-123",
    jti: "token-id-123",
    type: "refresh",
  })),
  REFRESH_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000,
}));

vi.mock("../../config/env", () => ({
  getDatabaseUrl: vi.fn(() => "postgresql://localhost/test"),
  getJwtSecret: vi.fn(() => "test-secret-at-least-32-characters-long"),
  getJwtRefreshSecret: vi.fn(() => "test-refresh-secret-at-least-32-chars"),
}));

// Chainable query builder helper
function makeChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    set: vi.fn().mockReturnThis(),
  };
  return chain;
}

import {
  register,
  login,
  getMe,
  logout,
} from "./auth.service";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe("register", () => {
    it("creates a new user and returns tokens", async () => {
      const newUser = {
        id: "uuid-1",
        email: "owner@test.com",
        role: "owner" as const,
        status: "active" as const,
        createdAt: new Date(),
      };

      // First select (check duplicate) → empty
      mockDb.select.mockReturnValueOnce(makeChain([]));
      // Insert user → returns user
      mockDb.insert.mockReturnValueOnce(makeChain([newUser]));
      // Insert refresh token → returns token row
      mockDb.insert.mockReturnValueOnce(makeChain([{ id: "rt-1" }]));

      const result = await register({ email: "owner@test.com", password: "password123", role: "owner" });

      expect(result.user.email).toBe("owner@test.com");
      expect(result.user.role).toBe("owner");
      expect(result.tokens.accessToken).toBe("access.token.mock");
    });

    it("throws CONFLICT if email already exists", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([{ id: "existing" }]));

      await expect(
        register({ email: "exists@test.com", password: "password123", role: "owner" }),
      ).rejects.toThrow(expect.objectContaining({ code: "CONFLICT" }));
    });

    it("throws VALIDATION_ERROR if password too short", async () => {
      await expect(
        register({ email: "new@test.com", password: "123", role: "owner" }),
      ).rejects.toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe("login", () => {
    it("returns tokens on valid credentials", async () => {
      const user = {
        id: "uuid-1",
        email: "owner@test.com",
        role: "owner" as const,
        status: "active" as const,
        passwordHash: "hashed:mypassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(makeChain([user]));
      mockDb.insert.mockReturnValueOnce(makeChain([{ id: "rt-1" }]));

      const result = await login({ email: "owner@test.com", password: "mypassword" });

      expect(result.user.id).toBe("uuid-1");
      expect(result.tokens.accessToken).toBe("access.token.mock");
    });

    it("throws UNAUTHORIZED on wrong password", async () => {
      const user = {
        id: "uuid-1",
        email: "owner@test.com",
        role: "owner" as const,
        status: "active" as const,
        passwordHash: "hashed:correctpassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(makeChain([user]));

      await expect(
        login({ email: "owner@test.com", password: "wrongpassword" }),
      ).rejects.toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
    });

    it("throws UNAUTHORIZED when user not found", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      await expect(
        login({ email: "ghost@test.com", password: "anypassword" }),
      ).rejects.toThrow(expect.objectContaining({ code: "UNAUTHORIZED" }));
    });

    it("throws FORBIDDEN when account is disabled", async () => {
      const user = {
        id: "uuid-1",
        email: "disabled@test.com",
        role: "owner" as const,
        status: "disabled" as const,
        passwordHash: "hashed:mypassword",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(makeChain([user]));

      await expect(
        login({ email: "disabled@test.com", password: "mypassword" }),
      ).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    });
  });

  // -------------------------------------------------------------------------
  // getMe
  // -------------------------------------------------------------------------
  describe("getMe", () => {
    it("returns user public info", async () => {
      const user = {
        id: "uuid-1",
        email: "owner@test.com",
        role: "owner" as const,
        status: "active" as const,
        createdAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(makeChain([user]));

      const result = await getMe("uuid-1");

      expect(result.id).toBe("uuid-1");
      expect(result.email).toBe("owner@test.com");
    });

    it("throws NOT_FOUND when user does not exist", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      await expect(getMe("nonexistent")).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  describe("logout", () => {
    it("revokes the refresh token", async () => {
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };
      mockDb.update.mockReturnValueOnce(updateChain);

      // Should not throw
      await expect(logout("some.refreshtoken")).resolves.toBeUndefined();
    });

    it("silently succeeds when token is invalid", async () => {
      const { verifyRefreshToken } = await import("../../lib/auth/jwt");
      vi.mocked(verifyRefreshToken).mockImplementationOnce(() => {
        throw new Error("invalid");
      });

      await expect(logout("invalid.token")).resolves.toBeUndefined();
    });
  });
});
