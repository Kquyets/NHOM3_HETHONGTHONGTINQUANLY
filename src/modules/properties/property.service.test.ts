import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({ getDatabase: () => mockDb }));
vi.mock("../../lib/database/schema", () => ({
  properties: { id: "id", ownerId: "ownerId", ownerRole: "ownerRole", name: "name", address: "address", createdAt: "createdAt", updatedAt: "updatedAt", $inferInsert: {} },
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", status: "status" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  or: vi.fn((...args) => ({ type: "or", args })),
}));

function chain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from "./property.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const PROP_ID = "prop-123";

const mockProperty = {
  id: PROP_ID,
  ownerId: OWNER.userId,
  name: "Nhà trọ A",
  address: "123 Lê Lợi",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listProperties
// ---------------------------------------------------------------------------
describe("listProperties", () => {
  it("returns owner properties", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockProperty]));
    const result = await listProperties(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Nhà trọ A");
  });

  it("returns manager-assigned properties", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockProperty]));
    const result = await listProperties(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });

  it("returns empty for tenant role", async () => {
    const result = await listProperties("tenant-1", "tenant");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getProperty
// ---------------------------------------------------------------------------
describe("getProperty", () => {
  it("returns property when owner has access", async () => {
    // assertAccess: finds property by ownerId
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }]));
    // getProperty: returns full row
    mockDb.select.mockReturnValueOnce(chain([mockProperty]));

    const result = await getProperty(OWNER.userId, OWNER.role, PROP_ID);
    expect(result.id).toBe(PROP_ID);
  });

  it("throws FORBIDDEN when owner doesn't own property", async () => {
    mockDb.select.mockReturnValueOnce(chain([])); // assertAccess returns nothing
    await expect(getProperty("other-owner", "owner", PROP_ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when property missing after access check", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // assertAccess OK
    mockDb.select.mockReturnValueOnce(chain([])); // getProperty returns nothing
    await expect(getProperty(OWNER.userId, OWNER.role, PROP_ID)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// createProperty
// ---------------------------------------------------------------------------
describe("createProperty", () => {
  it("creates property for owner", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockProperty]));
    const result = await createProperty(OWNER.userId, OWNER.role, { name: "Nhà trọ A", address: "123 Lê Lợi" });
    expect(result.name).toBe("Nhà trọ A");
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(createProperty(MANAGER.userId, MANAGER.role, { name: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR for empty name", async () => {
    await expect(createProperty(OWNER.userId, OWNER.role, { name: "   " })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// updateProperty
// ---------------------------------------------------------------------------
describe("updateProperty", () => {
  it("updates property for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // assertOwner → assertAccess
    mockDb.update.mockReturnValueOnce(chain([{ ...mockProperty, name: "Nhà trọ B" }]));
    const result = await updateProperty(OWNER.userId, OWNER.role, PROP_ID, { name: "Nhà trọ B" });
    expect(result.name).toBe("Nhà trọ B");
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(updateProperty(MANAGER.userId, MANAGER.role, PROP_ID, { name: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ---------------------------------------------------------------------------
// deleteProperty
// ---------------------------------------------------------------------------
describe("deleteProperty", () => {
  it("deletes property for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: PROP_ID }])); // assertOwner
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteProperty(OWNER.userId, OWNER.role, PROP_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(deleteProperty(MANAGER.userId, MANAGER.role, PROP_ID)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
