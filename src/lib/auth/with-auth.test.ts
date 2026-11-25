import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signAccessToken } from "./jwt";

const mockLimit = vi.fn();
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: mockLimit,
      })),
    })),
  })),
};

vi.mock("../database/client", () => ({
  getDatabase: () => mockDb,
}));

import { requireAuthContext } from "./with-auth";

describe("requireAuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";
  });

  it("returns fresh DB role for active users", async () => {
    const token = signAccessToken({ sub: "u-1", role: "owner" });
    mockLimit.mockResolvedValueOnce([{ id: "u-1", role: "manager", status: "active" }]);

    const ctx = await requireAuthContext(
      new Request("http://localhost/api/properties", {
        headers: { authorization: `Bearer ${token}` },
      }) as NextRequest,
    );

    expect(ctx).toEqual({ userId: "u-1", role: "manager" });
  });

  it("rejects immediately when user is disabled in DB", async () => {
    const token = signAccessToken({ sub: "u-1", role: "owner" });
    mockLimit.mockResolvedValueOnce([{ id: "u-1", role: "owner", status: "disabled" }]);

    await expect(
      requireAuthContext(
        new Request("http://localhost/api/properties", {
          headers: { authorization: `Bearer ${token}` },
        }) as NextRequest,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects immediately when user no longer exists in DB", async () => {
    const token = signAccessToken({ sub: "u-missing", role: "owner" });
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      requireAuthContext(
        new Request("http://localhost/api/properties", {
          headers: { authorization: `Bearer ${token}` },
        }) as NextRequest,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
