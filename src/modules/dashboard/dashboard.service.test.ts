import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock DB & Services
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({
  getDatabase: () => mockDb,
}));

vi.mock("../../lib/database/schema", () => ({
  properties: { id: "id", name: "name", ownerId: "ownerId" },
  propertyMembers: { propertyId: "propertyId", userId: "userId", status: "status" },
  rooms: {
    id: "id",
    propertyId: "propertyId",
    roomNumber: "roomNumber",
    status: "status",
    monthlyRent: "monthlyRent",
  },
  contracts: {
    id: "id",
    roomId: "roomId",
    status: "status",
    startDate: "startDate",
    endDate: "endDate",
  },
  contractTenants: { contractId: "contractId", tenantId: "tenantId" },
  tenants: { id: "id", fullName: "fullName" },
  invoices: {
    id: "id",
    contractId: "contractId",
    billingPeriodStart: "billingPeriodStart",
    dueDate: "dueDate",
    status: "status",
    totalAmount: "totalAmount",
  },
  payments: { invoiceId: "invoiceId", amount: "amount" },
  meterReadings: {
    propertyId: "propertyId",
    utilityType: "utilityType",
    billingPeriod: "billingPeriod",
    previousValue: "previousValue",
    currentValue: "currentValue",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  inArray: vi.fn().mockReturnValue({ type: "inArray" }),
}));

vi.mock("../properties/property.service", () => ({
  listProperties: vi.fn(),
}));

import { listProperties } from "../properties/property.service";
import { getDashboardSummary } from "./dashboard.service";
import { AppError } from "../../errors/app-error";

function chain(result: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn().mockResolvedValue(result),
    then: (onFulfilled?: (value: unknown[]) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  };
  obj.from.mockReturnValue(obj);
  obj.innerJoin.mockReturnValue(obj);
  obj.leftJoin.mockReturnValue(obj);
  obj.where.mockReturnValue(obj);
  return obj;
}

describe("Dashboard Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when user is a tenant", async () => {
    await expect(
      getDashboardSummary({ userId: "u1", role: "tenant" }),
    ).rejects.toThrowError(AppError);
  });

  it("returns zero summary when user has no properties", async () => {
    vi.mocked(listProperties).mockResolvedValue([]);

    const summary = await getDashboardSummary({
      userId: "u1",
      role: "owner",
      month: 10,
      year: 2026,
    });

    expect(summary.properties).toEqual([]);
    expect(summary.occupancy.totalRooms).toBe(0);
    expect(summary.occupancy.occupancyRate).toBe(0);
    expect(summary.financials.totalBilled).toBe(0);
    expect(summary.financials.totalDebt).toBe(0);
    expect(summary.expiringContracts).toEqual([]);
    expect(summary.unpaidInvoices).toEqual([]);
  });

  it("throws FORBIDDEN when user requests an unauthorized propertyId", async () => {
    vi.mocked(listProperties).mockResolvedValue([
      {
        id: "prop-1",
        ownerId: "u1",
        name: "Nhà 1",
        address: null,
        bankCode: null,
        bankAccount: null,
        accountHolder: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(
      getDashboardSummary({
        userId: "u1",
        role: "owner",
        propertyId: "prop-unknown",
      }),
    ).rejects.toThrowError(AppError);
  });

  it("calculates occupancy, financials, expiring contracts, and utilities accurately", async () => {
    // Accessible properties
    vi.mocked(listProperties).mockResolvedValue([
      {
        id: "prop-1",
        ownerId: "u1",
        name: "Nhà Trọ A",
        address: "Hà Nội",
        bankCode: "MB",
        bankAccount: "0987654321",
        accountHolder: "NGUYEN VAN A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Setup sequence of db.select calls
    // 1. Rooms
    const mockRooms = [
      { id: "r1", propertyId: "prop-1", roomNumber: "101", status: "ready", monthlyRent: 3000000 },
      { id: "r2", propertyId: "prop-1", roomNumber: "102", status: "ready", monthlyRent: 3200000 },
      { id: "r3", propertyId: "prop-1", roomNumber: "103", status: "maintenance", monthlyRent: 2800000 },
    ];

    // 2. Contracts (r1 active, r2 active, r3 has none)
    const futureDateUrgent = new Date();
    futureDateUrgent.setDate(futureDateUrgent.getDate() + 5);
    const futureDateNormal = new Date();
    futureDateNormal.setDate(futureDateNormal.getDate() + 20);

    const mockContracts = [
      {
        id: "c1",
        roomId: "r1",
        roomNumber: "101",
        propertyId: "prop-1",
        propertyName: "Nhà Trọ A",
        status: "active",
        startDate: "2026-01-01",
        endDate: futureDateUrgent.toISOString().slice(0, 10),
      },
      {
        id: "c2",
        roomId: "r2",
        roomNumber: "102",
        propertyId: "prop-1",
        propertyName: "Nhà Trọ A",
        status: "active",
        startDate: "2026-02-01",
        endDate: futureDateNormal.toISOString().slice(0, 10),
      },
    ];

    // 3. Contract tenants
    const mockContractTenants = [
      { contractId: "c1", fullName: "Nguyễn Văn A" },
      { contractId: "c2", fullName: "Trần Thị B" },
    ];

    // 4. Invoices
    const mockInvoices = [
      {
        id: "inv-1",
        contractId: "c1",
        roomNumber: "101",
        propertyName: "Nhà Trọ A",
        billingPeriodStart: "2026-10-01",
        dueDate: "2026-10-05",
        status: "partially_paid",
        totalAmount: 3500000,
      },
      {
        id: "inv-2",
        contractId: "c2",
        roomNumber: "102",
        propertyName: "Nhà Trọ A",
        billingPeriodStart: "2026-10-01",
        dueDate: "2026-10-10",
        status: "paid",
        totalAmount: 3200000,
      },
    ];

    // 5. Payments (inv-1 paid 1.5M, inv-2 paid 3.2M)
    const mockPayments = [
      { invoiceId: "inv-1", amount: 1500000 },
      { invoiceId: "inv-2", amount: 3200000 },
    ];

    // 6. Meter readings (Electricity: 150 kWh, Water: 12 m3)
    const mockMeterReadings = [
      {
        propertyId: "prop-1",
        utilityType: "electricity",
        billingPeriod: "2026-10-01",
        previousValue: "100.000",
        currentValue: "250.000",
      },
      {
        propertyId: "prop-1",
        utilityType: "water",
        billingPeriod: "2026-10-01",
        previousValue: "20.000",
        currentValue: "32.000",
      },
    ];

    mockDb.select
      .mockReturnValueOnce(chain(mockRooms))
      .mockReturnValueOnce(chain(mockContracts))
      .mockReturnValueOnce(chain(mockContractTenants))
      .mockReturnValueOnce(chain(mockInvoices))
      .mockReturnValueOnce(chain(mockPayments))
      .mockReturnValueOnce(chain(mockMeterReadings));

    const result = await getDashboardSummary({
      userId: "u1",
      role: "owner",
      month: 10,
      year: 2026,
    });

    // 1. Occupancy: 3 total, 2 active contracts, 1 maintenance, 0 vacant -> 66.7%
    expect(result.occupancy.totalRooms).toBe(3);
    expect(result.occupancy.occupiedRooms).toBe(2);
    expect(result.occupancy.maintenanceRooms).toBe(1);
    expect(result.occupancy.vacantRooms).toBe(0);
    expect(result.occupancy.occupancyRate).toBe(66.7);

    // 2. Financials:
    // Period total billed = 3.5M + 3.2M = 6.7M
    // Period total collected = 1.5M + 3.2M = 4.7M
    // Collection rate = (4.7M / 6.7M) * 100 = ~70.1%
    // Debt = inv-1 (3.5M - 1.5M) = 2.0M
    expect(result.financials.totalBilled).toBe(6700000);
    expect(result.financials.totalCollected).toBe(4700000);
    expect(result.financials.totalDebt).toBe(2000000);
    expect(result.financials.unpaidInvoiceCount).toBe(1);
    expect(result.financials.collectionRate).toBe(70.1);

    // 3. Expiring contracts:
    expect(result.expiringContracts.length).toBe(2);
    expect(result.expiringContracts[0].roomNumber).toBe("101");
    expect(result.expiringContracts[0].isUrgent).toBe(true); // <= 7 days

    // 4. Unpaid invoices:
    expect(result.unpaidInvoices.length).toBe(1);
    expect(result.unpaidInvoices[0].id).toBe("inv-1");
    expect(result.unpaidInvoices[0].remainingAmount).toBe(2000000);

    // 5. Utilities:
    expect(result.utilities.electricityKwh).toBe(150);
    expect(result.utilities.waterM3).toBe(12);
  });
});
