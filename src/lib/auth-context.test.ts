import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  setStoredTokens,
} from "./api-client";
import { bootstrapAuthSession } from "./auth-context";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

const demoUser = {
  id: "user-1",
  email: "owner.demo@example.com",
  role: "owner" as const,
  status: "active" as const,
  fullName: "Demo Owner",
  phone: null,
  avatarUrl: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("bootstrapAuthSession", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", localStorageMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearStoredTokens();
    vi.unstubAllGlobals();
  });

  it("returns null without network calls when no tokens are stored", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await expect(bootstrapAuthSession()).resolves.toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("recovers session via refresh token when access token is missing", async () => {
    localStorage.setItem(
      "auth_refresh_token",
      "11111111-1111-4111-8111-111111111111.valid-secret",
    );

    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/refresh") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              tokens: {
                accessToken: "fresh-access",
                refreshToken: "22222222-2222-4222-8222-222222222222.new-secret",
              },
            },
          }),
        };
      }

      if (url === "/api/auth/me") {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        expect(authHeader).toBe("Bearer fresh-access");
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { user: demoUser } }),
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(bootstrapAuthSession()).resolves.toEqual(demoUser);
    expect(getStoredToken()).toBe("fresh-access");
    expect(getStoredRefreshToken()).toBe("22222222-2222-4222-8222-222222222222.new-secret");
  });

  it("refreshes expired access token via apiClient and restores user", async () => {
    setStoredTokens("expired-access", "11111111-1111-4111-8111-111111111111.valid-secret");

    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/refresh") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              tokens: {
                accessToken: "renewed-access",
                refreshToken: "22222222-2222-4222-8222-222222222222.rotated",
              },
            },
          }),
        };
      }

      if (url === "/api/auth/me") {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        if (authHeader === "Bearer renewed-access") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { user: demoUser } }),
          };
        }
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Token expired", details: [] },
          }),
        };
      }

      throw new Error(`Unexpected url: ${url}`);
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(bootstrapAuthSession()).resolves.toEqual(demoUser);
    expect(getStoredToken()).toBe("renewed-access");
    expect(getStoredRefreshToken()).toBe("22222222-2222-4222-8222-222222222222.rotated");
  });

  it("clears stored tokens when /api/auth/me and /api/auth/refresh both reject with 401", async () => {
    setStoredTokens("expired-access", "11111111-1111-4111-8111-111111111111.revoked");

    const mockFetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized", details: [] },
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    await expect(bootstrapAuthSession()).resolves.toBeNull();
    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it("preserves stored tokens on transient 500 or network failures", async () => {
    setStoredTokens("valid-access", "11111111-1111-4111-8111-111111111111.valid-secret");

    const mockFetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "DB warm-up", details: [] },
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    await expect(bootstrapAuthSession()).resolves.toBeNull();
    expect(getStoredToken()).toBe("valid-access");
    expect(getStoredRefreshToken()).toBe("11111111-1111-4111-8111-111111111111.valid-secret");
  });
});
