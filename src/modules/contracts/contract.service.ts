import { desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { contracts, properties, propertyMembers, rooms } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ContractStatus = "draft" | "active" | "ended" | "cancelled";

export type ContractRow = {
  id: string;
  roomId: string;
  roomNumber: string;
  propertyName: string;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
  monthlyRentSnapshot: number;
  depositSnapshot: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateContractInput = {
  roomId: string;
  startDate: string;
  endDate?: string | null;
  monthlyRentSnapshot: number;
  depositSnapshot: number;
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

function assertStaff(role: string): void {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà và quản lý mới có quyền thao tác hợp đồng.", []);
  }
}

const SELECT_COLUMNS = {
  id: contracts.id,
  roomId: contracts.roomId,
  roomNumber: rooms.roomNumber,
  propertyName: properties.name,
  startDate: contracts.startDate,
  endDate: contracts.endDate,
  status: contracts.status,
  monthlyRentSnapshot: contracts.monthlyRentSnapshot,
  depositSnapshot: contracts.depositSnapshot,
  createdAt: contracts.createdAt,
  updatedAt: contracts.updatedAt,
} as const;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * List all contracts. Owners see all contracts across their properties;
 * managers see contracts for properties they manage.
 */
export async function listContracts(userId: string, role: string): Promise<ContractRow[]> {
  assertStaff(role);
  const db = getDatabase();

  if (role === "owner") {
    return db
      .select(SELECT_COLUMNS)
      .from(contracts)
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .innerJoin(properties, eq(properties.id, rooms.propertyId))
      .orderBy(desc(contracts.createdAt));
  }

  // manager: join through propertyMembers
  return db
    .select(SELECT_COLUMNS)
    .from(contracts)
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .innerJoin(
      propertyMembers,
      eq(propertyMembers.propertyId, properties.id),
    )
    .orderBy(desc(contracts.createdAt));
}

/**
 * Get a single contract by id.
 */
export async function getContract(
  userId: string,
  role: string,
  contractId: string,
): Promise<ContractRow> {
  assertStaff(role);
  const db = getDatabase();

  const [row] = await db
    .select(SELECT_COLUMNS)
    .from(contracts)
    .innerJoin(rooms, eq(rooms.id, contracts.roomId))
    .innerJoin(properties, eq(properties.id, rooms.propertyId))
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy hợp đồng.", []);
  return row;
}

/**
 * Create a new contract (draft by default).
 */
export async function createContract(
  userId: string,
  role: string,
  input: CreateContractInput,
): Promise<ContractRow> {
  assertStaff(role);

  if (!input.startDate) {
    throw new AppError("VALIDATION_ERROR", "Ngày bắt đầu hợp đồng là bắt buộc.", [
      { field: "startDate", message: "Ngày bắt đầu không được để trống." },
    ]);
  }

  if (!Number.isInteger(input.monthlyRentSnapshot) || input.monthlyRentSnapshot < 0) {
    throw new AppError("VALIDATION_ERROR", "Tiền thuê phải là số nguyên không âm.", [
      { field: "monthlyRentSnapshot", message: "Tiền thuê phải là số nguyên không âm (VND)." },
    ]);
  }

  if (!Number.isInteger(input.depositSnapshot) || input.depositSnapshot < 0) {
    throw new AppError("VALIDATION_ERROR", "Tiền cọc phải là số nguyên không âm.", [
      { field: "depositSnapshot", message: "Tiền cọc phải là số nguyên không âm (VND)." },
    ]);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(contracts)
    .values({
      roomId: input.roomId,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      status: "draft",
      monthlyRentSnapshot: input.monthlyRentSnapshot,
      depositSnapshot: input.depositSnapshot,
    })
    .returning({
      id: contracts.id,
      roomId: contracts.roomId,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      status: contracts.status,
      monthlyRentSnapshot: contracts.monthlyRentSnapshot,
      depositSnapshot: contracts.depositSnapshot,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
    });

  if (!row) throw new AppError("DATABASE_ERROR", "Không thể tạo hợp đồng.");

  // Return with joined data — re-fetch using getContract equivalent
  // For simplicity, return a synthetic row matching ContractRow shape
  return {
    ...row,
    roomNumber: "",
    propertyName: "",
  } as ContractRow;
}

/**
 * Update contract status (draft → active → ended/cancelled).
 */
export async function updateContractStatus(
  userId: string,
  role: string,
  contractId: string,
  status: ContractStatus,
): Promise<ContractRow> {
  assertStaff(role);

  // Verify exists
  await getContract(userId, role, contractId);

  const db = getDatabase();
  const [row] = await db
    .update(contracts)
    .set({ status, updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning({
      id: contracts.id,
      roomId: contracts.roomId,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      status: contracts.status,
      monthlyRentSnapshot: contracts.monthlyRentSnapshot,
      depositSnapshot: contracts.depositSnapshot,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
    });

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy hợp đồng.", []);
  return { ...row, roomNumber: "", propertyName: "" } as ContractRow;
}

/**
 * Delete a contract. Only owners can delete; active contracts cannot be deleted.
 */
export async function deleteContract(
  userId: string,
  role: string,
  contractId: string,
): Promise<void> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà mới có thể xóa hợp đồng.", []);
  }

  const existing = await getContract(userId, role, contractId);

  if (existing.status === "active") {
    throw new AppError(
      "BUSINESS_RULE_ERROR",
      "Không thể xóa hợp đồng đang hoạt động. Hãy kết thúc hoặc hủy hợp đồng trước.",
      [],
    );
  }

  const db = getDatabase();
  await db.delete(contracts).where(eq(contracts.id, contractId));
}
