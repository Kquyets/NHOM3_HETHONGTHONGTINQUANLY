import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { properties, propertyMembers, rooms } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoomRow = {
  id: string;
  propertyId: string;
  roomNumber: string;
  areaM2: string | null;
  monthlyRent: number;
  status: "ready" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRoomInput = {
  roomNumber: string;
  monthlyRent: number;
  areaM2?: number | null;
};

export type UpdateRoomInput = {
  roomNumber?: string;
  monthlyRent?: number;
  areaM2?: number | null;
  status?: "ready" | "maintenance";
};

// ---------------------------------------------------------------------------
// Authorization helpers
// ---------------------------------------------------------------------------

/** Verify user has active access to the property (owner or active manager) */
async function assertPropertyAccess(
  userId: string,
  role: string,
  propertyId: string,
): Promise<void> {
  const db = getDatabase();

  if (role === "owner") {
    const [row] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.ownerId, userId)))
      .limit(1);
    if (!row) throw new AppError("FORBIDDEN", "You do not have access to this property.", []);
    return;
  }

  if (role === "manager") {
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
    if (!row) throw new AppError("FORBIDDEN", "You do not have access to this property.", []);
    return;
  }

  throw new AppError("FORBIDDEN", "You do not have access to this property.", []);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * List all rooms in a property.
 */
export async function listRooms(
  userId: string,
  role: string,
  propertyId: string,
): Promise<RoomRow[]> {
  await assertPropertyAccess(userId, role, propertyId);

  const db = getDatabase();
  return db
    .select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      roomNumber: rooms.roomNumber,
      areaM2: rooms.areaM2,
      monthlyRent: rooms.monthlyRent,
      status: rooms.status,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
    })
    .from(rooms)
    .where(eq(rooms.propertyId, propertyId))
    .orderBy(rooms.roomNumber);
}

/**
 * Get a single room.
 */
export async function getRoom(
  userId: string,
  role: string,
  propertyId: string,
  roomId: string,
): Promise<RoomRow> {
  await assertPropertyAccess(userId, role, propertyId);

  const db = getDatabase();
  const [row] = await db
    .select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      roomNumber: rooms.roomNumber,
      areaM2: rooms.areaM2,
      monthlyRent: rooms.monthlyRent,
      status: rooms.status,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
    })
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId)))
    .limit(1);

  if (!row) throw new AppError("NOT_FOUND", "Room not found.", []);
  return row;
}

/**
 * Create a room. Owner and manager can create rooms.
 */
export async function createRoom(
  userId: string,
  role: string,
  propertyId: string,
  input: CreateRoomInput,
): Promise<RoomRow> {
  await assertPropertyAccess(userId, role, propertyId);

  const roomNumber = input.roomNumber?.trim();
  if (!roomNumber) {
    throw new AppError("VALIDATION_ERROR", "Room number is required.", [
      { field: "roomNumber", message: "Số phòng không được để trống." },
    ]);
  }

  if (!Number.isInteger(input.monthlyRent) || input.monthlyRent < 0) {
    throw new AppError("VALIDATION_ERROR", "Monthly rent must be a non-negative integer (VND).", [
      { field: "monthlyRent", message: "Giá thuê phải là số nguyên không âm (VND)." },
    ]);
  }

  if (input.areaM2 !== undefined && input.areaM2 !== null && input.areaM2 <= 0) {
    throw new AppError("VALIDATION_ERROR", "Area must be a positive number.", [
      { field: "areaM2", message: "Diện tích phải lớn hơn 0." },
    ]);
  }

  const db = getDatabase();

  // Check duplicate room number in same property
  const [existing] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.propertyId, propertyId), eq(rooms.roomNumber, roomNumber)))
    .limit(1);

  if (existing) {
    throw new AppError("CONFLICT", `Room number "${roomNumber}" already exists in this property.`, [
      { field: "roomNumber", message: `Số phòng "${roomNumber}" đã tồn tại trong nhà trọ này.` },
    ]);
  }

  const [row] = await db
    .insert(rooms)
    .values({
      propertyId,
      roomNumber,
      monthlyRent: input.monthlyRent,
      areaM2: input.areaM2 != null ? String(input.areaM2) : null,
    })
    .returning({
      id: rooms.id,
      propertyId: rooms.propertyId,
      roomNumber: rooms.roomNumber,
      areaM2: rooms.areaM2,
      monthlyRent: rooms.monthlyRent,
      status: rooms.status,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
    });

  if (!row) throw new AppError("DATABASE_ERROR", "Failed to create room.");
  return row;
}

/**
 * Update a room. Owner and manager can update.
 */
export async function updateRoom(
  userId: string,
  role: string,
  propertyId: string,
  roomId: string,
  input: UpdateRoomInput,
): Promise<RoomRow> {
  await assertPropertyAccess(userId, role, propertyId);

  const updates: Partial<typeof rooms.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.roomNumber !== undefined) {
    const roomNumber = input.roomNumber.trim();
    if (!roomNumber) {
      throw new AppError("VALIDATION_ERROR", "Room number cannot be empty.", [
        { field: "roomNumber", message: "Số phòng không được để trống." },
      ]);
    }

    // Check duplicate (exclude self)
    const db = getDatabase();
    const [existing] = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(and(eq(rooms.propertyId, propertyId), eq(rooms.roomNumber, roomNumber)))
      .limit(1);

    if (existing && existing.id !== roomId) {
      throw new AppError("CONFLICT", `Room number "${roomNumber}" already exists.`, [
        { field: "roomNumber", message: `Số phòng "${roomNumber}" đã tồn tại.` },
      ]);
    }
    updates.roomNumber = roomNumber;
  }

  if (input.monthlyRent !== undefined) {
    if (!Number.isInteger(input.monthlyRent) || input.monthlyRent < 0) {
      throw new AppError("VALIDATION_ERROR", "Monthly rent must be a non-negative integer.", [
        { field: "monthlyRent", message: "Giá thuê phải là số nguyên không âm." },
      ]);
    }
    updates.monthlyRent = input.monthlyRent;
  }

  if (input.areaM2 !== undefined) {
    if (input.areaM2 !== null && input.areaM2 <= 0) {
      throw new AppError("VALIDATION_ERROR", "Area must be a positive number.", [
        { field: "areaM2", message: "Diện tích phải lớn hơn 0." },
      ]);
    }
    updates.areaM2 = input.areaM2 != null ? String(input.areaM2) : null;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
  }

  const db = getDatabase();
  const [row] = await db
    .update(rooms)
    .set(updates)
    .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId)))
    .returning({
      id: rooms.id,
      propertyId: rooms.propertyId,
      roomNumber: rooms.roomNumber,
      areaM2: rooms.areaM2,
      monthlyRent: rooms.monthlyRent,
      status: rooms.status,
      createdAt: rooms.createdAt,
      updatedAt: rooms.updatedAt,
    });

  if (!row) throw new AppError("NOT_FOUND", "Room not found.", []);
  return row;
}

/**
 * Delete a room. Owner only.
 */
export async function deleteRoom(
  userId: string,
  role: string,
  propertyId: string,
  roomId: string,
): Promise<void> {
  if (role !== "owner") {
    throw new AppError("FORBIDDEN", "Only owners can delete rooms.", []);
  }
  await assertPropertyAccess(userId, role, propertyId);

  const db = getDatabase();
  await db
    .delete(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId)));
}
