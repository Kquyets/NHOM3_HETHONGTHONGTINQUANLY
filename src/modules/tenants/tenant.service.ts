import { asc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { tenants } from "../../lib/database/schema";
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
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTenantInput = {
  fullName: string;
  phone?: string | null;
  birthDate?: string | null;
  userId?: string | null;
};

export type UpdateTenantInput = {
  fullName?: string;
  phone?: string | null;
  birthDate?: string | null;
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
  return db
    .select(SELECT_COLUMNS)
    .from(tenants)
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
  const [row] = await db
    .insert(tenants)
    .values({
      fullName,
      phone: input.phone?.trim() ?? null,
      birthDate: input.birthDate ?? null,
      userId: input.userId ?? null,
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
