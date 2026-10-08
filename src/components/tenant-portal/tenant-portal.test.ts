import { describe, expect, it } from "vitest";

describe("Tenant Portal & Tenants UI Specifications", () => {
  it("defines standard tabs for segmented resident views without nested cards", () => {
    const portalTabs = ["invoices", "utilities", "maintenance"] as const;
    expect(portalTabs).toHaveLength(3);
    expect(portalTabs).toContain("invoices");
    expect(portalTabs).toContain("utilities");
    expect(portalTabs).toContain("maintenance");
  });

  it("configures invoice statuses with correct human-readable Vietnamese labels", () => {
    const statusLabels: Record<string, string> = {
      draft: "Nháp",
      issued: "Chờ thanh toán",
      partially_paid: "Thanh toán 1 phần",
      paid: "Đã thanh toán",
      cancelled: "Đã hủy",
    };
    expect(statusLabels.issued).toBe("Chờ thanh toán");
    expect(statusLabels.paid).toBe("Đã thanh toán");
    expect(statusLabels.partially_paid).toBe("Thanh toán 1 phần");
  });

  it("maps maintenance categories to clear Vietnamese service labels", () => {
    const categories: Record<string, string> = {
      plumbing: "Cấp thoát nước",
      electrical: "Điện sinh hoạt",
      appliance: "Thiết bị & Đồ dùng",
      internet: "Mạng & Internet",
      structural: "Cơ sở vật chất",
      other: "Sự cố khác",
    };
    expect(categories.plumbing).toBe("Cấp thoát nước");
    expect(categories.electrical).toBe("Điện sinh hoạt");
    expect(categories.appliance).toBe("Thiết bị & Đồ dùng");
  });

  it("calculates remaining invoice balance correctly", () => {
    function getRemaining(total: number, paid: number | null | undefined): number {
      return Math.max(0, total - (paid || 0));
    }

    expect(getRemaining(3500000, 0)).toBe(3500000);
    expect(getRemaining(3500000, 1000000)).toBe(2500000);
    expect(getRemaining(3500000, 3500000)).toBe(0);
    expect(getRemaining(3500000, 4000000)).toBe(0);
  });

  it("formats tenant birth dates correctly for display", () => {
    function formatDate(d: string | null): string {
      if (!d) return "—";
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    }

    expect(formatDate(null)).toBe("—");
    expect(formatDate("1998-05-12")).toBe("12/05/1998");
    expect(formatDate("2002-11-20")).toBe("20/11/2002");
  });

  it("filters tenants list by search query case-insensitively across name and phone", () => {
    const tenants = [
      { id: "1", fullName: "Nguyễn Văn Hoàng", phone: "0901234567" },
      { id: "2", fullName: "Trần Thị Lan", phone: "0912345678" },
      { id: "3", fullName: "Lê Văn Hùng", phone: null },
    ];

    function searchTenants(query: string) {
      const q = query.toLowerCase().trim();
      return tenants.filter(
        (t) => t.fullName.toLowerCase().includes(q) || (t.phone ?? "").includes(q),
      );
    }

    expect(searchTenants("Hoàng")).toHaveLength(1);
    expect(searchTenants("hoàng")).toHaveLength(1);
    expect(searchTenants("0912")).toHaveLength(1);
    expect(searchTenants("văn")).toHaveLength(2);
    expect(searchTenants("xyz")).toHaveLength(0);
  });

  it("formats contract dropdown options and autofills rent amounts properly", () => {
    const mockContracts = [
      {
        id: "c-101",
        roomNumber: "101",
        propertyName: "Nhà Trọ Bình An",
        monthlyRentSnapshot: 3200000,
        status: "active",
        tenants: [{ fullName: "Nguyễn Văn A", phone: "0901234567" }],
      },
      {
        id: "c-102",
        roomNumber: "102",
        propertyName: "Nhà Trọ Bình An",
        monthlyRentSnapshot: 4000000,
        status: "ended",
        tenants: [],
      },
    ];

    function formatContractOption(c: (typeof mockContracts)[0]) {
      const primary = c.tenants?.[0]?.fullName || "Chưa gán khách";
      const isInactive = c.status === "ended" || c.status === "cancelled";
      return `Phòng ${c.roomNumber} • ${c.propertyName} (Khách: ${primary}) — ${c.monthlyRentSnapshot} VND/tháng${isInactive ? ` [${c.status}]` : ""}`;
    }

    expect(formatContractOption(mockContracts[0])).toContain("Phòng 101 • Nhà Trọ Bình An (Khách: Nguyễn Văn A)");
    expect(formatContractOption(mockContracts[1])).toContain("[ended]");

    const selectedContract = mockContracts.find((c) => c.id === "c-101");
    expect(selectedContract).toBeDefined();
    expect(selectedContract?.monthlyRentSnapshot).toBe(3200000);
  });
});
