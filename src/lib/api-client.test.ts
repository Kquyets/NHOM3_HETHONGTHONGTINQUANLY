import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiClient,
  ApiRequestError,
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
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
  });
});
