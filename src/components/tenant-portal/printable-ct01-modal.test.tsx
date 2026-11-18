import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { PrintableCt01Modal } from "./printable-ct01-modal";

describe("PrintableCt01Modal Component", () => {
  const mockTenant = {
    id: "t-1",
    userId: "u-1",
    fullName: "Phạm Quyết",
    phone: "0123123432",
    email: "phamquyet@gmail.com",
    birthDate: "1998-05-10",
    citizenId: "001201012345",
    hometown: "Nam Định",
    vehicleNumber: "29A-12345",
    emergencyContactName: "Bố",
    emergencyContactPhone: "0988776655",
    idCardFrontUrl: null,
    idCardBackUrl: null,
  };

  const mockStay = {
    contractId: "c-1",
    propertyName: "Nhà trọ Mới",
    propertyAddress: "Phú Hạ, Sóc Sơn, Hà Nội",
    roomId: "room-1",
    roomNumber: "1",
    monthlyRent: 2500000,
    deposit: 2500000,
    contractStatus: "active" as const,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    bankAccount: "8866918233",
    bankCode: "MB",
    accountHolder: "PHAM QUYET",
  };

  it("does not render markup when isOpen is false", () => {
    const markup = renderToStaticMarkup(
      <PrintableCt01Modal
        isOpen={false}
        tenant={mockTenant}
        stay={mockStay}
        onClose={vi.fn()}
      />
    );

    expect(markup).toBe("");
  });

  it("renders correctly with prefilled tenant and room information", () => {
    const markup = renderToStaticMarkup(
      <PrintableCt01Modal
        isOpen={true}
        tenant={mockTenant}
        stay={mockStay}
        onClose={vi.fn()}
      />
    );

    expect(markup).toContain("TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ");
    expect(markup).toContain("Mẫu CT01");
    expect(markup).toContain("Phạm Quyết");
    expect(markup).toContain("001201012345");
    expect(markup).toContain("Nam Định");
    expect(markup).toContain("29A-12345");
    expect(markup).toContain("Nhà trọ Mới");
    expect(markup).toContain("Phú Hạ, Sóc Sơn, Hà Nội");
  });
});
