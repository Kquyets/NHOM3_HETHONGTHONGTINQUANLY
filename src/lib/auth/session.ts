import { eq } from "drizzle-orm";

import { AppError } from "../../errors/app-error";
import { getDatabase } from "../database/client";
import { users } from "../database/schema";
import { getAuthSecret } from "../../config/auth";
import { verifyAccessToken as verifyJoseToken, type AccessIdentity } from "./tokens";
import { verifyAccessToken as verifyJwtToken } from "./jwt";

export type AuthenticatedUser = AccessIdentity & { email: string };

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > 4096) {
    throw new AppError("UNAUTHORIZED", "Authentication required.");
  }

  let identity: AccessIdentity | null = null;

  try {
    const secret = getAuthSecret();
    identity = await verifyJoseToken(match[1], secret);
  } catch {
    // Fallback to standard jwt.ts (which uses JWT_SECRET)
  }

  if (!identity) {
    try {
      const payload = verifyJwtToken(match[1]);
      identity = { userId: payload.sub, role: payload.role };
    } catch {
      throw new AppError("UNAUTHORIZED", "Authentication required.");
    }
  }

  const [user] = await getDatabase()
    .select({ id: users.id, email: users.email, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, identity.userId))
    .limit(1);

  if (!user) {
    throw new AppError("UNAUTHORIZED", "User account no longer exists.");
  }
  if (user.status !== "active") {
    throw new AppError("UNAUTHORIZED", "User account is suspended.");
  }

  return { userId: user.id, email: user.email, role: user.role };
}
