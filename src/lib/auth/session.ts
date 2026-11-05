import { and, eq } from "drizzle-orm";

import { AppError } from "../../errors/app-error";
import { getDatabase } from "../database/client";
import { users } from "../database/schema";
import { getAuthSecret } from "../../config/auth";
import { verifyAccessToken, type AccessIdentity } from "./tokens";

export type AuthenticatedUser = AccessIdentity & { email: string };

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length > 4096) {
    throw new AppError("UNAUTHORIZED", "Authentication required.");
  }

  const secret = getAuthSecret();
  let identity: AccessIdentity;
  try {
    identity = await verifyAccessToken(match[1], secret);
  } catch {
    throw new AppError("UNAUTHORIZED", "Authentication required.");
  }

  const [user] = await getDatabase()
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(and(eq(users.id, identity.userId), eq(users.status, "active")))
    .limit(1);
  if (!user) throw new AppError("UNAUTHORIZED", "Authentication required.");

  return { userId: user.id, email: user.email, role: user.role };
}
