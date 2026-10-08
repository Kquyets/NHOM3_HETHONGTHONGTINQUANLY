import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { meterReadings, properties, propertyMembers, rooms, utilityRates } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UtilityType = "electricity" | "water";

export type MeterReadingRow = {
  id: string;
  roomId: string;
  roomNumber: string;
  propertyId: string;
  propertyName: string;
  utilityType: UtilityType;
  billingPeriod: string;
  previousValue: string;
  currentValue: string;
  utilityRateId: string;
  unitPriceSnapshot: number;
  createdAt: Date;
};

export type CreateMeterReadingInput = {
  roomId: string;
  propertyId: string;
  utilityType: UtilityType;
  billingPeriod: string;
  previousValue: number;
  currentValue: number;
  utilityRateId: string;
  unitPriceSnapshot: number;
};

export type UtilityRateRow = {
  id: string;
  propertyId: string;
  utilityType: UtilityType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: Date;
};

export type CreateUtilityRateInput = {
  propertyId: string;
  utilityType: UtilityType;
  unitPrice: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

function assertStaff(role: string): void {
  if (role !== "owner" && role !== "manager") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà và quản lý mới có quyền truy cập.", []);
  }
}

// ---------------------------------------------------------------------------
// Service: Meter Readings
// ---------------------------------------------------------------------------

export async function listMeterReadings(
  userId: string,
  role: string,
  propertyId?: string,
): Promise<MeterReadingRow[]> {
  assertStaff(role);
  const db = getDatabase();

  const cols = {
    id: meterReadings.id,
    roomId: meterReadings.roomId,
    roomNumber: rooms.roomNumber,
    propertyId: meterReadings.propertyId,
    propertyName: properties.name,
    utilityType: meterReadings.utilityType,
    billingPeriod: meterReadings.billingPeriod,
    previousValue: meterReadings.previousValue,
    currentValue: meterReadings.currentValue,
    utilityRateId: meterReadings.utilityRateId,
    unitPriceSnapshot: meterReadings.unitPriceSnapshot,
    createdAt: meterReadings.createdAt,
  };

  if (role === "owner") {
    return db
      .select(cols)
      .from(meterReadings)
      .innerJoin(rooms, eq(rooms.id, meterReadings.roomId))
      .innerJoin(properties, eq(properties.id, meterReadings.propertyId))
      .orderBy(desc(meterReadings.billingPeriod));
  }

  return db
    .select(cols)
    .from(meterReadings)
    .innerJoin(rooms, eq(rooms.id, meterReadings.roomId))
    .innerJoin(properties, eq(properties.id, meterReadings.propertyId))
    .innerJoin(
      propertyMembers,
      and(
        eq(propertyMembers.propertyId, properties.id),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "active"),
      ),
    )
    .orderBy(desc(meterReadings.billingPeriod));
}

export async function getMeterReading(
  userId: string,
  role: string,
  readingId: string,
): Promise<MeterReadingRow> {
  assertStaff(role);
  const db = getDatabase();

  const [row] = await db
    .select({
      id: meterReadings.id,
      roomId: meterReadings.roomId,
      roomNumber: rooms.roomNumber,
      propertyId: meterReadings.propertyId,
      propertyName: properties.name,
      utilityType: meterReadings.utilityType,
      billingPeriod: meterReadings.billingPeriod,
      previousValue: meterReadings.previousValue,
      currentValue: meterReadings.currentValue,
      utilityRateId: meterReadings.utilityRateId,
      unitPriceSnapshot: meterReadings.unitPriceSnapshot,
      createdAt: meterReadings.createdAt,
    })
    .from(meterReadings)
    .innerJoin(rooms, eq(rooms.id, meterReadings.roomId))
    .innerJoin(properties, eq(properties.id, meterReadings.propertyId))
    .where(eq(meterReadings.id, readingId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy chỉ số điện nước.", []);
  return row;
}

export async function createMeterReading(
  userId: string,
  role: string,
  input: CreateMeterReadingInput,
): Promise<MeterReadingRow> {
  assertStaff(role);

  if (input.previousValue < 0) {
    throw new AppError("VALIDATION_ERROR", "Chỉ số cũ không được âm.", [
      { field: "previousValue", message: "Chỉ số cũ phải lớn hơn hoặc bằng 0." },
    ]);
  }

  if (input.currentValue < input.previousValue) {
    throw new AppError("VALIDATION_ERROR", "Chỉ số mới không được nhỏ hơn chỉ số cũ.", [
      { field: "currentValue", message: "Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ." },
    ]);
  }

  // Validate billingPeriod format: must be first of month (YYYY-MM-01)
  const parts = input.billingPeriod.split("-");
  if (parts.length !== 3 || parts[2] !== "01") {
    throw new AppError("VALIDATION_ERROR", "Kỳ tính tiền phải là ngày đầu tiên của tháng (YYYY-MM-01).", [
      { field: "billingPeriod", message: "Kỳ hóa đơn phải bắt đầu từ ngày 01 của tháng." },
    ]);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(meterReadings)
    .values({
      roomId: input.roomId,
      propertyId: input.propertyId,
      utilityType: input.utilityType,
      billingPeriod: input.billingPeriod,
      previousValue: String(input.previousValue),
      currentValue: String(input.currentValue),
      utilityRateId: input.utilityRateId,
      unitPriceSnapshot: input.unitPriceSnapshot,
    })
    .returning({
      id: meterReadings.id,
      roomId: meterReadings.roomId,
      propertyId: meterReadings.propertyId,
      utilityType: meterReadings.utilityType,
      billingPeriod: meterReadings.billingPeriod,
      previousValue: meterReadings.previousValue,
      currentValue: meterReadings.currentValue,
      utilityRateId: meterReadings.utilityRateId,
      unitPriceSnapshot: meterReadings.unitPriceSnapshot,
      createdAt: meterReadings.createdAt,
    });

  if (!row) throw new AppError("DATABASE_ERROR", "Không thể lưu chỉ số điện nước.");
  return { ...row, roomNumber: "", propertyName: "" } as MeterReadingRow;
}

export async function deleteMeterReading(
  userId: string,
  role: string,
  readingId: string,
): Promise<void> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Chỉ chủ nhà mới có thể xóa bản ghi chỉ số.", []);
  }

  await getMeterReading(userId, role, readingId);

  const db = getDatabase();
  await db.delete(meterReadings).where(eq(meterReadings.id, readingId));
}

// ---------------------------------------------------------------------------
// Service: Utility Rates
// ---------------------------------------------------------------------------

export async function listUtilityRates(
  userId: string,
  role: string,
  propertyId?: string,
): Promise<UtilityRateRow[]> {
  assertStaff(role);
  const db = getDatabase();

  return db
    .select({
      id: utilityRates.id,
      propertyId: utilityRates.propertyId,
      utilityType: utilityRates.utilityType,
      unitPrice: utilityRates.unitPrice,
      effectiveFrom: utilityRates.effectiveFrom,
      effectiveTo: utilityRates.effectiveTo,
      createdAt: utilityRates.createdAt,
    })
    .from(utilityRates)
    .orderBy(desc(utilityRates.effectiveFrom));
}

export async function createUtilityRate(
  userId: string,
  role: string,
  input: CreateUtilityRateInput,
): Promise<UtilityRateRow> {
  assertStaff(role);

  if (!Number.isInteger(input.unitPrice) || input.unitPrice < 0) {
    throw new AppError("VALIDATION_ERROR", "Đơn giá phải là số nguyên không âm.", [
      { field: "unitPrice", message: "Đơn giá không được âm." },
    ]);
  }

  const db = getDatabase();
  const [row] = await db
    .insert(utilityRates)
    .values({
      propertyId: input.propertyId,
      utilityType: input.utilityType,
      unitPrice: input.unitPrice,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
    })
    .returning({
      id: utilityRates.id,
      propertyId: utilityRates.propertyId,
      utilityType: utilityRates.utilityType,
      unitPrice: utilityRates.unitPrice,
      effectiveFrom: utilityRates.effectiveFrom,
      effectiveTo: utilityRates.effectiveTo,
      createdAt: utilityRates.createdAt,
    });

  if (!row) throw new AppError("DATABASE_ERROR", "Không thể tạo biểu giá.");
  return row;
}
