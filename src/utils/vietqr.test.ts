import { describe, it, expect } from "vitest";
import {
  buildVietQrUrl,
  formatBankDisplayName,
  getBankInfo,
  removeVietnameseTones,
  VIETNAMESE_BANKS,
} from "./vietqr";

describe("VietQR Utility", () => {
  it("removes Vietnamese tones and diacritics cleanly", () => {
    expect(removeVietnameseTones("Tiền phòng tháng 10 năm 2026")).toBe(
      "Tien phong thang 10 nam 2026",
    );
    expect(removeVietnameseTones("Nguyễn Đức Đại")).toBe("Nguyen Duc Dai");
    expect(removeVietnameseTones("ĐẶNG THỊ THU")).toBe("DANG THI THU");
  });

  it("handles empty or special strings in removeVietnameseTones", () => {
    expect(removeVietnameseTones("")).toBe("");
    expect(removeVietnameseTones("Phòng #102 @Cầu Giấy!")).toBe("Phong 102 Cau Giay");
  });

  it("builds a standard VietQR Napas URL with all parameters", () => {
    const url = buildVietQrUrl({
      bankCode: "MB",
      bankAccount: "0987654321",
      accountHolder: "Nguyễn Văn Quyết",
      amount: 3500000,
      description: "Phòng 101 TT tiền phòng T10",
      template: "compact2",
    });

    expect(url).toContain("https://img.vietqr.io/image/MB-0987654321-compact2.png");
    expect(url).toContain("amount=3500000");
    expect(url).toContain("accountName=NGUYEN+VAN+QUYET");
    expect(url).toContain("addInfo=Phong+101+TT+tien+phong+T10");
  });

  it("builds a VietQR URL without description or accountHolder", () => {
    const url = buildVietQrUrl({
      bankCode: "vcb",
      bankAccount: "0123456789 ",
      amount: 2000000,
    });

    expect(url).toBe("https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=2000000");
  });

  it("finds bank info correctly by code or shortName", () => {
    const mb = getBankInfo("MB");
    expect(mb).toBeDefined();
    expect(mb?.shortName).toBe("MBBank");

    const vcb = getBankInfo("Vietcombank");
    expect(vcb).toBeDefined();
    expect(vcb?.code).toBe("VCB");

    const unknown = getBankInfo("UNKNOWN_BANK");
    expect(unknown).toBeUndefined();

    // Check robust handling of variations, nulls, and undefined
    expect(getBankInfo("mbbank")?.code).toBe("MB");
    expect(getBankInfo("MB Bank")?.code).toBe("MB");
    expect(getBankInfo(undefined)).toBeUndefined();
    expect(getBankInfo("undefined")).toBeUndefined();
    expect(getBankInfo("")).toBeUndefined();
  });

  it("formats friendly bank display name avoiding undefined string outputs", () => {
    expect(formatBankDisplayName("MB")).toContain("MBBank");
    expect(formatBankDisplayName("mbbank")).toContain("MBBank");
    expect(formatBankDisplayName("undefined")).toBe("MB Bank (Ngân hàng TMCP Quân Đội)");
    expect(formatBankDisplayName(undefined)).toBe("MB Bank (Ngân hàng TMCP Quân Đội)");
    expect(formatBankDisplayName(null)).toBe("MB Bank (Ngân hàng TMCP Quân Đội)");
    expect(formatBankDisplayName("VCB")).toContain("Vietcombank");
  });

  it("exports a non-empty list of recognized Vietnamese banks", () => {
    expect(VIETNAMESE_BANKS.length).toBeGreaterThan(15);
  });
});
