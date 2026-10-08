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
  tenants: {
    id: "id",
    userId: "userId",
    linkedUserRole: "linkedUserRole",
    fullName: "fullName",
    nationalIdEncrypted: "nationalIdEncrypted",
    phone: "phone",
    birthDate: "birthDate",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    $inferInsert: {},
  },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  ilike: vi.fn().mockReturnValue({ type: "ilike" }),
  or: vi.fn((...args) => ({ type: "or", args })),
  asc: vi.fn((col) => ({ type: "asc", col })),
}));

function chain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
} from "./tenant.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const TENANT_USER = { userId: "tenant-user-1", role: "tenant" as const };
const TENANT_ID = "tenant-abc";

const mockTenant = {
  id: TENANT_ID,
  userId: null,
  fullName: "Nguyễn Văn A",
  phone: "0901234567",
  birthDate: "1995-01-15",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listTenants
// ---------------------------------------------------------------------------
describe("listTenants", () => {
  it("returns tenants for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant]));
    const result = await listTenants(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe("Nguyễn Văn A");
  });

  it("returns tenants for manager", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant]));
    const result = await listTenants(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(listTenants(TENANT_USER.userId, TENANT_USER.role)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// getTenant
// ---------------------------------------------------------------------------
describe("getTenant", () => {
  it("returns tenant for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant]));
    const result = await getTenant(OWNER.userId, OWNER.role, TENANT_ID);
    expect(result.id).toBe(TENANT_ID);
  });

  it("throws NOT_FOUND when tenant does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getTenant(OWNER.userId, OWNER.role, TENANT_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(getTenant(TENANT_USER.userId, TENANT_USER.role, TENANT_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// createTenant
// ---------------------------------------------------------------------------
describe("createTenant", () => {
  it("creates tenant for owner", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockTenant]));
    const result = await createTenant(OWNER.userId, OWNER.role, {
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
    });
    expect(result.fullName).toBe("Nguyễn Văn A");
  });

  it("creates tenant for manager", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockTenant]));
    const result = await createTenant(MANAGER.userId, MANAGER.role, {
      fullName: "Nguyễn Văn A",
    });
    expect(result.fullName).toBe("Nguyễn Văn A");
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(
      createTenant(TENANT_USER.userId, TENANT_USER.role, { fullName: "X" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR for empty fullName", async () => {
    await expect(
      createTenant(OWNER.userId, OWNER.role, { fullName: "   " }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR for missing fullName", async () => {
    await expect(
      createTenant(OWNER.userId, OWNER.role, { fullName: "" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// updateTenant
// ---------------------------------------------------------------------------
describe("updateTenant", () => {
  it("updates tenant for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant])); // getTenant check
    mockDb.update.mockReturnValueOnce(chain([{ ...mockTenant, fullName: "Trần Thị B" }]));
    const result = await updateTenant(OWNER.userId, OWNER.role, TENANT_ID, { fullName: "Trần Thị B" });
    expect(result.fullName).toBe("Trần Thị B");
  });

  it("updates tenant for manager", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant]));
    mockDb.update.mockReturnValueOnce(chain([{ ...mockTenant, phone: "0999999999" }]));
    const result = await updateTenant(MANAGER.userId, MANAGER.role, TENANT_ID, { phone: "0999999999" });
    expect(result.phone).toBe("0999999999");
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(
      updateTenant(TENANT_USER.userId, TENANT_USER.role, TENANT_ID, { phone: "0900000000" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR for empty fullName", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant]));
    await expect(
      updateTenant(OWNER.userId, OWNER.role, TENANT_ID, { fullName: "  " }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws NOT_FOUND when tenant does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(
      updateTenant(OWNER.userId, OWNER.role, TENANT_ID, { phone: "09" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// deleteTenant
// ---------------------------------------------------------------------------
describe("deleteTenant", () => {
  it("deletes tenant for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockTenant])); // existence check
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteTenant(OWNER.userId, OWNER.role, TENANT_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(
      deleteTenant(TENANT_USER.userId, TENANT_USER.role, TENANT_ID),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when tenant does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(deleteTenant(OWNER.userId, OWNER.role, TENANT_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
