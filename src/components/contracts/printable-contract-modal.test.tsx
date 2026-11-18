import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrintableContractModal } from "./printable-contract-modal";
import type { ContractRow } from "../../modules/contracts/contract.service";

describe("PrintableContractModal display guards", () => {
  it("does not render markup when contract is null and initialTemplate is rental", () => {
    const markup = renderToStaticMarkup(
      <PrintableContractModal contract={null} initialTemplate="rental" onClose={() => {}} />,
    );
    expect(markup).toBe("");
  });

  it("does not render markup by default when contract is null without initialTemplate", () => {
    const markup = renderToStaticMarkup(
      <PrintableContractModal contract={null} onClose={() => {}} />,
    );
    expect(markup).toBe("");
  });

  it("renders service contract template when initialTemplate is service even if contract is null", () => {
    const markup = renderToStaticMarkup(
      <PrintableContractModal contract={null} initialTemplate="service" onClose={() => {}} />,
    );
    expect(markup).toContain("HỢP ĐỒNG CUNG CẤP DỊCH VỤ");
    expect(markup).toContain("HMANAGERS");
  });

  it("renders rental contract template when valid contract is provided", () => {
    const mockContract: ContractRow = {
      id: "contract-12345678",
      propertyName: "Nhà trọ HManagers",
      propertyAddress: "123 Đường Số 1, Hà Nội",
      roomId: "room-1",
      roomNumber: "101",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      monthlyRentSnapshot: 3500000,
      depositSnapshot: 3500000,
      status: "active",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      tenants: [
        {
          id: "tenant-1",
          fullName: "Nguyễn Văn A",
          phone: "0912345678",
          citizenId: "012345678901",
        },
      ],
    };

    const markup = renderToStaticMarkup(
      <PrintableContractModal contract={mockContract} initialTemplate="rental" onClose={() => {}} />,
    );

    expect(markup).toContain("HỢP ĐỒNG THUÊ PHÒNG TRỌ");
    expect(markup).toContain("Nguyễn Văn A");
    expect(markup).toContain("101");
    expect(markup).toContain("3.500.000");
  });
});
