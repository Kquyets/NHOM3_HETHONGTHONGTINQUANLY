import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../lib/database/client";
import { properties, propertyMembers } from "../../lib/database/schema";
import { AppError } from "../../errors/app-error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyRow = {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatePropertyInput = {
  name: string;
  address?: string | null;
};

export type UpdatePropertyInput = {
  name?: string;
  address?: string | null;
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

/**
 * List properties accessible by the user.
 * Owners see their own properties; managers see properties they're assigned to.
 */
export async function listProperties(userId: string, role: string): Promise<PropertyRow[]> {
  const db = getDatabase();

  if (role === "owner") {
    return db
      .select({
        id: properties.id,
        ownerId: properties.ownerId,
        name: properties.name,
        address: properties.address,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .where(eq(properties.ownerId, userId))
      .orderBy(properties.createdAt);
  }

  if (role === "manager") {
    // Join to get assigned properties
    return db
      .select({
        id: properties.id,
        ownerId: properties.ownerId,
        name: properties.name,
        address: properties.address,
        createdAt: properties.createdAt,
        updatedAt: properties.updatedAt,
      })
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
    .select({
      id: properties.id,
      ownerId: properties.ownerId,
      name: properties.name,
      address: properties.address,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
    })
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
    })
    .returning({
      id: properties.id,
      ownerId: properties.ownerId,
      name: properties.name,
      address: properties.address,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
    });

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

  const db = getDatabase();
  const [row] = await db
    .update(properties)
    .set(updates)
    .where(eq(properties.id, propertyId))
    .returning({
      id: properties.id,
      ownerId: properties.ownerId,
      name: properties.name,
      address: properties.address,
      createdAt: properties.createdAt,
      updatedAt: properties.updatedAt,
    });

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
