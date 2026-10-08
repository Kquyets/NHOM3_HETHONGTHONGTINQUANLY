import { and, count, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import {
  contracts,
  contractTenants,
  properties,
  propertyMembers,
  refreshTokens,
  rooms,
  tenants,
  users,
} from "../../lib/database/schema";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { AppError } from "../../errors/app-error";

export type ProfileData = {
  id: string;
  email: string;
  role: "owner" | "manager" | "tenant";
  status: "active" | "disabled";
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  tenantInfo?: {
    id: string;
    roomNumber: string | null;
    propertyName: string | null;
    landlordName: string | null;
    contractStatus: string | null;
  } | null;
  staffInfo?: {
    propertiesCount: number;
    roomsCount: number;
  } | null;
};

export type UpdateProfileInput = {
  fullName?: string;
  phone?: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

/**
 * Get unified profile information for the authenticated user.
 */
export async function getProfile(userId: string): Promise<ProfileData> {
  const db = getDatabase();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      fullName: users.fullName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError("NOT_FOUND", "Người dùng không tồn tại.", []);
  }

  let tenantInfo: ProfileData["tenantInfo"] = null;
  let staffInfo: ProfileData["staffInfo"] = null;

  if (user.role === "tenant") {
    const [tRow] = await db
      .select({
        id: tenants.id,
        fullName: tenants.fullName,
        phone: tenants.phone,
      })
      .from(tenants)
      .where(eq(tenants.userId, userId))
      .limit(1);

    if (tRow) {
      const [stay] = await db
        .select({
          roomNumber: rooms.roomNumber,
          propertyName: properties.name,
          contractStatus: contracts.status,
          landlordName: users.fullName,
        })
        .from(contractTenants)
        .innerJoin(contracts, eq(contracts.id, contractTenants.contractId))
        .innerJoin(rooms, eq(rooms.id, contracts.roomId))
        .innerJoin(properties, eq(properties.id, rooms.propertyId))
        .innerJoin(users, eq(users.id, properties.ownerId))
        .where(
          and(
            eq(contractTenants.tenantId, tRow.id),
            eq(contracts.status, "active"),
          ),
        )
        .limit(1);

      tenantInfo = {
        id: tRow.id,
        roomNumber: stay?.roomNumber ?? null,
        propertyName: stay?.propertyName ?? null,
        landlordName: stay?.landlordName ?? null,
        contractStatus: stay?.contractStatus ?? null,
      };
    }
  } else if (user.role === "owner") {
    const [propsRes] = await db
      .select({ count: count() })
      .from(properties)
      .where(eq(properties.ownerId, userId));

    const [roomsRes] = await db
      .select({ count: count() })
      .from(rooms)
      .innerJoin(properties, eq(properties.id, rooms.propertyId))
      .where(eq(properties.ownerId, userId));

    staffInfo = {
      propertiesCount: propsRes?.count ?? 0,
      roomsCount: roomsRes?.count ?? 0,
    };
  } else if (user.role === "manager") {
    const [propsRes] = await db
      .select({ count: count() })
      .from(propertyMembers)
      .where(and(eq(propertyMembers.userId, userId), eq(propertyMembers.status, "active")));

    staffInfo = {
      propertiesCount: propsRes?.count ?? 0,
      roomsCount: 0,
    };
  }

  return {
    ...user,
    tenantInfo,
    staffInfo,
  };
}

/**
 * Update personal profile details (full name, phone).
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<ProfileData> {
  const db = getDatabase();

  const fullName = input.fullName !== undefined ? input.fullName.trim() || null : undefined;
  const phone = input.phone !== undefined ? input.phone.trim() || null : undefined;

  const updateSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (fullName !== undefined) updateSet.fullName = fullName;
  if (phone !== undefined) updateSet.phone = phone;

  await db
    .update(users)
    .set(updateSet)
    .where(eq(users.id, userId));

  // If user is a tenant, also keep tenants profile in sync
  if (fullName !== undefined || phone !== undefined) {
    const tenantUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (fullName) tenantUpdate.fullName = fullName;
    if (phone !== undefined) tenantUpdate.phone = phone;

    await db
      .update(tenants)
      .set(tenantUpdate)
      .where(eq(tenants.userId, userId));
  }

  return getProfile(userId);
}

/**
 * Change account password with verification of current password.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  if (!input.currentPassword) {
    throw new AppError("VALIDATION_ERROR", "Vui lòng nhập mật khẩu hiện tại.", [
      { field: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại." },
    ]);
  }

  if (!input.newPassword || input.newPassword.length < 8) {
    throw new AppError("VALIDATION_ERROR", "Mật khẩu mới phải có ít nhất 8 ký tự.", [
      { field: "newPassword", message: "Mật khẩu mới phải có ít nhất 8 ký tự." },
    ]);
  }

  const db = getDatabase();

  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError("NOT_FOUND", "Người dùng không tồn tại.", []);
  }

  const isCurrentValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw new AppError("VALIDATION_ERROR", "Mật khẩu hiện tại không chính xác.", [
      { field: "currentPassword", message: "Mật khẩu hiện tại không chính xác." },
    ]);
  }

  const newHash = await hashPassword(input.newPassword);

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Revoke existing refresh tokens for security
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.userId, userId));
}
