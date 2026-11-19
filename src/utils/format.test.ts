import { describe, it, expect } from "vitest";
import { formatCurrency, formatPhoneNumber, money } from "./format";

describe("format utility", () => {
  describe("formatCurrency", () => {
    it("formats amounts with dot separators and trailing đ", () => {
      expect(formatCurrency(1000000)).toBe("1.000.000đ");
      expect(formatCurrency(100000)).toBe("100.000đ");
      expect(formatCurrency(10000000)).toBe("10.000.000đ");
      expect(formatCurrency(3500000)).toBe("3.500.000đ");
      expect(formatCurrency(0)).toBe("0đ");
      expect(formatCurrency("250000")).toBe("250.000đ");
      expect(formatCurrency(null)).toBe("0đ");
      expect(formatCurrency(undefined)).toBe("0đ");
    });

    it("works through money.format drop-in object", () => {
      expect(money.format(1000000)).toBe("1.000.000đ");
      expect(money.format(100000)).toBe("100.000đ");
    });
  });

  describe("formatPhoneNumber", () => {
    it("formats 10-digit phone numbers into 0xxx.xxx.xxx pattern", () => {
      expect(formatPhoneNumber("0123123123")).toBe("0123.123.123");
      expect(formatPhoneNumber("0912345678")).toBe("0912.345.678");
      expect(formatPhoneNumber("0912 345 678")).toBe("0912.345.678");
      expect(formatPhoneNumber("0912.345.678")).toBe("0912.345.678");
    });

    it("handles null, empty and non-standard inputs gracefully", () => {
      expect(formatPhoneNumber(null)).toBe("");
      expect(formatPhoneNumber("")).toBe("");
      expect(formatPhoneNumber("123")).toBe("123");
    });
  });
});
