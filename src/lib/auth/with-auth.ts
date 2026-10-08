import { type NextRequest } from "next/server";
import { AppError } from "../../errors/app-error";
import { type AccessTokenPayload, verifyAccessToken } from "./jwt";

export type AuthContext = {
  userId: string;
  role: "owner" | "manager" | "tenant";
};

/**
 * Extract and verify Bearer token from the Authorization header.
 * Throws AppError("UNAUTHORIZED") if missing or invalid.
 */
export function getAuthContext(request: NextRequest): AuthContext {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "Missing or invalid Authorization header.", []);
  }

  const token = authHeader.slice(7).trim();

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError("UNAUTHORIZED", "Access token is invalid or expired.", []);
  }

  return { userId: payload.sub, role: payload.role };
}

/**
 * Require specific role(s). Call after getAuthContext().
 */
export function requireRole(
  ctx: AuthContext,
  allowed: Array<"owner" | "manager" | "tenant">,
): void {
  if (!allowed.includes(ctx.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", []);
  }
}
