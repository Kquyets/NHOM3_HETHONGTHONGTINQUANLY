import { and, eq } from "drizzle-orm";

import { AppError } from "../../errors/app-error";
import { getDatabase } from "../../lib/database/client";
import { contracts, contractTenants, properties, propertyMembers, rooms, tenants } from "../../lib/database/schema";
import type { AuthenticatedUser } from "../../lib/auth/session";

export async function requirePropertyAccess(user: AuthenticatedUser, propertyId: string): Promise<void> {
  const database = getDatabase();
  let accessible = false;
  if (user.role === "owner") {
    const [property] = await database.select({ id: properties.id }).from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.ownerId, user.userId))).limit(1);
    accessible = Boolean(property);
  } else if (user.role === "manager") {
    const [membership] = await database.select({ id: propertyMembers.id })
      .from(propertyMembers)
      .innerJoin(properties, eq(propertyMembers.propertyId, properties.id))
      .where(and(
        eq(propertyMembers.propertyId, propertyId),
        eq(propertyMembers.userId, user.userId),
        eq(propertyMembers.status, "active"),
      ))
      .limit(1);
    accessible = Boolean(membership);
  } else {
    const [tenant] = await database.select({ id: tenants.id })
      .from(tenants)
      .innerJoin(contractTenants, eq(contractTenants.tenantId, tenants.id))
      .innerJoin(contracts, eq(contracts.id, contractTenants.contractId))
      .innerJoin(rooms, eq(rooms.id, contracts.roomId))
      .where(and(eq(tenants.userId, user.userId), eq(rooms.propertyId, propertyId)))
      .limit(1);
    accessible = Boolean(tenant);
  }
  if (!accessible) throw new AppError("NOT_FOUND", "Property not found.");
}

export function requirePropertyManager(user: AuthenticatedUser): void {
  if (user.role === "tenant") throw new AppError("FORBIDDEN", "You cannot manage this property.");
}
