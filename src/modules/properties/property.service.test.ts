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
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", managerRole: "managerRole", status: "status", createdAt: "createdAt" },
  users: { id: "id", email: "email", fullName: "fullName", phone: "phone", role: "role" },
}));
vi.mock("../notifications/notification.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  or: vi.fn((...args) => ({ type: "or", args })),
}));

function chain(result: unknown[]) {
  const obj: any = {
    from: vi.fn(),
    where: vi.fn(),
    innerJoin: vi.fn(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
    then: (resolve: (val: unknown) => void, reject?: (err: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  obj.from.mockReturnValue(obj);
  obj.where.mockReturnValue(obj);
  obj.innerJoin.mockReturnValue(obj);
  obj.values.mockReturnValue(obj);
  obj.set.mockReturnValue(obj);
  return obj;
}

import {
  listProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  listPropertyMembers,
  addPropertyMember,
  removePropertyMember,
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

  it("returns manager properties", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockProperty]));
    const result = await listProperties(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getProperty
// ---------------------------------------------------------------------------
describe("getProperty", () => {
  it("returns property when accessible", async () => {
    mockDb.select.mockReturnValue(chain([mockProperty]));
    const result = await getProperty(OWNER.userId, OWNER.role, PROP_ID);
    expect(result.id).toBe(PROP_ID);
  });

  it("throws NOT_FOUND when property not found", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockProperty])) // canAccess check passes
      .mockReturnValueOnce(chain([]));            // select property returns empty
    await expect(getProperty(OWNER.userId, OWNER.role, PROP_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// createProperty
// ---------------------------------------------------------------------------
describe("createProperty", () => {
  it("creates property for owner", async () => {
    mockDb.insert.mockReturnValue(chain([mockProperty]));
    const result = await createProperty(OWNER.userId, OWNER.role, { name: "Nhà trọ Mới" });
    expect(result.name).toBe("Nhà trọ A");
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(
      createProperty(MANAGER.userId, MANAGER.role, { name: "Nhà trọ Mới" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR when name is empty", async () => {
    await expect(
      createProperty(OWNER.userId, OWNER.role, { name: "   " }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// updateProperty
// ---------------------------------------------------------------------------
describe("updateProperty", () => {
  it("updates property for owner", async () => {
    mockDb.select.mockReturnValue(chain([mockProperty]));
    mockDb.update.mockReturnValue(chain([{ ...mockProperty, name: "Tên mới" }]));
    const result = await updateProperty(OWNER.userId, OWNER.role, PROP_ID, { name: "Tên mới" });
    expect(result.name).toBe("Tên mới");
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(
      updateProperty(MANAGER.userId, MANAGER.role, PROP_ID, { name: "X" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR for empty name", async () => {
    mockDb.select.mockReturnValue(chain([mockProperty]));
    await expect(
      updateProperty(OWNER.userId, OWNER.role, PROP_ID, { name: "" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// deleteProperty
// ---------------------------------------------------------------------------
describe("deleteProperty", () => {
  it("deletes property for owner", async () => {
    mockDb.select.mockReturnValue(chain([mockProperty]));
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteProperty(OWNER.userId, OWNER.role, PROP_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(
      deleteProperty(MANAGER.userId, MANAGER.role, PROP_ID),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ---------------------------------------------------------------------------
// listPropertyMembers & addPropertyMember & removePropertyMember
// ---------------------------------------------------------------------------
describe("property members management", () => {
  it("lists active property members", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockProperty])) // canAccess
      .mockReturnValueOnce(chain([{
        id: "member-1",
        propertyId: PROP_ID,
        userId: "user-2",
        email: "mgr@test.com",
        fullName: "Quản lý B",
        phone: "0912345678",
        role: "manager",
        status: "active",
        createdAt: new Date(),
      }]));
    const result = await listPropertyMembers(OWNER.userId, OWNER.role, PROP_ID);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("mgr@test.com");
  });

  it("adds a new property member by email", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockProperty])) // assertAccess
      .mockReturnValueOnce(chain([{ id: "u-2", email: "mgr@test.com", fullName: "Quản lý", phone: "09123", role: "manager" }])) // find user
      .mockReturnValueOnce(chain([])) // check existing member
      .mockReturnValueOnce(chain([{ name: "Nhà trọ A" }])); // fetch prop name for notif
    mockDb.insert.mockReturnValue(chain([{ id: "member-1" }]));

    const result = await addPropertyMember(OWNER.userId, OWNER.role, PROP_ID, "mgr@test.com");
    expect(result.role).toBe("manager");
    expect(result.email).toBe("mgr@test.com");
  });

  it("removes a property member", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockProperty])); // assertAccess
    mockDb.update.mockReturnValue(chain([]));

    await expect(
      removePropertyMember(OWNER.userId, OWNER.role, PROP_ID, "member-1"),
    ).resolves.toBeUndefined();
  });
});
