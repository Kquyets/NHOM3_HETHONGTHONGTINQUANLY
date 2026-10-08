import type { ApiError, ApiSuccess } from "../types/api";

const TOKEN_KEY = "auth_access_token";
const REFRESH_KEY = "auth_refresh_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string = "REQUEST_ERROR",
    readonly status: number = 400,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export type RequestOptions = RequestInit & {
  token?: string | null;
  skipAuth?: boolean;
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, skipAuth = false, headers, ...rest } = options;
  const authToken = token !== undefined ? token : getStoredToken();

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && authToken) {
    reqHeaders.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    headers: reqHeaders,
    ...rest,
  });

  const body = (await response.json().catch(() => null)) as
    | ApiSuccess<T>
    | ApiError
    | null;

  if (!response.ok || !body || !body.success) {
    const errorBody = body && !body.success ? body.error : null;
    throw new ApiRequestError(
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody?.code ?? "API_ERROR",
      response.status,
      errorBody?.details ?? [],
    );
  }

  return body.data;
}
