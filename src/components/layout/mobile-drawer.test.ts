import { describe, it, expect } from "vitest";
import {
  getDrawerMenuItems,
  OWNER_MANAGER_MENU_ITEMS,
  TENANT_MENU_ITEMS,
} from "./mobile-drawer";

describe("MobileDrawer role-based menu items", () => {
  it("provides tailored menu items for tenant role", () => {
    const items = getDrawerMenuItems("tenant");
    expect(items).toEqual(TENANT_MENU_ITEMS);
    expect(items).toHaveLength(3);

    const labels = items.map((i) => i.label);
    expect(labels).toEqual(["Cổng thông tin", "Trợ lý AI", "Cài đặt & Hồ sơ"]);

    // Must NOT contain redundant section anchors or landlord administration items
    expect(labels).not.toContain("Hóa đơn phòng");
    expect(labels).not.toContain("Điện & Nước");
    expect(labels).not.toContain("Báo sự cố & Sửa chữa");
    expect(labels).not.toContain("Nhà trọ & Phòng");
    expect(labels).not.toContain("Khách thuê");
    expect(labels).not.toContain("Nhân viên");
  });

  it("provides full administration menu with Staff management for owner role", () => {
    const items = getDrawerMenuItems("owner");
    const labels = items.map((i) => i.label);

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Nhà trọ & Phòng");
    expect(labels).toContain("Khách thuê");
    expect(labels).toContain("Hợp đồng");
    expect(labels).toContain("Điện & Nước");
    expect(labels).toContain("Hoá đơn");
    expect(labels).toContain("Giao dịch");
    expect(labels).toContain("Sự cố & Sửa chữa");
    expect(labels).toContain("Nhân viên");
    expect(labels).toContain("Trợ lý AI");
    expect(labels).toContain("Cài đặt & Hồ sơ");
  });

  it("provides administration menu excluding Staff management for manager role", () => {
    const items = getDrawerMenuItems("manager");
    const labels = items.map((i) => i.label);

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Nhà trọ & Phòng");
    expect(labels).toContain("Khách thuê");
    expect(labels).toContain("Hợp đồng");
    expect(labels).toContain("Điện & Nước");
    expect(labels).toContain("Hoá đơn");
    expect(labels).toContain("Giao dịch");
    expect(labels).toContain("Sự cố & Sửa chữa");

    // Managers cannot manage other staff members
    expect(labels).not.toContain("Nhân viên");
  });
});
