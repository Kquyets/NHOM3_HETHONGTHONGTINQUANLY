import crypto from "node:crypto";
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
  refreshTokens_,
  parseRefreshTokenCookie,
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

    it("creates a new tenant user and creates/links tenant profile", async () => {
      const newUser = {
        id: "tenant-uuid-1",
        email: "tenant@test.com",
        role: "tenant" as const,
        status: "active" as const,
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        createdAt: new Date(),
      };

      // Check duplicate email → empty
      mockDb.select.mockReturnValueOnce(makeChain([]));
      // Insert user → returns user
      mockDb.insert.mockReturnValueOnce(makeChain([newUser]));
      // Check existing unlinked tenant by phone → empty
      mockDb.select.mockReturnValueOnce(makeChain([]));
      // Insert tenant profile
      mockDb.insert.mockReturnValueOnce(makeChain([{ id: "t-1" }]));
      // Insert refresh token
      mockDb.insert.mockReturnValueOnce(makeChain([{ id: "rt-1" }]));

      const result = await register({
        email: "tenant@test.com",
        password: "password123",
        role: "tenant",
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
      });

      expect(result.user.email).toBe("tenant@test.com");
      expect(result.user.role).toBe("tenant");
      expect(result.user.fullName).toBe("Nguyễn Văn A");
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

    it("throws VALIDATION_ERROR if email format is invalid", async () => {
      await expect(
        register({ email: "not-an-email", password: "password123", role: "owner" }),
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

      const loginTokenId = "11111111-1111-4111-8111-111111111111";
      mockDb.select.mockReturnValueOnce(makeChain([user]));
      const insertChain = makeChain([{ id: loginTokenId }]);
      mockDb.insert.mockReturnValueOnce(insertChain);

      const result = await login({ email: "owner@test.com", password: "mypassword" });

      expect(result.user.id).toBe("uuid-1");
      expect(result.tokens.accessToken).toBe("access.token.mock");

      const parsed = parseRefreshTokenCookie(result.tokens.refreshToken);
      expect(parsed?.tokenId).toBe(loginTokenId);
      const insertedHash = crypto
        .createHash("sha256")
        .update(parsed!.rawSecret)
        .digest("hex");
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: insertedHash }),
      );
    });

    it("authenticates using phone number successfully", async () => {
      const user = {
        id: "uuid-phone",
        email: "manager@test.com",
        phone: "0912345678",
        role: "manager" as const,
        status: "active" as const,
        passwordHash: "hashed:phonepass",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValueOnce(makeChain([user]));
      mockDb.insert.mockReturnValueOnce(makeChain([{ id: "rt-phone" }]));

      const result = await login({ email: "0912345678", password: "phonepass" });
      expect(result.user.id).toBe("uuid-phone");
      expect(result.user.role).toBe("manager");
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
  // parseRefreshTokenCookie & refreshTokens_
  // -------------------------------------------------------------------------
  describe("parseRefreshTokenCookie", () => {
    it("parses valid uuid.secret composite tokens and rejects malformed values", () => {
      const tokenId = "11111111-1111-4111-8111-111111111111";
      const secret = "22222222-2222-4222-8222-222222222222";

      expect(parseRefreshTokenCookie(`${tokenId}.${secret}`)).toEqual({
        tokenId,
        rawSecret: secret,
      });
      expect(parseRefreshTokenCookie("")).toBeNull();
      expect(parseRefreshTokenCookie("no-dot-token")).toBeNull();
      expect(parseRefreshTokenCookie("not-a-uuid.secret")).toBeNull();
      expect(parseRefreshTokenCookie(`${tokenId}.`)).toBeNull();
    });
  });

  describe("refreshTokens_", () => {
    const tokenId = "11111111-1111-4111-8111-111111111111";
    const rawSecret = "22222222-2222-4222-8222-222222222222";
    const compositeToken = `${tokenId}.${rawSecret}`;
    const expectedHash = crypto.createHash("sha256").update(rawSecret).digest("hex");

    it("rotates a valid composite refresh token issued by login/register", async () => {
      const nextTokenId = "33333333-3333-4333-8333-333333333333";

      mockDb.select
        .mockReturnValueOnce(
          makeChain([
            {
              id: tokenId,
              userId: "uuid-1",
              tokenHash: expectedHash,
              expiresAt: new Date(Date.now() + 60_000),
              revokedAt: null,
            },
          ]),
        )
        .mockReturnValueOnce(
          makeChain([{ id: "uuid-1", role: "owner", status: "active" }]),
        );

      const updateChain = makeChain([{ id: tokenId }]);
      mockDb.update.mockReturnValueOnce(updateChain);
      const insertChain = makeChain([{ id: nextTokenId }]);
      mockDb.insert.mockReturnValueOnce(insertChain);

      const tokens = await refreshTokens_(compositeToken);

      expect(tokens.accessToken).toBe("access.token.mock");
      expect(tokens.refreshToken).toMatch(new RegExp(`^${nextTokenId}\\.`));
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "uuid-1",
          replacedByTokenId: tokenId,
        }),
      );
    });

    it("throws UNAUTHORIZED without querying DB when refresh token is malformed", async () => {
      await expect(refreshTokens_("invalid-token")).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
      await expect(refreshTokens_("not-a-uuid.secret")).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when stored token is missing, revoked, or expired", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      await expect(refreshTokens_(compositeToken)).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
    });

    it("throws UNAUTHORIZED when token owner account is disabled", async () => {
      mockDb.select
        .mockReturnValueOnce(
          makeChain([
            {
              id: tokenId,
              userId: "uuid-1",
              tokenHash: expectedHash,
              expiresAt: new Date(Date.now() + 60_000),
              revokedAt: null,
            },
          ]),
        )
        .mockReturnValueOnce(
          makeChain([{ id: "uuid-1", role: "owner", status: "disabled" }]),
        );

      await expect(refreshTokens_(compositeToken)).rejects.toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED" }),
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  describe("logout", () => {
    it("revokes a valid composite refresh token in DB", async () => {
      const tokenId = "11111111-1111-4111-8111-111111111111";
      const rawSecret = "22222222-2222-4222-8222-222222222222";
      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      };
      mockDb.update.mockReturnValueOnce(updateChain);

      await expect(logout(`${tokenId}.${rawSecret}`)).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("silently succeeds without querying DB when token is malformed", async () => {
      await expect(logout("invalid.token")).resolves.toBeUndefined();
      await expect(logout("")).resolves.toBeUndefined();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
