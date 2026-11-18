import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiClient,
  ApiRequestError,
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  refreshStoredTokens,
  setStoredTokens,
} from "./api-client";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

describe("api-client", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", localStorageMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });

  describe("token storage", () => {
    it("stores and retrieves access and refresh tokens", () => {
      setStoredTokens("access-123", "refresh-456");
      expect(getStoredToken()).toBe("access-123");
      expect(getStoredRefreshToken()).toBe("refresh-456");
    });

    it("clears stored tokens", () => {
      setStoredTokens("access-123", "refresh-456");
      clearStoredTokens();
      expect(getStoredToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });
  });

  describe("apiClient", () => {
    it("attaches Authorization header from stored token", async () => {
      setStoredTokens("saved-token", "saved-refresh");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { foo: "bar" } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const data = await apiClient<{ foo: string }>("/api/test");

      expect(data).toEqual({ foo: "bar" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer saved-token",
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("skips Authorization header when skipAuth is true", async () => {
      setStoredTokens("saved-token", "saved-refresh");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ok: true } }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await apiClient("/api/public", { skipAuth: true });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it("throws ApiRequestError when API returns error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Token expired",
            details: [],
          },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(apiClient("/api/protected")).rejects.toThrow(ApiRequestError);
      await expect(apiClient("/api/protected")).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Token expired",
        status: 401,
      });
    });

    it("automatically refreshes expired access token once across concurrent 401 requests", async () => {
      setStoredTokens("old-access", "11111111-1111-4111-8111-111111111111.secret1");

      let refreshCalls = 0;
      const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;

        if (url === "/api/auth/refresh") {
          refreshCalls += 1;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                tokens: {
                  accessToken: "new-access",
                  refreshToken: "22222222-2222-4222-8222-222222222222.secret2",
                },
              },
            }),
          };
        }

        if (authHeader === "Bearer new-access") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { endpoint: url, ok: true } }),
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
      });
      vi.stubGlobal("fetch", mockFetch);

      const [first, second] = await Promise.all([
        apiClient<{ endpoint: string; ok: boolean }>("/api/dashboard"),
        apiClient<{ endpoint: string; ok: boolean }>("/api/notifications"),
      ]);

      expect(first).toEqual({ endpoint: "/api/dashboard", ok: true });
      expect(second).toEqual({ endpoint: "/api/notifications", ok: true });
      expect(refreshCalls).toBe(1);
      expect(getStoredToken()).toBe("new-access");
      expect(getStoredRefreshToken()).toBe("22222222-2222-4222-8222-222222222222.secret2");
    });

    it("clears stored tokens and throws ApiRequestError when refresh fails with 401", async () => {
      setStoredTokens("old-access", "11111111-1111-4111-8111-111111111111.revoked");

      const mockFetch = vi.fn(async (url: string) => {
        if (url === "/api/auth/refresh") {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              success: false,
              error: { code: "UNAUTHORIZED", message: "Refresh revoked", details: [] },
            }),
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
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(apiClient("/api/protected")).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        status: 401,
      });
      expect(getStoredToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });

    it("does not retry endlessly if the retried request also returns 401", async () => {
      setStoredTokens("old-access", "11111111-1111-4111-8111-111111111111.secret1");

      let protectedCalls = 0;
      let refreshCalls = 0;
      const mockFetch = vi.fn(async (url: string) => {
        if (url === "/api/auth/refresh") {
          refreshCalls += 1;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: {
                tokens: {
                  accessToken: "new-access",
                  refreshToken: "22222222-2222-4222-8222-222222222222.secret2",
                },
              },
            }),
          };
        }

        protectedCalls += 1;
        return {
          ok: false,
          status: 401,
          json: async () => ({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Still unauthorized", details: [] },
          }),
        };
      });
      vi.stubGlobal("fetch", mockFetch);

      await expect(apiClient("/api/protected")).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Still unauthorized",
        status: 401,
      });
      expect(refreshCalls).toBe(1);
      expect(protectedCalls).toBe(2);
    });

    it("refreshStoredTokens returns null cleanly when no refresh token is stored", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      await expect(refreshStoredTokens()).resolves.toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
