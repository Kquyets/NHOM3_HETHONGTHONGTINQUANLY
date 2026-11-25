import { describe, it, expect, vi, beforeEach } from "vitest";
import { listTransactions } from "./transaction.service";
import * as propertyService from "../properties/property.service";
import * as dbClient from "../../lib/database/client";

vi.mock("../properties/property.service", () => ({
  listProperties: vi.fn(),
}));

vi.mock("../../lib/database/client", () => ({
  getDatabase: vi.fn(),
}));

describe("Transaction Service", () => {
  const mockProperties = [
    { id: "prop-1", name: "Nhà trọ Hòa Lạc", ownerId: "owner-1" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result if user has no accessible properties", async () => {
    vi.mocked(propertyService.listProperties).mockResolvedValueOnce([]);

    const result = await listTransactions("owner-1", "owner");
    expect(result.transactions).toHaveLength(0);
    expect(result.stats.totalIncome).toBe(0);
    expect(result.stats.totalExpense).toBe(0);
    expect(result.stats.netCashflow).toBe(0);
  });

  it("calculates income and expenses correctly and computes net cashflow", async () => {
    vi.mocked(propertyService.listProperties).mockResolvedValueOnce(
      mockProperties as unknown as Awaited<ReturnType<typeof propertyService.listProperties>>,
    );

    const mockIncomeRows = [
      {
        paymentId: "pay-1",
        amount: 3000000,
        paidAt: new Date("2026-11-10T10:00:00Z"),
        method: "bank_transfer",
        reference: "VQR123",
        note: "Tiền phòng P.101 tháng 11",
        propertyId: "prop-1",
        propertyName: "Nhà trọ Hòa Lạc",
        roomId: "room-1",
        roomNumber: "101",
      },
    ];

    const mockExpenseRows = [
      {
        id: "maint-1",
        cost: 500000,
        payer: "owner",
        category: "plumbing",
        title: "Thay vòi nước bồn rửa",
        contractorName: "Thợ nước A",
        resolvedAt: new Date("2026-11-12T14:00:00Z"),
        createdAt: new Date("2026-11-11T08:00:00Z"),
        propertyId: "prop-1",
        propertyName: "Nhà trọ Hòa Lạc",
        roomId: "room-1",
        roomNumber: "101",
      },
    ];

    const chain = (resolved: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(resolved),
    });

    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(chain(mockIncomeRows))
        .mockReturnValueOnce(chain(mockExpenseRows)),
    } as unknown as ReturnType<typeof dbClient.getDatabase>;

    vi.mocked(dbClient.getDatabase).mockReturnValue(mockDb);

    const result = await listTransactions("owner-1", "owner");

    expect(result.transactions).toHaveLength(2);
    expect(result.stats.totalIncome).toBe(3000000);
    expect(result.stats.totalExpense).toBe(500000);
    expect(result.stats.netCashflow).toBe(2500000);
    expect(result.stats.transactionCount).toBe(2);

    // Latest transaction should be first
    expect(result.transactions[0].id).toBe("maint-1");
    expect(result.transactions[1].id).toBe("pay-1");
  });

  it("filters transactions by type (income only)", async () => {
    vi.mocked(propertyService.listProperties).mockResolvedValueOnce(
      mockProperties as unknown as Awaited<ReturnType<typeof propertyService.listProperties>>,
    );

    const mockIncomeRows = [
      {
        paymentId: "pay-1",
        amount: 2000000,
        paidAt: new Date("2026-11-10T10:00:00Z"),
        method: "cash",
        reference: null,
        note: null,
        propertyId: "prop-1",
        propertyName: "Nhà trọ Hòa Lạc",
        roomId: "room-1",
        roomNumber: "101",
      },
    ];

    const mockExpenseRows = [
      {
        id: "maint-1",
        cost: 300000,
        payer: "owner",
        category: "electrical",
        title: "Sửa ổ cắm",
        contractorName: null,
        resolvedAt: new Date("2026-11-12T14:00:00Z"),
        createdAt: new Date("2026-11-11T08:00:00Z"),
        propertyId: "prop-1",
        propertyName: "Nhà trọ Hòa Lạc",
        roomId: "room-1",
        roomNumber: "101",
      },
    ];

    const chain = (resolved: unknown[]) => ({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(resolved),
    });

    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(chain(mockIncomeRows))
        .mockReturnValueOnce(chain(mockExpenseRows)),
    } as unknown as ReturnType<typeof dbClient.getDatabase>;

    vi.mocked(dbClient.getDatabase).mockReturnValue(mockDb);

    const result = await listTransactions("owner-1", "owner", { type: "income" });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].type).toBe("income");
    expect(result.stats.totalIncome).toBe(2000000);
    expect(result.stats.totalExpense).toBe(0);
  });
});
