import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

vi.mock("../../lib/database/client", () => ({ getDatabase: () => mockDb }));
vi.mock("../notifications/notification.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-1" }),
}));
vi.mock("../../lib/database/schema", () => ({
  tenants: {
    id: "id",
    userId: "userId",
    fullName: "fullName",
    phone: "phone",
    birthDate: "birthDate",
    nationalIdEncrypted: "nationalIdEncrypted",
    hometown: "hometown",
    vehicleNumber: "vehicleNumber",
    emergencyContactName: "emergencyContactName",
    emergencyContactPhone: "emergencyContactPhone",
    idCardFrontUrl: "idCardFrontUrl",
    idCardBackUrl: "idCardBackUrl",
  },
  users: { id: "id", email: "email", phone: "phone", fullName: "fullName" },
  contracts: {
    id: "id",
    roomId: "roomId",
    monthlyRentSnapshot: "monthlyRentSnapshot",
    depositSnapshot: "depositSnapshot",
    paymentCycleMonths: "paymentCycleMonths",
    startDate: "startDate",
    endDate: "endDate",
    status: "status",
  },
  contractTenants: { id: "id", contractId: "contractId", tenantId: "tenantId", isPrimary: "isPrimary" },
  rooms: { id: "id", roomNumber: "roomNumber", propertyId: "propertyId" },
  properties: { id: "id", name: "name", address: "address", bankCode: "bankCode", bankAccount: "bankAccount", accountHolder: "accountHolder", ownerId: "ownerId" },
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

type MockQueryBuilder = {
  from: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  then: (resolve?: (val: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function chain(result: unknown[]): MockQueryBuilder {
  const p = Promise.resolve(result);
  const obj: MockQueryBuilder = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(result),
      then: (resolve?: (val: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => p.then(resolve, reject),
    }),
    limit: vi.fn().mockResolvedValue(result),
    then: (resolve, reject) => p.then(resolve, reject),
  };
  return obj;
}

import {
  getTenantPortalData,
  updateTenantProfileSelf,
  notifyLandlordPayment,
} from "./tenant-portal.service";

describe("tenant-portal.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null profile and empty collections when tenant is not linked and has no matching phone", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([])) // no tenant linked by userId
      .mockReturnValueOnce(chain([{ id: "unknown-user", phone: null, email: "u@test.com" }])); // currentUser has no phone

    const res = await getTenantPortalData("unknown-user");
    expect(res.tenant).toBeNull();
    expect(res.stay).toBeNull();
    expect(res.contract).toBeNull();
    expect(res.invoices).toEqual([]);
    expect(res.meters).toEqual([]);
  });

  it("auto-links unlinked tenant profile when phone matches", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([])) // no tenant by userId
      .mockReturnValueOnce(chain([{ id: "u-1", phone: "0912345678", email: "thue@test.com" }])) // currentUser
      .mockReturnValueOnce(chain([{ id: "t-1", fullName: "Khách Thuê", phone: "0912345678" }])) // unlinkedTenant by phone
      .mockReturnValueOnce(chain([])) // contracts empty
      .mockReturnValueOnce(chain([])); // invoices empty

    mockDb.update.mockReturnValue(chain([]));

    const res = await getTenantPortalData("u-1");
    expect(res.tenant?.fullName).toBe("Khách Thuê");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns full portal data with active stay, contract, invoices, and meters", async () => {
    const mockTenant = {
      id: "t-1",
      userId: "u-1",
      fullName: "Nguyễn Văn Thuê",
      phone: "0912345678",
      birthDate: "1998-05-12",
      citizenId: "001234567890",
      nationalIdEncrypted: "001234567890",
      hometown: "Hà Nội",
      vehicleNumber: "29A-12345",
      emergencyContactName: "Bố",
      emergencyContactPhone: "0988888888",
      idCardFrontUrl: null,
      idCardBackUrl: null,
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

    const mockContractRow = {
      id: "c-1",
      roomId: "r-1",
      roomNumber: "201",
      propertyName: "Nhà Trọ Hoa Mai",
      propertyAddress: "123 Cầu Giấy, Hà Nội",
      startDate: "2025-01-01",
      endDate: "2026-01-01",
      monthlyRentSnapshot: 3500000,
      depositSnapshot: 3500000,
      paymentCycleMonths: 1,
      status: "active",
      landlordName: "Chủ Nhà",
      landlordPhone: "0900000000",
    };

    const mockContractTenant = {
      id: "t-1",
      fullName: "Nguyễn Văn Thuê",
      phone: "0912345678",
      citizenId: "001234567890",
      userId: "u-1",
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
      .mockReturnValueOnce(chain([mockTenant]))         // 1. tenant
      .mockReturnValueOnce(chain([mockStay]))           // 2. contracts
      .mockReturnValueOnce(chain([mockContractRow]))    // 3. active contract details
      .mockReturnValueOnce(chain([mockContractTenant])) // 4. contract tenants
      .mockReturnValueOnce(chain([mockInvoiceRow]))     // 5. invoices
      .mockReturnValueOnce(chain([mockItem]))           // 6. invoice items
      .mockReturnValueOnce(chain([mockPayment]))        // 7. invoice payments
      .mockReturnValueOnce(chain([mockMeter]));         // 8. meters

    const res = await getTenantPortalData("u-1");

    expect(res.tenant?.fullName).toBe("Nguyễn Văn Thuê");
    expect(res.tenant?.citizenId).toBe("001234567890");
    expect(res.stay?.roomNumber).toBe("201");
    expect(res.contract?.propertyName).toBe("Nhà Trọ Hoa Mai");
    expect(res.invoices).toHaveLength(1);
    expect(res.meters).toHaveLength(1);
    expect(res.meters[0].consumption).toBe(70);
  });

  it("updates tenant profile self", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: "t-1", userId: "u-1" }]));
    mockDb.update.mockReturnValue(
      chain([
        {
          id: "t-1",
          userId: "u-1",
          fullName: "Nguyễn Văn Thuê Mới",
          phone: "0912345678",
          birthDate: "1998-05-12",
          nationalIdEncrypted: "034567891011",
          hometown: "Nam Định",
          vehicleNumber: "18B1-99999",
          emergencyContactName: "Mẹ",
          emergencyContactPhone: "0911111111",
          idCardFrontUrl: null,
          idCardBackUrl: null,
        },
      ]),
    );

    const updated = await updateTenantProfileSelf("u-1", {
      fullName: "Nguyễn Văn Thuê Mới",
      citizenId: "034567891011",
      hometown: "Nam Định",
      vehicleNumber: "18B1-99999",
    });

    expect(updated.citizenId).toBe("034567891011");
    expect(updated.hometown).toBe("Nam Định");
  });

  it("sends payment notification to landlord", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chain([
          {
            id: "inv-1",
            billingPeriodStart: "2026-11-01",
            totalAmount: 3500000,
            roomNumber: "101",
            propertyName: "Nhà trọ A",
            ownerId: "owner-1",
          },
        ]),
      )
      .mockReturnValueOnce(
        chain([
          {
            fullName: "Nguyễn Văn Thuê",
            email: "thue@test.com",
          },
        ]),
      );

    const result = await notifyLandlordPayment("u-1", "inv-1", "Vừa CK qua Techcombank");
    expect(result.success).toBe(true);
  });
});
