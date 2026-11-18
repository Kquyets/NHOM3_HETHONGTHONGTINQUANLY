import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { contracts, contractTenants, properties, propertyMembers, rooms, tenants, users } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TenantRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  hometown: string | null;
  vehicleNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTenantInput = {
  fullName: string;
  phone?: string | null;
  birthDate?: string | null;
  userId?: string | null;
  hometown?: string | null;
  vehicleNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
};

export type UpdateTenantInput = {
  fullName?: string;
  phone?: string | null;
  birthDate?: string | null;
  hometown?: string | null;
  vehicleNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

function assertStaff(role: string): void {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà và quản lý mới có quyền thao tác.", []);
  }
}

const SELECT_COLUMNS = {
  id: tenants.id,
  userId: tenants.userId,
  fullName: tenants.fullName,
  phone: tenants.phone,
  birthDate: tenants.birthDate,
  hometown: tenants.hometown,
  vehicleNumber: tenants.vehicleNumber,
  emergencyContactName: tenants.emergencyContactName,
  emergencyContactPhone: tenants.emergencyContactPhone,
  idCardFrontUrl: tenants.idCardFrontUrl,
  idCardBackUrl: tenants.idCardBackUrl,
  createdAt: tenants.createdAt,
  updatedAt: tenants.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * List all tenants. Accessible by owner and manager only.
 */
export async function listTenants(userId: string, role: string): Promise<TenantRow[]> {
  assertStaff(role);
  const db = getDatabase();

  if (role === "owner") {
    return db
      .selectDistinct(SELECT_COLUMNS)
      .from(tenants)
      .leftJoin(contractTenants, eq(contractTenants.tenantId, tenants.id))
      .leftJoin(contracts, eq(contracts.id, contractTenants.contractId))
      .leftJoin(rooms, eq(rooms.id, contracts.roomId))
      .leftJoin(properties, eq(properties.id, rooms.propertyId))
      .where(or(eq(properties.ownerId, userId), isNull(contractTenants.contractId)))
      .orderBy(asc(tenants.fullName));
  }

  return db
    .selectDistinct(SELECT_COLUMNS)
    .from(tenants)
    .leftJoin(contractTenants, eq(contractTenants.tenantId, tenants.id))
    .leftJoin(contracts, eq(contracts.id, contractTenants.contractId))
    .leftJoin(rooms, eq(rooms.id, contracts.roomId))
    .leftJoin(properties, eq(properties.id, rooms.propertyId))
    .leftJoin(
      propertyMembers,
      and(
        eq(propertyMembers.propertyId, properties.id),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "active"),
      ),
    )
    .where(or(eq(propertyMembers.userId, userId), isNull(contractTenants.contractId)))
    .orderBy(asc(tenants.fullName));
}

/**
 * Get a single tenant by id. Accessible by owner and manager only.
 */
export async function getTenant(
  userId: string,
  role: string,
  tenantId: string,
): Promise<TenantRow> {
  assertStaff(role);
  const db = getDatabase();
  const [row] = await db
    .select(SELECT_COLUMNS)
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy khách thuê.", []);
  return row;
}

/**
 * Create a new tenant profile. Accessible by owner and manager.
 */
export async function createTenant(
  userId: string,
  role: string,
  input: CreateTenantInput,
): Promise<TenantRow> {
  assertStaff(role);

  const fullName = input.fullName?.trim();
  if (!fullName) {
    throw new AppError("VALIDATION_ERROR", "Họ tên khách thuê không được để trống.", [
      { field: "fullName", message: "Họ tên không được để trống." },
    ]);
  }

  const db = getDatabase();

  let resolvedUserId = input.userId ?? null;
  if (!resolvedUserId && input.phone) {
    const rawPhone = input.phone.trim();
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, rawPhone))
      .limit(1);
    if (existingUser) {
      resolvedUserId = existingUser.id;
    }
  }

  const [row] = await db
    .insert(tenants)
    .values({
      fullName,
      phone: input.phone?.trim() ?? null,
      birthDate: input.birthDate ?? null,
      userId: resolvedUserId,
      hometown: input.hometown?.trim() ?? null,
      vehicleNumber: input.vehicleNumber?.trim() ?? null,
      emergencyContactName: input.emergencyContactName?.trim() ?? null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() ?? null,
      idCardFrontUrl: input.idCardFrontUrl?.trim() ?? null,
      idCardBackUrl: input.idCardBackUrl?.trim() ?? null,
      linkedUserRole: "tenant",
    })
    .returning(SELECT_COLUMNS);

  if (!row) throw new AppError("DATABASE_ERROR", "Không thể tạo khách thuê.");
  return row;
}

/**
 * Update a tenant profile. Accessible by owner and manager.
 */
export async function updateTenant(
  userId: string,
  role: string,
  tenantId: string,
  input: UpdateTenantInput,
): Promise<TenantRow> {
  assertStaff(role);

  // Verify tenant exists first
  await getTenant(userId, role, tenantId);

  const updates: Partial<typeof tenants.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      throw new AppError("VALIDATION_ERROR", "Họ tên không được để trống.", [
        { field: "fullName", message: "Họ tên không được để trống." },
      ]);
    }
    updates.fullName = fullName;
  }

  if (input.phone !== undefined) {
    updates.phone = input.phone?.trim() ?? null;
  }

  if (input.birthDate !== undefined) {
    updates.birthDate = input.birthDate;
  }

  if (input.hometown !== undefined) {
    updates.hometown = input.hometown?.trim() ?? null;
  }

  if (input.vehicleNumber !== undefined) {
    updates.vehicleNumber = input.vehicleNumber?.trim() ?? null;
  }

  if (input.emergencyContactName !== undefined) {
    updates.emergencyContactName = input.emergencyContactName?.trim() ?? null;
  }

  if (input.emergencyContactPhone !== undefined) {
    updates.emergencyContactPhone = input.emergencyContactPhone?.trim() ?? null;
  }

  if (input.idCardFrontUrl !== undefined) {
    updates.idCardFrontUrl = input.idCardFrontUrl?.trim() ?? null;
  }

  if (input.idCardBackUrl !== undefined) {
    updates.idCardBackUrl = input.idCardBackUrl?.trim() ?? null;
  }

  const db = getDatabase();
  const [row] = await db
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, tenantId))
    .returning(SELECT_COLUMNS);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy khách thuê.", []);
  return row;
}

/**
 * Delete a tenant profile. Accessible by owner and manager.
 */
export async function deleteTenant(
  userId: string,
  role: string,
  tenantId: string,
): Promise<void> {
  assertStaff(role);

  // Verify exists first
  await getTenant(userId, role, tenantId);

  const db = getDatabase();
  await db.delete(tenants).where(eq(tenants.id, tenantId));
}
