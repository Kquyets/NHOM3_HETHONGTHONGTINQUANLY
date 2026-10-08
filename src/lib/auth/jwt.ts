import jwt from "jsonwebtoken";
import { getJwtRefreshSecret, getJwtSecret } from "../../config/env";

export type AccessTokenPayload = {
  sub: string;   // user id
  role: "owner" | "manager" | "tenant";
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;   // user id
  jti: string;   // token id (refresh_tokens.id in DB)
  type: "refresh";
};

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "access" } satisfies AccessTokenPayload,
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "refresh" } satisfies RefreshTokenPayload,
    getJwtRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
  if (payload.type !== "access") {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, getJwtRefreshSecret()) as RefreshTokenPayload;
  if (payload.type !== "refresh") {
    throw new jwt.JsonWebTokenError("Invalid token type");
  }
  return payload;
}

/** Refresh token TTL in milliseconds — used to set DB expiry */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
