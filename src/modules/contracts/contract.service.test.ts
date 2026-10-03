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
  contracts: {
    id: "id",
    roomId: "roomId",
    startDate: "startDate",
    endDate: "endDate",
    status: "status",
    monthlyRentSnapshot: "monthlyRentSnapshot",
    depositSnapshot: "depositSnapshot",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    $inferInsert: {},
  },
  rooms: { id: "id", propertyId: "propertyId", roomNumber: "roomNumber" },
  properties: { id: "id", ownerId: "ownerId", name: "name" },
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", status: "status" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  inArray: vi.fn().mockReturnValue({ type: "inArray" }),
}));

function chain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
  };
}

import {
  listContracts,
  getContract,
  createContract,
  updateContractStatus,
  deleteContract,
} from "./contract.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const TENANT_USER = { userId: "tenant-user-1", role: "tenant" as const };
const CONTRACT_ID = "contract-abc";
const ROOM_ID = "room-xyz";

const mockContract = {
  id: CONTRACT_ID,
  roomId: ROOM_ID,
  roomNumber: "101",
  propertyName: "Nhà trọ A",
  startDate: "2025-01-01",
  endDate: null,
  status: "active" as const,
  monthlyRentSnapshot: 3000000,
  depositSnapshot: 6000000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listContracts
// ---------------------------------------------------------------------------
describe("listContracts", () => {
  it("returns contracts for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockContract]));
    const result = await listContracts(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("active");
  });

  it("returns contracts for manager", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockContract]));
    const result = await listContracts(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(listContracts(TENANT_USER.userId, TENANT_USER.role)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// getContract
// ---------------------------------------------------------------------------
describe("getContract", () => {
  it("returns contract for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockContract]));
    const result = await getContract(OWNER.userId, OWNER.role, CONTRACT_ID);
    expect(result.id).toBe(CONTRACT_ID);
  });

  it("throws NOT_FOUND when contract does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getContract(OWNER.userId, OWNER.role, CONTRACT_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(getContract(TENANT_USER.userId, TENANT_USER.role, CONTRACT_ID)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// createContract
// ---------------------------------------------------------------------------
describe("createContract", () => {
  it("creates contract for owner", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockContract]));
    const result = await createContract(OWNER.userId, OWNER.role, {
      roomId: ROOM_ID,
      startDate: "2025-01-01",
      monthlyRentSnapshot: 3000000,
      depositSnapshot: 6000000,
    });
    expect(result.roomId).toBe(ROOM_ID);
  });

  it("creates contract for manager", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockContract]));
    const result = await createContract(MANAGER.userId, MANAGER.role, {
      roomId: ROOM_ID,
      startDate: "2025-01-01",
      monthlyRentSnapshot: 2000000,
      depositSnapshot: 4000000,
    });
    expect(result.monthlyRentSnapshot).toBe(3000000);
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(
      createContract(TENANT_USER.userId, TENANT_USER.role, {
        roomId: ROOM_ID,
        startDate: "2025-01-01",
        monthlyRentSnapshot: 1000000,
        depositSnapshot: 2000000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR when monthlyRentSnapshot is negative", async () => {
    await expect(
      createContract(OWNER.userId, OWNER.role, {
        roomId: ROOM_ID,
        startDate: "2025-01-01",
        monthlyRentSnapshot: -1,
        depositSnapshot: 0,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when depositSnapshot is negative", async () => {
    await expect(
      createContract(OWNER.userId, OWNER.role, {
        roomId: ROOM_ID,
        startDate: "2025-01-01",
        monthlyRentSnapshot: 1000000,
        depositSnapshot: -500,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when startDate is missing", async () => {
    await expect(
      createContract(OWNER.userId, OWNER.role, {
        roomId: ROOM_ID,
        startDate: "",
        monthlyRentSnapshot: 1000000,
        depositSnapshot: 0,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// updateContractStatus
// ---------------------------------------------------------------------------
describe("updateContractStatus", () => {
  it("activates a draft contract for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ ...mockContract, status: "draft" }]));
    mockDb.update.mockReturnValueOnce(chain([{ ...mockContract, status: "active" }]));
    const result = await updateContractStatus(OWNER.userId, OWNER.role, CONTRACT_ID, "active");
    expect(result.status).toBe("active");
  });

  it("ends an active contract", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockContract]));
    mockDb.update.mockReturnValueOnce(chain([{ ...mockContract, status: "ended" }]));
    const result = await updateContractStatus(OWNER.userId, OWNER.role, CONTRACT_ID, "ended");
    expect(result.status).toBe("ended");
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(
      updateContractStatus(TENANT_USER.userId, TENANT_USER.role, CONTRACT_ID, "ended"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when contract does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(
      updateContractStatus(OWNER.userId, OWNER.role, CONTRACT_ID, "ended"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ---------------------------------------------------------------------------
// deleteContract
// ---------------------------------------------------------------------------
describe("deleteContract", () => {
  it("allows owner to delete a draft contract", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ ...mockContract, status: "draft" }]));
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteContract(OWNER.userId, OWNER.role, CONTRACT_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for non-owner", async () => {
    await expect(
      deleteContract(MANAGER.userId, MANAGER.role, CONTRACT_ID),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws BUSINESS_RULE_ERROR when trying to delete an active contract", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockContract])); // status: active
    await expect(deleteContract(OWNER.userId, OWNER.role, CONTRACT_ID)).rejects.toMatchObject({
      code: "BUSINESS_RULE_ERROR",
    });
  });

  it("throws NOT_FOUND when contract does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(deleteContract(OWNER.userId, OWNER.role, CONTRACT_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
