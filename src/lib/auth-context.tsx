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
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
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
    role: "owner" | "manager",
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const token = getStoredToken();

    if (!token) {
      const timer = setTimeout(() => {
        if (active) setIsLoading(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    async function verifySession(authToken: string) {
      try {
        const data = await apiClient<{ user: UserPublic }>("/api/auth/me", {
          token: authToken,
        });
        if (active) {
          setUser(data.user);
        }
      } catch {
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            const refreshed = await apiClient<{
              tokens: { accessToken: string; refreshToken: string };
            }>("/api/auth/refresh", {
              method: "POST",
              body: JSON.stringify({ refreshToken }),
              skipAuth: true,
            });
            setStoredTokens(refreshed.tokens.accessToken, refreshed.tokens.refreshToken);
            const me = await apiClient<{ user: UserPublic }>("/api/auth/me", {
              token: refreshed.tokens.accessToken,
            });
            if (active) {
              setUser(me.user);
              setIsLoading(false);
              return;
            }
          } catch {
            // Refresh token invalid or expired
          }
        }
        clearStoredTokens();
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void verifySession(token);

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiClient<{
        user: UserPublic;
        tokens: { accessToken: string; refreshToken: string };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      setStoredTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      router.push("/");
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, role: "owner" | "manager") => {
      const data = await apiClient<{
        user: UserPublic;
        tokens: { accessToken: string; refreshToken: string };
      }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
        skipAuth: true,
      });

      setStoredTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      router.push("/");
    },
    [router],
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
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
    clearStoredTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
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
