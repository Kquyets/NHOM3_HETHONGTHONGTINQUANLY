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

export type BatchReadingItem = {
  roomId: string;
  utilityType: UtilityType;
  previousValue: number;
  currentValue: number;
  unitPriceSnapshot?: number;
};

export type BatchRecordInput = {
  propertyId: string;
  billingPeriod: string;
  items: BatchReadingItem[];
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

async function assertPropertyAccess(
  userId: string,
  role: string,
  propertyId: string,
): Promise<void> {
  assertStaff(role);
  const db = getDatabase();

  if (role === "owner") {
    const [prop] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.ownerId, userId)))
      .limit(1);
    if (!prop) {
      throw new AppError("FORBIDDEN", "Bạn không có quyền thao tác với tòa nhà này.", []);
    }
    return;
  }

  const [member] = await db
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

  if (!member) {
    throw new AppError("FORBIDDEN", "Bạn không có quyền quản lý tòa nhà này.", []);
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
    const conditions = [eq(properties.ownerId, userId)];
    if (propertyId) {
      conditions.push(eq(meterReadings.propertyId, propertyId));
    }
    return db
      .select(cols)
      .from(meterReadings)
      .innerJoin(rooms, eq(rooms.id, meterReadings.roomId))
      .innerJoin(properties, eq(properties.id, meterReadings.propertyId))
      .where(and(...conditions))
      .orderBy(desc(meterReadings.billingPeriod));
  }

  const query = db
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
    );

  if (propertyId) {
    return query
      .where(eq(meterReadings.propertyId, propertyId))
      .orderBy(desc(meterReadings.billingPeriod));
  }
  return query.orderBy(desc(meterReadings.billingPeriod));
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
      propertyOwnerId: properties.ownerId,
      memberUserId: propertyMembers.userId,
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
    .leftJoin(
      propertyMembers,
      and(
        eq(propertyMembers.propertyId, properties.id),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "active"),
      ),
    )
    .where(eq(meterReadings.id, readingId))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Không tìm thấy chỉ số điện nước.", []);

  const hasAccess = role === "owner" ? row.propertyOwnerId === userId : row.memberUserId === userId;
  if (!hasAccess) {
    throw new AppError("FORBIDDEN", "Bạn không có quyền truy cập chỉ số điện nước này.", []);
  }

  return {
    id: row.id,
    roomId: row.roomId,
    roomNumber: row.roomNumber,
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    utilityType: row.utilityType,
    billingPeriod: row.billingPeriod,
    previousValue: row.previousValue,
    currentValue: row.currentValue,
    utilityRateId: row.utilityRateId,
    unitPriceSnapshot: row.unitPriceSnapshot,
    createdAt: row.createdAt,
  };
}

export async function createMeterReading(
  userId: string,
  role: string,
  input: CreateMeterReadingInput,
): Promise<MeterReadingRow> {
  assertStaff(role);

  if (!Number.isFinite(input.previousValue) || input.previousValue < 0) {
    throw new AppError("VALIDATION_ERROR", "Chỉ số cũ không được âm.", [
      { field: "previousValue", message: "Chỉ số cũ phải lớn hơn hoặc bằng 0." },
    ]);
  }

  if (!Number.isFinite(input.currentValue) || input.currentValue < input.previousValue) {
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

  await assertPropertyAccess(userId, role, input.propertyId);

  const db = getDatabase();
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.id, input.roomId), eq(rooms.propertyId, input.propertyId)))
    .limit(1);

  if (!room) {
    throw new AppError("NOT_FOUND", "Phòng không tồn tại trong tòa nhà đã chọn.", []);
  }

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

export async function batchRecordMeterReadings(
  userId: string,
  role: string,
  input: BatchRecordInput,
): Promise<{ count: number }> {
  assertStaff(role);
  if (!input.items || input.items.length === 0) return { count: 0 };

  const parts = input.billingPeriod.split("-");
  if (parts.length !== 3 || parts[2] !== "01") {
    throw new AppError("VALIDATION_ERROR", "Kỳ tính tiền phải là ngày đầu tiên của tháng (YYYY-MM-01).", [
      { field: "billingPeriod", message: "Kỳ hóa đơn phải bắt đầu từ ngày 01 của tháng." },
    ]);
  }

  const db = getDatabase();

  const rates = await listUtilityRates(userId, role, input.propertyId);
  let elecRate = rates.find((r) => r.utilityType === "electricity");
  let waterRate = rates.find((r) => r.utilityType === "water");

  let recordedCount = 0;
  for (const item of input.items) {
    if (item.previousValue < 0 || item.currentValue < item.previousValue) continue;
    let rate = item.utilityType === "electricity" ? elecRate : waterRate;

    if (!rate) {
      const defaultPrice = item.unitPriceSnapshot || (item.utilityType === "electricity" ? 3800 : 25000);
      const [newRate] = await db
        .insert(utilityRates)
        .values({
          propertyId: input.propertyId,
          utilityType: item.utilityType,
          unitPrice: defaultPrice,
          effectiveFrom: `${input.billingPeriod.slice(0, 7)}-01`,
        })
        .returning();
      if (newRate) {
        rate = newRate as unknown as typeof rate;
        if (item.utilityType === "electricity") elecRate = rate;
        else waterRate = rate;
      }
    }

    if (!rate?.id) {
      throw new AppError("BUSINESS_RULE_ERROR", "Chưa có biểu giá hợp lệ để lưu chỉ số cho tòa nhà này.", []);
    }

    const price = item.unitPriceSnapshot || rate.unitPrice || (item.utilityType === "electricity" ? 3800 : 25000);

    await db
      .insert(meterReadings)
      .values({
        roomId: item.roomId,
        propertyId: input.propertyId,
        utilityType: item.utilityType,
        billingPeriod: input.billingPeriod,
        previousValue: String(item.previousValue),
        currentValue: String(item.currentValue),
        utilityRateId: rate.id,
        unitPriceSnapshot: price,
      });
    recordedCount++;
  }

  return { count: recordedCount };
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

  if (propertyId) {
    await assertPropertyAccess(userId, role, propertyId);
  }

  const rateCols = {
    id: utilityRates.id,
    propertyId: utilityRates.propertyId,
    utilityType: utilityRates.utilityType,
    unitPrice: utilityRates.unitPrice,
    effectiveFrom: utilityRates.effectiveFrom,
    effectiveTo: utilityRates.effectiveTo,
    createdAt: utilityRates.createdAt,
  };

  if (role === "owner") {
    const conditions = [eq(properties.ownerId, userId)];
    if (propertyId) {
      conditions.push(eq(utilityRates.propertyId, propertyId));
    }
    return db
      .select(rateCols)
      .from(utilityRates)
      .innerJoin(properties, eq(properties.id, utilityRates.propertyId))
      .where(and(...conditions))
      .orderBy(desc(utilityRates.effectiveFrom));
  }

  const mgrQuery = db
    .select(rateCols)
    .from(utilityRates)
    .innerJoin(properties, eq(properties.id, utilityRates.propertyId))
    .innerJoin(
      propertyMembers,
      and(
        eq(propertyMembers.propertyId, properties.id),
        eq(propertyMembers.userId, userId),
        eq(propertyMembers.status, "active"),
      ),
    );

  if (propertyId) {
    return mgrQuery
      .where(eq(utilityRates.propertyId, propertyId))
      .orderBy(desc(utilityRates.effectiveFrom));
  }

  return mgrQuery.orderBy(desc(utilityRates.effectiveFrom));
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

  await assertPropertyAccess(userId, role, input.propertyId);

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
