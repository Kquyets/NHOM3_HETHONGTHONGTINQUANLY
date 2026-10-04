import { and, eq, or } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { properties, propertyMembers, users } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";
import { createNotification } from "../notifications/notification.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyRow = {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  bankCode?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePropertyInput = {
  name: string;
  address?: string | null;
  bankCode?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
};

export type UpdatePropertyInput = {
  name?: string;
  address?: string | null;
  bankCode?: string | null;
  bankAccount?: string | null;
  accountHolder?: string | null;
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

/** Returns true if userId is owner OR active manager of propertyId */
async function canAccess(userId: string, role: string, propertyId: string): Promise<boolean> {
  if (role === "owner") {
    const db = getDatabase();
    const [row] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.ownerId, userId)))
      .limit(1);
    return Boolean(row);
  }

  if (role === "manager") {
    const db = getDatabase();
    const [row] = await db
      .select({ id: propertyMembers.id })
      .from(propertyMembers)
      .where(
        and(
          eq(propertyMembers.propertyId, propertyId),
          eq(propertyMembers.userId, userId),
          eq(propertyMembers.status, "active"),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  return false;
}

async function assertAccess(userId: string, role: string, propertyId: string): Promise<void> {
  const ok = await canAccess(userId, role, propertyId);
  if (!ok) throw new AppError("FORBIDDEN", "You do not have access to this property.", []);
}

async function assertOwner(userId: string, role: string, propertyId: string): Promise<void> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Only owners can perform this action.", []);
  }
  await assertAccess(userId, role, propertyId);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const PROPERTY_SELECT_COLUMNS = {
  id: properties.id,
  ownerId: properties.ownerId,
  name: properties.name,
  address: properties.address,
  bankCode: properties.bankCode,
  bankAccount: properties.bankAccount,
  accountHolder: properties.accountHolder,
  createdAt: properties.createdAt,
  updatedAt: properties.updatedAt,
} as const;

/**
 * List properties accessible by the user.
 * Owners see their own properties; managers see properties they're assigned to.
 */
export async function listProperties(userId: string, role: string): Promise<PropertyRow[]> {
  const db = getDatabase();

  if (role === "owner") {
    return db
      .select(PROPERTY_SELECT_COLUMNS)
      .from(properties)
      .where(eq(properties.ownerId, userId))
      .orderBy(properties.createdAt);
  }

  if (role === "manager") {
    // Join to get assigned properties
    return db
      .select(PROPERTY_SELECT_COLUMNS)
      .from(properties)
      .innerJoin(
        propertyMembers,
        and(
          eq(propertyMembers.propertyId, properties.id),
          eq(propertyMembers.userId, userId),
          eq(propertyMembers.status, "active"),
        ),
      )
      .orderBy(properties.createdAt);
  }

  return [];
}

/**
 * Get a single property. Throws if not found or user has no access.
 */
export async function getProperty(
  userId: string,
  role: string,
  propertyId: string,
): Promise<PropertyRow> {
  await assertAccess(userId, role, propertyId);

  const db = getDatabase();
  const [row] = await db
    .select(PROPERTY_SELECT_COLUMNS)
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Property not found.", []);
  return row;
}

/**
 * Create a new property. Only owners can create.
 */
export async function createProperty(
  userId: string,
  role: string,
  input: CreatePropertyInput,
): Promise<PropertyRow> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Only owners can create properties.", []);
  }

  const name = input.name?.trim();
  if (!name) {
    throw new AppError("VALIDATION_ERROR", "Property name is required.", [
      { field: "name", message: "Tên nhà trọ không được để trống." },
    ]);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(properties)
    .values({
      ownerId: userId,
      ownerRole: "owner",
      name,
      address: input.address?.trim() ?? null,
      bankCode: input.bankCode?.trim() ?? null,
      bankAccount: input.bankAccount?.trim() ?? null,
      accountHolder: input.accountHolder?.trim() ? input.accountHolder.trim().toUpperCase() : null,
    })
    .returning(PROPERTY_SELECT_COLUMNS);

  if (!row) throw new AppError("DATABASE_ERROR", "Failed to create property.");
  return row;
}

/**
 * Update a property. Only owners can update.
 */
export async function updateProperty(
  userId: string,
  role: string,
  propertyId: string,
  input: UpdatePropertyInput,
): Promise<PropertyRow> {
  await assertOwner(userId, role, propertyId);

  const updates: Partial<typeof properties.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "Property name cannot be empty.", [
        { field: "name", message: "Tên nhà trọ không được để trống." },
      ]);
    }
    updates.name = name;
  }

  if (input.address !== undefined) {
    updates.address = input.address?.trim() ?? null;
  }

  if (input.bankCode !== undefined) {
    updates.bankCode = input.bankCode?.trim() ?? null;
  }

  if (input.bankAccount !== undefined) {
    updates.bankAccount = input.bankAccount?.trim() ?? null;
  }

  if (input.accountHolder !== undefined) {
    updates.accountHolder = input.accountHolder?.trim() ? input.accountHolder.trim().toUpperCase() : null;
  }

  const db = getDatabase();
  const [row] = await db
    .update(properties)
    .set(updates)
    .where(eq(properties.id, propertyId))
    .returning(PROPERTY_SELECT_COLUMNS);

  if (!row) throw new AppError("NOT_FOUND", "Property not found.", []);
  return row;
}

/**
 * Delete a property. Only owners can delete.
 */
export async function deleteProperty(
  userId: string,
  role: string,
  propertyId: string,
): Promise<void> {
  await assertOwner(userId, role, propertyId);

  const db = getDatabase();
  const result = await db
    .delete(properties)
    .where(eq(properties.id, propertyId));

  if (!result) throw new AppError("NOT_FOUND", "Property not found.", []);
}

// ---------------------------------------------------------------------------
// Property Members (Staff / Managers)
// ---------------------------------------------------------------------------

export type PropertyMemberRow = {
  id: string;
  propertyId: string;
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  status: "active" | "revoked";
  createdAt: Date;
};

/**
 * List all managers assigned to a property.
 */
export async function listPropertyMembers(
  userId: string,
  role: string,
  propertyId: string,
): Promise<PropertyMemberRow[]> {
  await assertAccess(userId, role, propertyId);
  const db = getDatabase();

  const rows = await db
    .select({
      id: propertyMembers.id,
      propertyId: propertyMembers.propertyId,
      userId: propertyMembers.userId,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: propertyMembers.managerRole,
      status: propertyMembers.status,
      createdAt: propertyMembers.createdAt,
    })
    .from(propertyMembers)
    .innerJoin(users, eq(users.id, propertyMembers.userId))
    .where(
      and(
        eq(propertyMembers.propertyId, propertyId),
        eq(propertyMembers.status, "active"),
      ),
    );

  return rows as PropertyMemberRow[];
}

/**
 * Add a manager to a property by email or phone. Only owner can add.
 */
export async function addPropertyMember(
  userId: string,
  role: string,
  propertyId: string,
  emailOrPhone: string,
): Promise<PropertyMemberRow> {
  await assertOwner(userId, role, propertyId);
  const db = getDatabase();

  const query = emailOrPhone.trim().toLowerCase();
  const [targetUser] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(or(eq(users.email, query), eq(users.phone, emailOrPhone.trim())))
    .limit(1);

  if (!targetUser) {
    throw new AppError(
      "NOT_FOUND",
      "Không tìm thấy tài khoản người dùng với email hoặc số điện thoại này.",
      [{ field: "emailOrPhone", message: "Tài khoản không tồn tại trong hệ thống." }],
    );
  }

  // Check if already an active member
  const [existing] = await db
    .select({ id: propertyMembers.id, status: propertyMembers.status })
    .from(propertyMembers)
    .where(
      and(
        eq(propertyMembers.propertyId, propertyId),
        eq(propertyMembers.userId, targetUser.id),
      ),
    )
    .limit(1);

  let memberId = existing?.id;

  if (existing) {
    if (existing.status === "active") {
      throw new AppError(
        "BUSINESS_RULE_ERROR",
        "Người dùng này đã là quản lý của tòa nhà.",
        [],
      );
    }
    // Reactivate revoked member
    await db
      .update(propertyMembers)
      .set({ status: "active" })
      .where(eq(propertyMembers.id, existing.id));
  } else {
    const [inserted] = await db
      .insert(propertyMembers)
      .values({
        propertyId,
        userId: targetUser.id,
        managerRole: "manager",
        status: "active",
      })
      .returning({ id: propertyMembers.id });
    memberId = inserted.id;
  }

  // Fetch property name for notification
  const [prop] = await db
    .select({ name: properties.name })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  // Send notification to manager
  try {
    await createNotification({
      userId: targetUser.id,
      title: "Phân quyền quản lý nhà trọ",
      message: `Bạn đã được phân quyền quản lý cơ sở: ${prop?.name || "Nhà trọ"}.`,
      type: "system",
      link: "/properties",
    });
  } catch {
    // Non-blocking
  }

  return {
    id: memberId!,
    propertyId,
    userId: targetUser.id,
    email: targetUser.email,
    fullName: targetUser.fullName,
    phone: targetUser.phone,
    role: "manager",
    status: "active",
    createdAt: new Date(),
  };
}

/**
 * Remove a manager from a property. Only owner can remove.
 */
export async function removePropertyMember(
  userId: string,
  role: string,
  propertyId: string,
  memberId: string,
): Promise<void> {
  await assertOwner(userId, role, propertyId);
  const db = getDatabase();

  await db
    .update(propertyMembers)
    .set({ status: "revoked" })
    .where(
      and(
        eq(propertyMembers.id, memberId),
        eq(propertyMembers.propertyId, propertyId),
      ),
    );
}

