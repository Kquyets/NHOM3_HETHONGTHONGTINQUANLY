/**
 * Client and service validation utilities for Vietnamese business inputs.
 */

export function validateVietnamesePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null; // optional if empty, but if provided must be valid

  const normalized = trimmed.replace(/[\s.-]/g, "");
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
  if (!phoneRegex.test(normalized)) {
    return "Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).";
  }
  return null;
}

export function validateCitizenId(citizenId: string): string | null {
  const trimmed = citizenId.trim();
  if (!trimmed) return null;

  const cccdRegex = /^(\d{9}|\d{12})$/;
  if (!cccdRegex.test(trimmed)) {
    return "Số CCCD/CMND không hợp lệ (cần đúng 9 số hoặc 12 số).";
  }
  return null;
}

export function validateDateRange(startDate: string, endDate?: string | null): string | null {
  if (!startDate || !startDate.trim()) return "Ngày bắt đầu không được để trống.";

  const start = new Date(startDate).getTime();
  if (isNaN(start)) return "Ngày bắt đầu không hợp lệ.";

  if (!endDate || !endDate.trim()) return null;

  const end = new Date(endDate).getTime();
  if (isNaN(end)) return "Ngày kết thúc không hợp lệ.";
  if (end < start) {
    return "Ngày kết thúc hợp đồng phải sau hoặc cùng ngày với ngày bắt đầu.";
  }

  return null;
}

export function validatePositiveNumber(
  value: string | number,
  fieldName = "Giá trị",
): string | null {
  if (typeof value === "number") {
    if (isNaN(value)) return `${fieldName} phải là một số hợp lệ.`;
    if (value <= 0) return `${fieldName} phải lớn hơn 0.`;
    return null;
  }
  const raw = String(value).trim();
  if (!raw) return `${fieldName} không được để trống.`;
  // Clean currency units and thousand separators (e.g. "3.000.000đ" -> "3000000")
  const cleaned = raw.replace(/[đ₫\s]/gi, "").replace(/\./g, "").replace(/,/g, ".");
  const num = Number(cleaned);
  if (isNaN(num)) {
    return `${fieldName} phải là một số hợp lệ.`;
  }
  if (num <= 0) {
    return `${fieldName} phải lớn hơn 0.`;
  }
  return null;
}
