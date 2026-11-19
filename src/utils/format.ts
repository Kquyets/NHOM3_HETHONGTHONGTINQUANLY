/**
 * Formatting utilities for Vietnamese currency and telephone numbers.
 */

/**
 * Formats a number to Vietnamese currency format with dot separators and "đ" suffix.
 * Examples: 1.000.000đ, 100.000đ, 10.000.000đ
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "0đ";
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return "0đ";
  const rounded = Math.round(num);
  return `${new Intl.NumberFormat("vi-VN").format(rounded)}đ`;
}

/**
 * Drop-in replacement for `new Intl.NumberFormat(...)` with `.format(amount)`
 */
export const money = {
  format: (amount: number | string | null | undefined): string => formatCurrency(amount),
};

/**
 * Formats a phone number into the standard dot-separated 4-3-3 pattern: 0xxx.xxx.xxx
 * Examples:
 * - "0123123123" -> "0123.123.123"
 * - "0912345678" -> "0912.345.678"
 * - "0912 345 678" -> "0912.345.678"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  }

  return trimmed;
}

/**
 * Formats user input as dot-separated thousands for numeric inputs.
 * Examples:
 * - "3000000" -> "3.000.000"
 * - "3.000.000" -> "3.000.000"
 * - "" -> ""
 */
export function formatNumberWithDots(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const digits = String(val).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(digits));
}
