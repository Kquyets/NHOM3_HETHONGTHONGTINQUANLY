import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import { AppError } from "../../errors/app-error";
import { getDatabase } from "../../lib/database/client";
import { contracts, contractTenants, properties, propertyMembers, rooms, tenants } from "../../lib/database/schema";
import type { AuthenticatedUser } from "../../lib/auth/session";
import { requirePropertyAccess, requirePropertyManager } from "./access";
import { roomStatusForClient } from "./room-status";
import type { propertyInputSchema, propertyPatchSchema, roomInputSchema, roomPatchSchema } from "./validation";

type PropertyInput = typeof propertyInputSchema._output;
type PropertyPatch = typeof propertyPatchSchema._output;
type RoomInput = typeof roomInputSchema._output;
type RoomPatch = typeof roomPatchSchema._output;

const today = () => new Date().toISOString().slice(0, 10);

export async function listProperties(user: AuthenticatedUser) {
  const database = getDatabase();
  if (user.role === "owner") {
    return database.select({ id: properties.id, name: properties.name, address: properties.address })
      .from(properties).where(eq(properties.ownerId, user.userId));
  }
  if (user.role === "manager") {
    return database.selectDistinct({ id: properties.id, name: properties.name, address: properties.address })
      .from(properties)
      .innerJoin(propertyMembers, eq(propertyMembers.propertyId, properties.id))
      .where(and(eq(propertyMembers.userId, user.userId), eq(propertyMembers.status, "active")));
  }
  return database.selectDistinct({ id: properties.id, name: properties.name, address: properties.address })
    .from(properties)
    .innerJoin(rooms, eq(rooms.propertyId, properties.id))
    .innerJoin(contracts, eq(contracts.roomId, rooms.id))
    .innerJoin(contractTenants, eq(contractTenants.contractId, contracts.id))
    .innerJoin(tenants, eq(tenants.id, contractTenants.tenantId))
    .where(eq(tenants.userId, user.userId));
}

export async function createProperty(user: AuthenticatedUser, input: PropertyInput) {
  if (user.role !== "owner") throw new AppError("FORBIDDEN", "Only an owner can create a property.");
  const [property] = await getDatabase().insert(properties).values({
    ownerId: user.userId,
    name: input.name,
    address: input.address ?? null,
  }).returning({ id: properties.id, name: properties.name, address: properties.address });
  return property;
}

export async function getProperty(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  const [property] = await getDatabase().select({
    id: properties.id,
    name: properties.name,
    address: properties.address,
  }).from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!property) throw new AppError("NOT_FOUND", "Property not found.");
  return property;
}

export async function updateProperty(user: AuthenticatedUser, propertyId: string, input: PropertyPatch) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, propertyId);
  const [property] = await getDatabase().update(properties).set({ ...input, updatedAt: new Date() })
    .where(eq(properties.id, propertyId))
    .returning({ id: properties.id, name: properties.name, address: properties.address });
  if (!property) throw new AppError("NOT_FOUND", "Property not found.");
  return property;
}

export async function deleteProperty(user: AuthenticatedUser, propertyId: string): Promise<void> {
  if (user.role !== "owner") throw new AppError("FORBIDDEN", "Only an owner can delete a property.");
  await requirePropertyAccess(user, propertyId);
  try {
    const deleted = await getDatabase().delete(properties).where(eq(properties.id, propertyId)).returning({ id: properties.id });
    if (!deleted.length) throw new AppError("NOT_FOUND", "Property not found.");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("CONFLICT", "Property has linked records and cannot be deleted.");
  }
}

async function activeRoomIds(roomIds: string[]): Promise<Set<string>> {
  if (!roomIds.length) return new Set();
  const active = await getDatabase().select({ roomId: contracts.roomId }).from(contracts).where(and(
    inArray(contracts.roomId, roomIds),
    eq(contracts.status, "active"),
    lte(contracts.startDate, today()),
    or(isNull(contracts.endDate), gte(contracts.endDate, today())),
  ));
  return new Set(active.map(({ roomId }) => roomId));
}

function roomDto(room: typeof rooms.$inferSelect, occupied: boolean) {
  return {
    id: room.id,
    propertyId: room.propertyId,
    roomNumber: room.roomNumber,
    monthlyRent: room.monthlyRent,
    areaM2: room.areaM2 === null ? null : Number(room.areaM2),
    status: roomStatusForClient(room.status, occupied),
  };
}

export async function listRooms(user: AuthenticatedUser, propertyId: string) {
  await requirePropertyAccess(user, propertyId);
  const found = await getDatabase().select().from(rooms).where(eq(rooms.propertyId, propertyId));
  const activeIds = await activeRoomIds(found.map(({ id }) => id));
  return found.map((room) => roomDto(room, activeIds.has(room.id)));
}

export async function createRoom(user: AuthenticatedUser, propertyId: string, input: RoomInput) {
  requirePropertyManager(user);
  await requirePropertyAccess(user, propertyId);
  const [room] = await getDatabase().insert(rooms).values({
    propertyId,
    roomNumber: input.roomNumber,
    monthlyRent: input.monthlyRent,
    areaM2: input.areaM2?.toString() ?? null,
    status: input.status ?? "ready",
  }).returning();
  return roomDto(room, false);
}

async function findRoom(roomId: string) {
  const [room] = await getDatabase().select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) throw new AppError("NOT_FOUND", "Room not found.");
  return room;
}

export async function getRoom(user: AuthenticatedUser, roomId: string) {
  const room = await findRoom(roomId);
  await requirePropertyAccess(user, room.propertyId);
  return roomDto(room, (await activeRoomIds([room.id])).has(room.id));
}

export async function updateRoom(user: AuthenticatedUser, roomId: string, input: RoomPatch) {
  requirePropertyManager(user);
  const current = await findRoom(roomId);
  await requirePropertyAccess(user, current.propertyId);
  const [room] = await getDatabase().update(rooms).set({ ...input, areaM2: input.areaM2?.toString(), updatedAt: new Date() })
    .where(eq(rooms.id, roomId)).returning();
  if (!room) throw new AppError("NOT_FOUND", "Room not found.");
  return roomDto(room, (await activeRoomIds([room.id])).has(room.id));
}

export async function deleteRoom(user: AuthenticatedUser, roomId: string): Promise<void> {
  requirePropertyManager(user);
  const room = await findRoom(roomId);
  await requirePropertyAccess(user, room.propertyId);
  try {
    await getDatabase().delete(rooms).where(eq(rooms.id, roomId));
  } catch {
    throw new AppError("CONFLICT", "Room has linked records and cannot be deleted.");
  }
}
