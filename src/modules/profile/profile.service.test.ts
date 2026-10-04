import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../lib/auth/password", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
  verifyPassword: vi.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

function makeChain(result: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    innerJoin: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return chain;
}

import { changePassword, getProfile, updateProfile } from "./profile.service";

describe("profile.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns profile for owner with staff statistics", async () => {
      const mockUser = {
        id: "owner-1",
        email: "owner@test.com",
        role: "owner" as const,
        status: "active" as const,
        fullName: "Chủ Nhà A",
        phone: "0911222333",
        avatarUrl: null,
        createdAt: new Date(),
      };

      mockDb.select
        .mockReturnValueOnce(makeChain([mockUser])) // select user
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }) // properties count
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 10 }]),
        }); // rooms count

      const result = await getProfile("owner-1");

      expect(result.id).toBe("owner-1");
      expect(result.role).toBe("owner");
      expect(result.staffInfo?.propertiesCount).toBe(2);
      expect(result.staffInfo?.roomsCount).toBe(10);
    });

    it("throws NOT_FOUND if user does not exist", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      await expect(getProfile("non-existent")).rejects.toThrow(
        expect.objectContaining({ code: "NOT_FOUND" }),
      );
    });
  });

  describe("updateProfile", () => {
    it("updates full name and phone", async () => {
      const updatedUser = {
        id: "user-1",
        email: "user@test.com",
        role: "owner" as const,
        status: "active" as const,
        fullName: "Tên Mới",
        phone: "0988776655",
        avatarUrl: null,
        createdAt: new Date(),
      };

      mockDb.update.mockReturnValue(makeChain([]));
      // getProfile mock calls
      mockDb.select
        .mockReturnValueOnce(makeChain([updatedUser]))
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        });

      const res = await updateProfile("user-1", {
        fullName: "Tên Mới",
        phone: "0988776655",
      });

      expect(res.fullName).toBe("Tên Mới");
      expect(res.phone).toBe("0988776655");
    });
  });

  describe("changePassword", () => {
    it("changes password successfully when current password matches", async () => {
      const mockUser = {
        id: "user-1",
        passwordHash: "hashed:oldpass123",
      };

      mockDb.select.mockReturnValueOnce(makeChain([mockUser]));
      mockDb.update.mockReturnValue(makeChain([]));

      await expect(
        changePassword("user-1", {
          currentPassword: "oldpass123",
          newPassword: "newpassword123",
        }),
      ).resolves.toBeUndefined();
    });

    it("throws VALIDATION_ERROR when current password is wrong", async () => {
      const mockUser = {
        id: "user-1",
        passwordHash: "hashed:correctpass",
      };

      mockDb.select.mockReturnValueOnce(makeChain([mockUser]));

      await expect(
        changePassword("user-1", {
          currentPassword: "wrongpassword",
          newPassword: "newpassword123",
        }),
      ).rejects.toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
    });
  });
});
