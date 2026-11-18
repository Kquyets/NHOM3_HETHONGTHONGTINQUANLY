"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  apiClient,
  ApiRequestError,
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  refreshStoredTokens,
  setStoredTokens,
} from "./api-client";
import type { UserPublic } from "../modules/auth/auth.service";

export type AuthContextValue = {
  user: UserPublic | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    role: "owner" | "manager" | "tenant",
    fullName?: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export async function bootstrapAuthSession(): Promise<UserPublic | null> {
  let token = getStoredToken();
  const refreshToken = getStoredRefreshToken();

  if (!token && !refreshToken) {
    return null;
  }

  if (!token && refreshToken) {
    token = await refreshStoredTokens();
    if (!token) {
      return null;
    }
  }

  try {
    const data = await apiClient<{ user: UserPublic }>("/api/auth/me");
    return data.user;
  } catch (err) {
    if (
      err instanceof ApiRequestError &&
      (err.status === 401 || err.status === 403 || err.status === 404)
    ) {
      clearStoredTokens();
    }
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    void bootstrapAuthSession().then((resolvedUser) => {
      if (!active) return;
      setUser(resolvedUser);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiClient<{ user: UserPublic }>("/api/auth/me");
      setUser(data.user);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiClient<{
        user: UserPublic;
        tokens: { accessToken: string; refreshToken: string };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
        skipAuth: true,
      });

      setStoredTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      router.replace("/");
    },
    [router],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      role: "owner" | "manager" | "tenant",
      fullName?: string,
      phone?: string,
    ) => {
      const data = await apiClient<{
        user: UserPublic;
        tokens: { accessToken: string; refreshToken: string };
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password, role, fullName, phone }),
        skipAuth: true,
      });

      setStoredTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      router.replace("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    clearStoredTokens();

    if (refreshToken) {
      try {
        await apiClient("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
          skipAuth: true,
        });
      } catch {
        // Best effort
      }
    }

    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshProfile }),
    [user, isLoading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
