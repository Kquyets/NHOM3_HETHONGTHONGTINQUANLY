import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";
import { AppError } from "../../errors/app-error";
import { getDatabase } from "../database/client";
import { users } from "../database/schema";
import { type AccessTokenPayload, verifyAccessToken } from "./jwt";

export type AuthContext = {
  userId: string;
  role: "owner" | "manager" | "tenant";
};

/**
 * Extract and verify Bearer token from the Authorization header (stateless check).
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
 * Verify Bearer token AND validate user existence/active status in PostgreSQL
 * so suspended or deleted users are rejected immediately instead of waiting for JWT expiry.
 */
export async function requireAuthContext(request: NextRequest): Promise<AuthContext> {
  const stateless = getAuthContext(request);

  const [user] = await getDatabase()
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, stateless.userId))
    .limit(1);

  if (!user || user.status !== "active") {
    throw new AppError("UNAUTHORIZED", "Account is unavailable or disabled.", []);
  }

  return { userId: user.id, role: user.role };
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
