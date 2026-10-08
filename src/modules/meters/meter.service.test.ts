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
  meterReadings: {
    id: "id",
    roomId: "roomId",
    propertyId: "propertyId",
    utilityType: "utilityType",
    billingPeriod: "billingPeriod",
    previousValue: "previousValue",
    currentValue: "currentValue",
    utilityRateId: "utilityRateId",
    unitPriceSnapshot: "unitPriceSnapshot",
    createdAt: "createdAt",
    $inferInsert: {},
  },
  utilityRates: {
    id: "id",
    propertyId: "propertyId",
    utilityType: "utilityType",
    unitPrice: "unitPrice",
    effectiveFrom: "effectiveFrom",
    effectiveTo: "effectiveTo",
    createdAt: "createdAt",
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
  asc: vi.fn((col) => ({ type: "asc", col })),
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
  listMeterReadings,
  getMeterReading,
  createMeterReading,
  deleteMeterReading,
  listUtilityRates,
  createUtilityRate,
} from "./meter.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const TENANT_USER = { userId: "tenant-user-1", role: "tenant" as const };
const READING_ID = "reading-123";
const RATE_ID = "rate-123";

const mockReading = {
  id: READING_ID,
  roomId: "room-1",
  roomNumber: "101",
  propertyId: "prop-1",
  propertyName: "Nhà trọ A",
  utilityType: "electricity" as const,
  billingPeriod: "2025-02-01",
  previousValue: "100.000",
  currentValue: "150.000",
  utilityRateId: RATE_ID,
  unitPriceSnapshot: 3500,
  createdAt: new Date(),
};

const mockRate = {
  id: RATE_ID,
  propertyId: "prop-1",
  utilityType: "electricity" as const,
  unitPrice: 3500,
  effectiveFrom: "2025-01-01",
  effectiveTo: null,
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listMeterReadings
// ---------------------------------------------------------------------------
describe("listMeterReadings", () => {
  it("returns readings for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockReading]));
    const result = await listMeterReadings(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].utilityType).toBe("electricity");
  });

  it("returns readings for manager", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockReading]));
    const result = await listMeterReadings(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(listMeterReadings(TENANT_USER.userId, TENANT_USER.role)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// getMeterReading
// ---------------------------------------------------------------------------
describe("getMeterReading", () => {
  it("returns reading for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockReading]));
    const result = await getMeterReading(OWNER.userId, OWNER.role, READING_ID);
    expect(result.id).toBe(READING_ID);
  });

  it("throws NOT_FOUND when reading does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getMeterReading(OWNER.userId, OWNER.role, READING_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// createMeterReading
// ---------------------------------------------------------------------------
describe("createMeterReading", () => {
  it("creates meter reading with valid inputs", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockReading]));
    const result = await createMeterReading(OWNER.userId, OWNER.role, {
      roomId: "room-1",
      propertyId: "prop-1",
      utilityType: "electricity",
      billingPeriod: "2025-02-01",
      previousValue: 100,
      currentValue: 150,
      utilityRateId: RATE_ID,
      unitPriceSnapshot: 3500,
    });
    expect(result.id).toBe(READING_ID);
  });

  it("throws VALIDATION_ERROR when currentValue < previousValue", async () => {
    await expect(
      createMeterReading(OWNER.userId, OWNER.role, {
        roomId: "room-1",
        propertyId: "prop-1",
        utilityType: "electricity",
        billingPeriod: "2025-02-01",
        previousValue: 200,
        currentValue: 150,
        utilityRateId: RATE_ID,
        unitPriceSnapshot: 3500,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when previousValue < 0", async () => {
    await expect(
      createMeterReading(OWNER.userId, OWNER.role, {
        roomId: "room-1",
        propertyId: "prop-1",
        utilityType: "water",
        billingPeriod: "2025-02-01",
        previousValue: -1,
        currentValue: 10,
        utilityRateId: RATE_ID,
        unitPriceSnapshot: 20000,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when billingPeriod does not start on day 01", async () => {
    await expect(
      createMeterReading(OWNER.userId, OWNER.role, {
        roomId: "room-1",
        propertyId: "prop-1",
        utilityType: "electricity",
        billingPeriod: "2025-02-15",
        previousValue: 100,
        currentValue: 150,
        utilityRateId: RATE_ID,
        unitPriceSnapshot: 3500,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// deleteMeterReading
// ---------------------------------------------------------------------------
describe("deleteMeterReading", () => {
  it("deletes reading for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockReading]));
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteMeterReading(OWNER.userId, OWNER.role, READING_ID)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN for manager", async () => {
    await expect(
      deleteMeterReading(MANAGER.userId, MANAGER.role, READING_ID),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ---------------------------------------------------------------------------
// Utility Rates
// ---------------------------------------------------------------------------
describe("utilityRates", () => {
  it("lists utility rates for staff", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockRate]));
    const result = await listUtilityRates(OWNER.userId, OWNER.role, "prop-1");
    expect(result).toHaveLength(1);
    expect(result[0].unitPrice).toBe(3500);
  });

  it("creates utility rate with valid unit price", async () => {
    mockDb.insert.mockReturnValueOnce(chain([mockRate]));
    const result = await createUtilityRate(OWNER.userId, OWNER.role, {
      propertyId: "prop-1",
      utilityType: "electricity",
      unitPrice: 3500,
      effectiveFrom: "2025-01-01",
    });
    expect(result.unitPrice).toBe(3500);
  });

  it("throws VALIDATION_ERROR when unitPrice is negative", async () => {
    await expect(
      createUtilityRate(OWNER.userId, OWNER.role, {
        propertyId: "prop-1",
        utilityType: "electricity",
        unitPrice: -500,
        effectiveFrom: "2025-01-01",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
