/**
 * VietQR utility module for generating NAPAS 247 compliant payment QR codes.
 * Conforms to the standard VietQR quick-link format accepted by all Vietnamese banks & e-wallets.
 */

export type BankInfo = {
  code: string;       // e.g. "MB", "VCB", "TCB"
  shortName: string;  // e.g. "MBBank", "Vietcombank", "Techcombank"
  name: string;       // Full Vietnamese name
  bin: string;        // NAPAS BIN code (e.g. "970422")
};

export const VIETNAMESE_BANKS: BankInfo[] = [
  { code: "MB", shortName: "MBBank", name: "Ngân hàng TMCP Quân Đội", bin: "970422" },
  { code: "VCB", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam", bin: "970436" },
  { code: "TCB", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ Thương Việt Nam", bin: "970407" },
  { code: "BIDV", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", bin: "970418" },
  { code: "ICB", shortName: "VietinBank", name: "Ngân hàng TMCP Công Thương Việt Nam", bin: "970415" },
  { code: "VPB", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", bin: "970432" },
  { code: "ACB", shortName: "ACB", name: "Ngân hàng TMCP Á Châu", bin: "970416" },
  { code: "TPB", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong", bin: "970458" },
  { code: "STB", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", bin: "970403" },
  { code: "HDB", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển TP.HCM", bin: "970437" },
  { code: "VIB", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam", bin: "970441" },
  { code: "SHB", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", bin: "970443" },
  { code: "MSB", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", bin: "970426" },
  { code: "OCB", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông", bin: "970448" },
  { code: "LPB", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", bin: "970449" },
  { code: "VBA", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn", bin: "970405" },
  { code: "SEAB", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", bin: "970440" },
  { code: "BAB", shortName: "BacABank", name: "Ngân hàng TMCP Bắc Á", bin: "970409" },
  { code: "ABB", shortName: "AnBinhBank", name: "Ngân hàng TMCP An Bình", bin: "970425" },
  { code: "CAKE", shortName: "Cake by VPBank", name: "Ngân hàng số Cake by VPBank", bin: "546034" },
  { code: "TIMO", shortName: "Timo", name: "Ngân hàng số Timo by BVBank", bin: "963388" },
  { code: "BVB", shortName: "BVBank", name: "Ngân hàng TMCP Bản Việt", bin: "970454" },
];

/**
 * Remove Vietnamese diacritics / tones from string.
 * Converts "Tiền phòng tháng 10" -> "Tien phong thang 10" for banking gateway safety.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  let result = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  result = result.replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"));
  // Remove non-alphanumeric characters except basic punctuation and spaces
  result = result.replace(/[^a-zA-Z0-9\s-_.]/g, "");
  return result.replace(/\s+/g, " ").trim();
}

export type GenerateVietQrOptions = {
  bankCode: string;
  bankAccount: string;
  accountHolder?: string | null;
  amount: number;
  description?: string | null;
  template?: "compact" | "compact2" | "qr_only" | "print";
};

/**
 * Generates the official VietQR Napas URL.
 * Example: https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=3500000&addInfo=PHONG%20101%20TT%20TIEN%20PHONG%20T10&accountName=NGUYEN%20VAN%20A
 */
export function buildVietQrUrl({
  bankCode,
  bankAccount,
  accountHolder,
  amount,
  description,
  template = "compact2",
}: GenerateVietQrOptions): string {
  const cleanBank = bankCode.trim().toUpperCase();
  const cleanAccount = bankAccount.trim().replace(/\s+/g, "");
  const cleanAmount = Math.max(0, Math.round(amount));

  const url = new URL(`https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-${template}.png`);

  if (cleanAmount > 0) {
    url.searchParams.set("amount", cleanAmount.toString());
  }

  if (description) {
    const cleanDesc = removeVietnameseTones(description);
    if (cleanDesc) {
      url.searchParams.set("addInfo", cleanDesc);
    }
  }

  if (accountHolder) {
    const cleanHolder = removeVietnameseTones(accountHolder).toUpperCase();
    if (cleanHolder) {
      url.searchParams.set("accountName", cleanHolder);
    }
  }

  return url.toString();
}

/**
 * Returns bank information by code or shortName.
 */
export function getBankInfo(bankCodeOrName: string): BankInfo | undefined {
  const upper = bankCodeOrName.trim().toUpperCase();
  return VIETNAMESE_BANKS.find(
    (b) => b.code.toUpperCase() === upper || b.shortName.toUpperCase() === upper,
  );
}
