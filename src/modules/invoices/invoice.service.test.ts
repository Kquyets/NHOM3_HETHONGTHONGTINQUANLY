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
vi.mock("../notifications/notification.service", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: "notif-mock" }),
}));
vi.mock("../../lib/database/schema", () => ({
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
    $inferInsert: {},
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
  },
  contracts: { id: "id", roomId: "roomId", monthlyRentSnapshot: "monthlyRentSnapshot", status: "status" },
  rooms: { id: "id", propertyId: "propertyId", roomNumber: "roomNumber" },
  properties: { id: "id", ownerId: "ownerId", name: "name", address: "address" },
  propertyMembers: { id: "id", propertyId: "propertyId", userId: "userId", status: "status" },
  contractTenants: { id: "id", contractId: "contractId", tenantId: "tenantId" },
  tenants: { id: "id", fullName: "fullName", phone: "phone" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue({ type: "eq" }),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  asc: vi.fn((col) => ({ type: "asc", col })),
  inArray: vi.fn().mockReturnValue({ type: "inArray" }),
}));

type MockQueryBuilder = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  innerJoin: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  then: (resolve?: (val: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

function chain(result: unknown[]): MockQueryBuilder {
  const p = Promise.resolve(result);
  const obj: MockQueryBuilder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockResolvedValue(result),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result),
    then: (resolve, reject) => p.then(resolve, reject),
  };
  return obj;
}

import {
  listInvoices,
  getInvoice,
  createInvoice,
  batchGenerateInvoices,
  updateInvoiceStatus,
  addPayment,
  deleteInvoice,
} from "./invoice.service";

const OWNER = { userId: "owner-1", role: "owner" as const };
const MANAGER = { userId: "mgr-1", role: "manager" as const };
const TENANT_USER = { userId: "tenant-user-1", role: "tenant" as const };
const INVOICE_ID = "inv-123";
const CONTRACT_ID = "contract-123";

const mockInvoice = {
  id: INVOICE_ID,
  contractId: CONTRACT_ID,
  roomNumber: "101",
  propertyName: "Nhà trọ A",
  billingPeriodStart: "2025-02-01",
  issueDate: "2025-02-01",
  dueDate: "2025-02-10",
  status: "issued" as const,
  totalAmount: 3500000,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// listInvoices
// ---------------------------------------------------------------------------
describe("listInvoices", () => {
  it("returns invoices for owner", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockInvoice]));
    const result = await listInvoices(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("issued");
  });

  it("returns invoices for manager", async () => {
    mockDb.select.mockReturnValueOnce(chain([mockInvoice]));
    const result = await listInvoices(MANAGER.userId, MANAGER.role);
    expect(result).toHaveLength(1);
  });

  it("deduplicates invoices across multiple tenants and computes paidAmount", async () => {
    mockDb.select
      .mockReturnValueOnce(
        chain([
          { ...mockInvoice, tenantName: "Người A" },
          { ...mockInvoice, tenantName: "Người B" },
        ]),
      )
      .mockReturnValueOnce(chain([{ invoiceId: INVOICE_ID, amount: 1500000 }]));
    const result = await listInvoices(OWNER.userId, OWNER.role);
    expect(result).toHaveLength(1);
    expect(result[0].paidAmount).toBe(1500000);
  });

  it("throws FORBIDDEN for tenant role", async () => {
    await expect(listInvoices(TENANT_USER.userId, TENANT_USER.role)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// getInvoice
// ---------------------------------------------------------------------------
describe("getInvoice", () => {
  it("returns invoice with items and payments", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockInvoice])) // invoice
      .mockReturnValueOnce(chain([]))            // items
      .mockReturnValueOnce(chain([]));           // payments
    const result = await getInvoice(OWNER.userId, OWNER.role, INVOICE_ID);
    expect(result.id).toBe(INVOICE_ID);
    expect(result.items).toEqual([]);
    expect(result.payments).toEqual([]);
  });

  it("throws NOT_FOUND when invoice does not exist", async () => {
    mockDb.select.mockReturnValueOnce(chain([]));
    await expect(getInvoice(OWNER.userId, OWNER.role, INVOICE_ID)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------
describe("createInvoice", () => {
  it("creates invoice and items", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: CONTRACT_ID }])); // assertContractAccess
    mockDb.insert
      .mockReturnValueOnce(chain([mockInvoice])) // invoice
      .mockReturnValueOnce(chain([]));           // items
    const result = await createInvoice(OWNER.userId, OWNER.role, {
      contractId: CONTRACT_ID,
      billingPeriodStart: "2025-02-01",
      totalAmount: 3500000,
      items: [
        { itemType: "rent", description: "Tiền phòng tháng 2", quantity: 1, unitPriceSnapshot: 3000000, amount: 3000000 },
        { itemType: "electricity", description: "Tiền điện", quantity: 100, unitPriceSnapshot: 3500, amount: 350000 },
      ],
    });
    expect(result.id).toBe(INVOICE_ID);
  });

  it("throws FORBIDDEN when creating invoice for unauthorized contract", async () => {
    mockDb.select.mockReturnValueOnce(chain([])); // assertContractAccess fails
    await expect(
      createInvoice(OWNER.userId, OWNER.role, {
        contractId: "other-contract",
        billingPeriodStart: "2025-02-01",
        totalAmount: 1000000,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws VALIDATION_ERROR when billingPeriodStart is not 1st of month", async () => {
    await expect(
      createInvoice(OWNER.userId, OWNER.role, {
        contractId: CONTRACT_ID,
        billingPeriodStart: "2025-02-15",
        totalAmount: 1000000,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws VALIDATION_ERROR when totalAmount is negative", async () => {
    await expect(
      createInvoice(OWNER.userId, OWNER.role, {
        contractId: CONTRACT_ID,
        billingPeriodStart: "2025-02-01",
        totalAmount: -100,
        items: [],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// updateInvoiceStatus
// ---------------------------------------------------------------------------
describe("updateInvoiceStatus", () => {
  it("updates invoice status to paid", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockInvoice]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));
    mockDb.update.mockReturnValueOnce(chain([{ ...mockInvoice, status: "paid" }]));
    const result = await updateInvoiceStatus(OWNER.userId, OWNER.role, INVOICE_ID, "paid");
    expect(result.status).toBe("paid");
  });
});

// ---------------------------------------------------------------------------
// addPayment
// ---------------------------------------------------------------------------
describe("addPayment", () => {
  it("records payment and marks invoice paid when fully settled", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockInvoice])) // getInvoice
      .mockReturnValueOnce(chain([]))            // items
      .mockReturnValueOnce(chain([]));           // existing payments
    mockDb.insert.mockReturnValueOnce(
      chain([
        {
          id: "pay-1",
          invoiceId: INVOICE_ID,
          amount: 3500000,
          paidAt: new Date(),
          method: "bank_transfer",
          reference: "REF123",
          note: null,
          createdAt: new Date(),
        },
      ]),
    );
    mockDb.update.mockReturnValueOnce(chain([{ ...mockInvoice, status: "paid" }]));

    const result = await addPayment(OWNER.userId, OWNER.role, INVOICE_ID, {
      amount: 3500000,
      method: "bank_transfer",
      reference: "REF123",
    });
    expect(result.amount).toBe(3500000);
  });

  it("throws VALIDATION_ERROR when payment amount is <= 0", async () => {
    await expect(
      addPayment(OWNER.userId, OWNER.role, INVOICE_ID, {
        amount: 0,
        method: "cash",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("throws BUSINESS_RULE_ERROR when adding payment to a cancelled invoice", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([{ ...mockInvoice, status: "cancelled" }]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));
    await expect(
      addPayment(OWNER.userId, OWNER.role, INVOICE_ID, { amount: 100000, method: "cash" }),
    ).rejects.toMatchObject({ code: "BUSINESS_RULE_ERROR" });
  });

  it("throws VALIDATION_ERROR when payment exceeds remaining invoice balance", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockInvoice]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([{ id: "p-prev", invoiceId: INVOICE_ID, amount: 3000000, paidAt: new Date(), method: "cash", reference: null, note: null, createdAt: new Date() }]));
    await expect(
      addPayment(OWNER.userId, OWNER.role, INVOICE_ID, { amount: 600000, method: "cash" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ---------------------------------------------------------------------------
// batchGenerateInvoices
// ---------------------------------------------------------------------------
describe("batchGenerateInvoices", () => {
  it("batches invoices for active contracts", async () => {
    // 0. assertPropertyAccess
    mockDb.select.mockReturnValueOnce(chain([{ id: "prop-1" }]));
    // 1. activeContracts
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          id: "contract-1",
          roomId: "room-1",
          rentalPrice: 3000000,
          roomNumber: "101",
        },
      ]),
    );
    // 2. check existing invoice
    mockDb.select.mockReturnValueOnce(chain([]));
    // 3. check electricity meter reading
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          id: "meter-1",
          previousValue: "100",
          currentValue: "150",
          unitPriceSnapshot: 3800,
        },
      ]),
    );
    // 4. insert invoice
    mockDb.insert
      .mockReturnValueOnce(chain([mockInvoice])) // invoice
      .mockReturnValueOnce(chain([])); // invoiceItems

    const result = await batchGenerateInvoices(OWNER.userId, OWNER.role, {
      propertyId: "prop-1",
      billingPeriodStart: "2025-03-01",
    });

    expect(result.generatedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
  });

  it("skips when invoice already exists", async () => {
    mockDb.select.mockReturnValueOnce(chain([{ id: "prop-1" }])); // assertPropertyAccess
    mockDb.select.mockReturnValueOnce(
      chain([
        {
          id: "contract-1",
          roomId: "room-1",
          rentalPrice: 3000000,
          roomNumber: "101",
        },
      ]),
    );
    // existing invoice exists
    mockDb.select.mockReturnValueOnce(chain([{ id: "existing-inv" }]));

    const result = await batchGenerateInvoices(OWNER.userId, OWNER.role, {
      propertyId: "prop-1",
      billingPeriodStart: "2025-03-01",
    });

    expect(result.generatedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// deleteInvoice
// ---------------------------------------------------------------------------
describe("deleteInvoice", () => {
  it("allows owner to delete a draft invoice", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([{ ...mockInvoice, status: "draft" }]))
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));
    mockDb.delete.mockReturnValueOnce({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) });
    await expect(deleteInvoice(OWNER.userId, OWNER.role, INVOICE_ID)).resolves.toBeUndefined();
  });

  it("throws BUSINESS_RULE_ERROR when deleting non-draft invoice", async () => {
    mockDb.select
      .mockReturnValueOnce(chain([mockInvoice])) // status: issued
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([]));
    await expect(deleteInvoice(OWNER.userId, OWNER.role, INVOICE_ID)).rejects.toMatchObject({
      code: "BUSINESS_RULE_ERROR",
    });
  });
});
