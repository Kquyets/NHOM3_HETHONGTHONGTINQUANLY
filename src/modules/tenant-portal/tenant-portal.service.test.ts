import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  select: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({ getDatabase: () => mockDb }));
vi.mock("../../lib/database/schema", () => ({
  tenants: { id: "id", userId: "userId", fullName: "fullName", phone: "phone", birthDate: "birthDate" },
  users: { id: "id", email: "email" },
  contracts: {
    id: "id",
    roomId: "roomId",
    monthlyRentSnapshot: "monthlyRentSnapshot",
    depositSnapshot: "depositSnapshot",
    startDate: "startDate",
    endDate: "endDate",
    status: "status",
  },
  contractTenants: { id: "id", contractId: "contractId", tenantId: "tenantId" },
  rooms: { id: "id", roomNumber: "roomNumber", propertyId: "propertyId" },
  properties: { id: "id", name: "name", address: "address", bankCode: "bankCode", bankAccount: "bankAccount", accountHolder: "accountHolder" },
  invoices: {
    id: "id",
    contractId: "contractId",
    billingPeriodStart: "billingPeriodStart",
    issueDate: "issueDate",
    dueDate: "dueDate",
    status: "status",
    totalAmount: "totalAmount",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
  invoiceItems: {
    id: "id",
    invoiceId: "invoiceId",
    meterReadingId: "meterReadingId",
    itemType: "itemType",
    description: "description",
    quantity: "quantity",
    unitPriceSnapshot: "unitPriceSnapshot",
    amount: "amount",
    createdAt: "createdAt",
  },
  payments: {
    id: "id",
    invoiceId: "invoiceId",
    amount: "amount",
    paidAt: "paidAt",
    method: "method",
    reference: "reference",
    note: "note",
    createdAt: "createdAt",
  },
  meterReadings: {
    id: "id",
    roomId: "roomId",
    utilityType: "utilityType",
    billingPeriod: "billingPeriod",
    previousValue: "previousValue",
    currentValue: "currentValue",
    unitPriceSnapshot: "unitPriceSnapshot",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  asc: vi.fn((col) => ({ type: "asc", col })),
}));

function chain(result: unknown[]) {
  const p = Promise.resolve(result);
  const obj: any = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(result),
      then: (resolve: any, reject: any) => p.then(resolve, reject),
    }),
    limit: vi.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => p.then(resolve, reject),
  };
  return obj;
}

import { getTenantPortalData } from "./tenant-portal.service";

describe("tenant-portal.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null profile and empty collections when tenant is not linked", async () => {
    mockDb.select.mockReturnValueOnce(chain([])); // no tenant found

    const res = await getTenantPortalData("unknown-user");
    expect(res.tenant).toBeNull();
    expect(res.stay).toBeNull();
    expect(res.invoices).toEqual([]);
    expect(res.meters).toEqual([]);
  });

  it("returns full portal data with active stay, invoices, and meters", async () => {
    const mockTenant = {
      id: "t-1",
      userId: "u-1",
      fullName: "Nguyễn Văn Thuê",
      phone: "0912345678",
      birthDate: "1998-05-12",
      email: "thue@example.com",
    };

    const mockStay = {
      contractId: "c-1",
      roomId: "r-1",
      roomNumber: "201",
      propertyName: "Nhà Trọ Hoa Mai",
      propertyAddress: "123 Cầu Giấy, Hà Nội",
      bankCode: "MB",
      bankAccount: "0987654321",
      accountHolder: "CHỦ NHÀ",
      monthlyRent: 3500000,
      deposit: 3500000,
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      contractStatus: "active",
    };

    const mockInvoiceRow = {
      id: "inv-1",
      contractId: "c-1",
      roomNumber: "201",
      propertyName: "Nhà Trọ Hoa Mai",
      propertyAddress: "123 Cầu Giấy, Hà Nội",
      bankCode: "MB",
      bankAccount: "0987654321",
      accountHolder: "CHỦ NHÀ",
      billingPeriodStart: "2025-02-01",
      issueDate: "2025-02-01",
      dueDate: "2025-02-10",
      status: "issued",
      totalAmount: 3950000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockItem = {
      id: "it-1",
      invoiceId: "inv-1",
      meterReadingId: null,
      itemType: "rent",
      description: "Tiền phòng",
      quantity: "1",
      unitPriceSnapshot: 3500000,
      amount: 3500000,
      createdAt: new Date(),
    };

    const mockPayment = {
      id: "pay-1",
      invoiceId: "inv-1",
      amount: 1000000,
      paidAt: new Date(),
      method: "bank_transfer",
      reference: "MB123",
      note: null,
      createdAt: new Date(),
    };

    const mockMeter = {
      id: "m-1",
      utilityType: "electricity",
      billingPeriod: "2025-02-01",
      previousValue: "150",
      currentValue: "220",
      unitPriceSnapshot: 3500,
      createdAt: new Date(),
    };

    mockDb.select
      .mockReturnValueOnce(chain([mockTenant]))      // 1. tenant
      .mockReturnValueOnce(chain([mockStay]))        // 2. contracts
      .mockReturnValueOnce(chain([mockInvoiceRow]))  // 3. invoices
      .mockReturnValueOnce(chain([mockItem]))        // 4. invoice items
      .mockReturnValueOnce(chain([mockPayment]))     // 5. invoice payments
      .mockReturnValueOnce(chain([mockMeter]));      // 6. meters

    const res = await getTenantPortalData("u-1");

    expect(res.tenant?.fullName).toBe("Nguyễn Văn Thuê");
    expect(res.stay?.roomNumber).toBe("201");
    expect(res.stay?.monthlyRent).toBe(3500000);
    expect(res.invoices).toHaveLength(1);
    expect(res.invoices[0].paidAmount).toBe(1000000);
    expect(res.invoices[0].items).toHaveLength(1);
    expect(res.meters).toHaveLength(1);
    expect(res.meters[0].consumption).toBe(70); // 220 - 150
  });
});
