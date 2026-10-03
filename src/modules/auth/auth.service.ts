import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { refreshTokens, users } from "../../lib/database/schema";
import { REFRESH_TOKEN_TTL_MS, signAccessToken, verifyRefreshToken } from "../../lib/auth/jwt";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegisterInput = {
  email: string;
  password: string;
  role: "owner" | "manager";
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserPublic = {
  id: string;
  email: string;
  role: "owner" | "manager" | "tenant";
  status: "active" | "disabled";
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Hash a raw refresh token string for storage */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Register a new owner or manager account.
 * Tenants are created indirectly when a contract is assigned.
 */
export async function register(input: RegisterInput): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const email = normalizeEmail(input.email);

  if (input.password.length < 8) {
    throw new AppError("VALIDATION_ERROR", "Password must be at least 8 characters.", [
      { field: "password", message: "Mật khẩu phải có ít nhất 8 ký tự." },
    ]);
  }

  const db = getDatabase();

  // Check duplicate email
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError("CONFLICT", "Email already registered.", [
      { field: "email", message: "Email đã được đăng ký." },
    ]);
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, role: input.role })
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    });

  if (!user) throw new AppError("DATABASE_ERROR", "Failed to create user.");

  const tokens = await _issueTokens(user.id, user.role);

  return { user, tokens };
}

/**
 * Authenticate with email + password, return tokens.
 */
export async function login(input: LoginInput): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const email = normalizeEmail(input.email);
  const db = getDatabase();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Constant-time guard: always hash even if user not found to prevent timing attacks
  const hashToCompare = user?.passwordHash ?? "$2a$12$invalidhashtopreventtimingattack";
  const passwordOk = await verifyPassword(input.password, hashToCompare);

  if (!user || !passwordOk) {
    throw new AppError("UNAUTHORIZED", "Invalid email or password.", []);
  }

  if (user.status === "disabled") {
    throw new AppError("FORBIDDEN", "Account is disabled.", []);
  }

  const tokens = await _issueTokens(user.id, user.role);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

/**
 * Rotate refresh token — revoke old one, issue new pair.
 */
export async function refreshTokens_(rawRefreshToken: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token.", []);
  }

  const tokenHash = hashToken(rawRefreshToken);
  const db = getDatabase();
  const now = new Date();

  // Find valid token in DB
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.id, payload.jti),
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.userId, payload.sub),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!stored) {
    throw new AppError("UNAUTHORIZED", "Refresh token has been revoked or expired.", []);
  }

  // Get user
  const [user] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user || user.status === "disabled") {
    throw new AppError("UNAUTHORIZED", "Account not found or disabled.", []);
  }

  // Revoke old token
  await db
    .update(refreshTokens)
    .set({ revokedAt: now })
    .where(eq(refreshTokens.id, stored.id));

  // Issue new tokens
  return _issueTokens(user.id, user.role, stored.id);
}

/**
 * Revoke a specific refresh token (logout).
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    // Token already invalid — treat as success
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const db = getDatabase();

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.id, payload.jti),
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      ),
    );
}

/**
 * Get public user info by ID.
 */
export async function getMe(userId: string): Promise<UserPublic> {
  const db = getDatabase();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new AppError("NOT_FOUND", "User not found.", []);

  return user;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _issueTokens(
  userId: string,
  role: "owner" | "manager" | "tenant",
  replacesTokenId?: string,
): Promise<AuthTokens> {
  const db = getDatabase();
  const rawRefresh = crypto.randomUUID();
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  const [dbToken] = await db
    .insert(refreshTokens)
    .values({
      userId,
      tokenHash,
      expiresAt,
      replacedByTokenId: replacesTokenId ?? null,
    })
    .returning({ id: refreshTokens.id });

  if (!dbToken) throw new AppError("DATABASE_ERROR", "Failed to create refresh token.");

  const accessToken = signAccessToken({ sub: userId, role });
  // The raw refresh token (rawRefresh UUID) is what the client stores.
  // We only need signRefreshToken for the jti linkage via dbToken.id — stored hash is of rawRefresh.

  return { accessToken, refreshToken: `${dbToken.id}.${rawRefresh}` };
}

/**
 * Parse composite refresh token string "tokenId.rawSecret"
 * and reconstruct the raw token string for verification.
 */
export function parseRefreshTokenCookie(value: string): { tokenId: string; rawSecret: string } | null {
  const dotIdx = value.indexOf(".");
  if (dotIdx < 0) return null;
  return { tokenId: value.slice(0, dotIdx), rawSecret: value.slice(dotIdx + 1) };
}
