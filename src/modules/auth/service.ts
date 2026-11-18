import { and, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { AppError } from "../../errors/app-error";
import { getDatabase } from "../../lib/database/client";
import { refreshTokens, tenants, users } from "../../lib/database/schema";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { hashRefreshToken, issueAccessToken, newRefreshToken, type AuthRole } from "../../lib/auth/tokens";
import type { loginSchema, registerSchema } from "../../lib/auth/validation";

type RegisterInput = typeof registerSchema._output;
type LoginInput = typeof loginSchema._output;
type User = { id: string; email: string; role: AuthRole };
type SaveRefreshToken = (token: typeof refreshTokens.$inferInsert) => Promise<void>;

const accessTokenSeconds = 15 * 60;
const refreshTokenMilliseconds = 30 * 24 * 60 * 60 * 1000;

async function issueTokenPair(user: User, save: SaveRefreshToken) {
  const refreshToken = newRefreshToken();
  await save({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + refreshTokenMilliseconds),
  });
  return {
    accessToken: await issueAccessToken(user),
    refreshToken,
    tokenType: "Bearer" as const,
    expiresIn: accessTokenSeconds,
    user,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: unknown };
  if (candidate.code === "23505") return true;
  return candidate.cause !== error && isUniqueViolation(candidate.cause);
}

export async function registerTenant(input: RegisterInput) {
  const database = getDatabase();
  const passwordHash = await hashPassword(input.password);
  try {
    return await database.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        email: input.email,
        passwordHash,
        role: "tenant",
      }).returning({ id: users.id, email: users.email, role: users.role });
      await tx.insert(tenants).values({
        userId: user.id,
        fullName: input.fullName,
        phone: input.phone,
      });
      return issueTokenPair(user, async (token) => { await tx.insert(refreshTokens).values(token); });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", "An account with this email already exists.");
    throw error;
  }
}

export async function login(input: LoginInput) {
  const [user] = await getDatabase()
    .select({ id: users.id, email: users.email, role: users.role, passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (!user || user.status !== "active" || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password.");
  }
  const publicUser: User = { id: user.id, email: user.email, role: user.role };
  return issueTokenPair(publicUser, async (token) => { await getDatabase().insert(refreshTokens).values(token); });
}

export async function rotateRefreshToken(rawToken: string) {
  const database = getDatabase();
  const tokenHash = hashRefreshToken(rawToken);
  return database.transaction(async (tx) => {
    const [existing] = await tx.select({ id: refreshTokens.id, userId: refreshTokens.userId })
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        isNull(refreshTokens.replacedByTokenId),
        gt(refreshTokens.expiresAt, new Date()),
      ))
      .limit(1);
    if (!existing) throw new AppError("UNAUTHORIZED", "Refresh token is invalid or expired.");

    const [user] = await tx.select({ id: users.id, email: users.email, role: users.role, status: users.status })
      .from(users)
      .where(and(eq(users.id, existing.userId), eq(users.status, "active")))
      .limit(1);
    if (!user) throw new AppError("UNAUTHORIZED", "Refresh token is invalid or expired.");

    const replacementId = randomUUID();
    const pair = await issueTokenPair(user, async (token) => {
      await tx.insert(refreshTokens).values({ ...token, id: replacementId });
    });
    const [revoked] = await tx.update(refreshTokens)
      .set({ revokedAt: new Date(), replacedByTokenId: replacementId })
      .where(and(
        eq(refreshTokens.id, existing.id),
        isNull(refreshTokens.revokedAt),
        isNull(refreshTokens.replacedByTokenId),
        gt(refreshTokens.expiresAt, new Date()),
      ))
      .returning({ id: refreshTokens.id });
    if (!revoked) throw new AppError("UNAUTHORIZED", "Refresh token is invalid or expired.");
    return pair;
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await getDatabase().update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)), isNull(refreshTokens.revokedAt)));
}
