import { describe, it, expect, vi, beforeEach } from "vitest";
import { processAiQuery } from "./ai.service";
import * as aiTools from "./ai-tools";

vi.mock("./ai-tools", () => ({
  toolGetOverviewStats: vi.fn(),
  toolLookupRooms: vi.fn(),
  toolLookupContracts: vi.fn(),
  toolLookupUnpaidInvoices: vi.fn(),
  toolLookupMaintenanceRequests: vi.fn(),
  toolLookupTenants: vi.fn(),
}));

describe("AI Service (Phase 6 AI Assistant)", () => {
  const mockCtx = {
    userId: "user-owner-1",
    role: "owner",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns greeting and suggested prompts for general queries", async () => {
    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Xin chào bạn có thể giúp gì?",
    });

    expect(result.reply).toContain("Trợ lý AI Quản lý Nhà trọ");
    expect(result.toolsUsed).toHaveLength(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("handles room lookup query for a specific room", async () => {
    vi.mocked(aiTools.toolLookupRooms).mockResolvedValueOnce({
      totalMatched: 1,
      rooms: [
        {
          propertyId: "prop-1",
          propertyName: "Nhà trọ Bình An",
          roomId: "room-101",
          roomNumber: "101",
          monthlyRent: 3500000,
          areaM2: "25",
          status: "ready",
          isOccupied: true,
          tenantName: "Nguyễn Văn Tuấn",
          tenantPhone: "0901234567",
          contractEndDate: "2026-12-31",
        },
      ],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Phòng 101 đang ai thuê?",
    });

    expect(aiTools.toolLookupRooms).toHaveBeenCalledWith(
      expect.objectContaining({ userId: mockCtx.userId, role: mockCtx.role }),
      expect.objectContaining({ roomNumber: "101" }),
    );
    expect(result.toolsUsed).toContain("lookup_rooms");
    expect(result.reply).toContain("Phòng 101");
    expect(result.reply).toContain("Nguyễn Văn Tuấn");
    expect(result.reply).toContain("0901234567");
  });

  it("handles vacant rooms query", async () => {
    vi.mocked(aiTools.toolLookupRooms).mockResolvedValueOnce({
      totalMatched: 2,
      rooms: [
        {
          propertyId: "prop-1",
          propertyName: "Nhà trọ Bình An",
          roomId: "room-102",
          roomNumber: "102",
          monthlyRent: 3000000,
          areaM2: "20",
          status: "ready",
          isOccupied: false,
          tenantName: null,
          tenantPhone: null,
          contractEndDate: null,
        },
      ],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Có những phòng nào đang trống?",
    });

    expect(result.toolsUsed).toContain("lookup_rooms");
    expect(result.reply).toContain("Danh sách phòng đang trống");
    expect(result.reply).toContain("Phòng 102");
  });

  it("handles unpaid invoices query and formats debt accurately", async () => {
    vi.mocked(aiTools.toolLookupUnpaidInvoices).mockResolvedValueOnce({
      totalUnpaidInvoices: 2,
      totalDebtAmount: 7000000,
      invoices: [
        {
          invoiceId: "inv-1",
          propertyName: "Nhà trọ Bình An",
          roomNumber: "201",
          tenantName: "Lê Thị Lan",
          tenantPhone: "0912345678",
          billingPeriod: "2026-10-01",
          dueDate: "2026-10-10",
          status: "issued",
          totalAmount: 4000000,
          paidAmount: 0,
          remainingDebt: 4000000,
        },
      ],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Tháng này có bao nhiêu phòng chưa thanh toán tiền?",
    });

    expect(aiTools.toolLookupUnpaidInvoices).toHaveBeenCalled();
    expect(result.toolsUsed).toContain("lookup_unpaid_invoices");
    expect(result.reply).toContain("Phòng 201");
    expect(result.reply).toContain("Lê Thị Lan");
  });

  it("handles contracts expiration query", async () => {
    vi.mocked(aiTools.toolLookupContracts).mockResolvedValueOnce({
      totalMatched: 1,
      contracts: [
        {
          contractId: "c-1",
          propertyName: "Nhà trọ Bình An",
          roomNumber: "301",
          status: "active",
          startDate: "2026-01-01",
          endDate: "2026-10-25",
          daysRemaining: 21,
          monthlyRent: 4500000,
          deposit: 4500000,
          primaryTenant: "Trần Minh",
          tenantPhone: "0988776655",
          roommates: ["Hoàng Yến"],
        },
      ],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Hợp đồng nào sắp hết hạn trong 30 ngày?",
    });

    expect(aiTools.toolLookupContracts).toHaveBeenCalledWith(
      expect.objectContaining({ userId: mockCtx.userId }),
      expect.objectContaining({ expiringWithinDays: 30 }),
    );
    expect(result.toolsUsed).toContain("lookup_contracts");
    expect(result.reply).toContain("Phòng 301");
    expect(result.reply).toContain("Trần Minh");
  });

  it("handles revenue and financial overview query", async () => {
    vi.mocked(aiTools.toolGetOverviewStats).mockResolvedValueOnce({
      occupancy: {
        totalRooms: 10,
        occupiedRooms: 9,
        vacantRooms: 1,
        maintenanceRooms: 0,
        occupancyRate: "90%",
      },
      financial: {
        totalBilled: 35000000,
        totalCollected: 30000000,
        totalDebt: 5000000,
        unpaidInvoiceCount: 2,
        collectionRate: "85.7%",
      },
      utility: {
        electricityKwh: 1250,
        waterM3: 45,
      },
      expiringContractsCount: 1,
      urgentExpiringContracts: [],
      unpaidInvoices: [],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Doanh thu tháng này là bao nhiêu?",
    });

    expect(aiTools.toolGetOverviewStats).toHaveBeenCalled();
    expect(result.toolsUsed).toContain("get_overview_stats");
    expect(result.reply).toContain("Báo cáo Thống kê");
    expect(result.reply).toContain("90%");
  });

  it("handles maintenance requests query", async () => {
    vi.mocked(aiTools.toolLookupMaintenanceRequests).mockResolvedValueOnce({
      totalMatched: 1,
      requests: [
        {
          id: "m-1",
          propertyName: "Nhà trọ Bình An",
          roomNumber: "202",
          tenantName: "Phạm Bình",
          tenantPhone: "0933221100",
          title: "Hỏng bóng đèn phòng tắm",
          category: "electrical",
          priority: "high",
          status: "pending",
          createdAt: new Date(),
        },
      ],
    });

    const result = await processAiQuery({
      userId: mockCtx.userId,
      role: mockCtx.role,
      message: "Có sự cố sửa chữa nào chưa giải quyết không?",
    });

    expect(aiTools.toolLookupMaintenanceRequests).toHaveBeenCalled();
    expect(result.toolsUsed).toContain("lookup_maintenance_requests");
    expect(result.reply).toContain("Hỏng bóng đèn phòng tắm");
    expect(result.reply).toContain("Phòng 202");
  });
});
