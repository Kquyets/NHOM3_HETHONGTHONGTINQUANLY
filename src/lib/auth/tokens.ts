import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import { getAuthSecret } from "../../config/auth";

const issuer = "nhom3-backend";
const audience = "nhom3-client";
const roles = new Set(["owner", "manager", "tenant"]);

export type AuthRole = "owner" | "manager" | "tenant";
export type AccessIdentity = { userId: string; role: AuthRole };

function key(secret: string | Uint8Array): Uint8Array {
  return typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
}

export async function issueAccessToken(
  user: { id: string; role: AuthRole },
  secret: string | Uint8Array = getAuthSecret(),
): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key(secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string | Uint8Array = getAuthSecret(),
): Promise<AccessIdentity> {
  const { payload } = await jwtVerify(token, key(secret), {
    algorithms: ["HS256"],
    issuer,
    audience,
  });
  if (!payload.sub || typeof payload.role !== "string" || !roles.has(payload.role)) {
    throw new Error("Invalid access token claims");
  }
  return { userId: payload.sub, role: payload.role as AuthRole };
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
