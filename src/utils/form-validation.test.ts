import { describe, it, expect } from "vitest";
import {
  validateVietnamesePhone,
  validateCitizenId,
  validateDateRange,
  validatePositiveNumber,
} from "./form-validation";

describe("form-validation", () => {
  describe("validateVietnamesePhone", () => {
    it("returns null for valid Vietnamese phone numbers", () => {
      expect(validateVietnamesePhone("0912345678")).toBeNull();
      expect(validateVietnamesePhone("0389998888")).toBeNull();
      expect(validateVietnamesePhone("0868123456")).toBeNull();
      expect(validateVietnamesePhone("0701234567")).toBeNull();
      expect(validateVietnamesePhone("0521234567")).toBeNull();
      expect(validateVietnamesePhone("")).toBeNull();
    });

    it("returns error message for invalid phone numbers", () => {
      expect(validateVietnamesePhone("123456")).not.toBeNull();
      expect(validateVietnamesePhone("0212345678")).not.toBeNull();
      expect(validateVietnamesePhone("09123456789")).not.toBeNull(); // 11 digits
      expect(validateVietnamesePhone("abcdefghij")).not.toBeNull();
    });
  });

  describe("validateCitizenId", () => {
    it("returns null for valid 9 or 12 digit IDs", () => {
      expect(validateCitizenId("001202012345")).toBeNull(); // 12 digits
      expect(validateCitizenId("123456789")).toBeNull(); // 9 digits
      expect(validateCitizenId("")).toBeNull();
    });

    it("returns error for invalid IDs", () => {
      expect(validateCitizenId("12345")).not.toBeNull();
      expect(validateCitizenId("0012020123456")).not.toBeNull(); // 13 digits
      expect(validateCitizenId("12345678A")).not.toBeNull();
    });
  });

  describe("validateDateRange", () => {
    it("returns null when start is valid and end is null or after start", () => {
      expect(validateDateRange("2026-01-01", null)).toBeNull();
      expect(validateDateRange("2026-01-01", "2026-12-31")).toBeNull();
      expect(validateDateRange("2026-01-01", "2026-01-01")).toBeNull();
    });

    it("returns error if start is missing or invalid", () => {
      expect(validateDateRange("")).not.toBeNull();
      expect(validateDateRange("invalid-date")).not.toBeNull();
    });

    it("returns error if end date is earlier than start date", () => {
      const error = validateDateRange("2026-06-01", "2026-01-01");
      expect(error).toContain("sau hoặc cùng ngày");
    });
  });

  describe("validatePositiveNumber", () => {
    it("validates positive numbers correctly", () => {
      expect(validatePositiveNumber(100)).toBeNull();
      expect(validatePositiveNumber("2500000", "Giá phòng")).toBeNull();
      expect(validatePositiveNumber("3.000.000", "Tiền thuê")).toBeNull();
      expect(validatePositiveNumber("3.000.000đ", "Tiền cọc")).toBeNull();
      expect(validatePositiveNumber("25,5", "Diện tích")).toBeNull();
    });

    it("rejects zero, negative numbers, or non-numeric strings", () => {
      expect(validatePositiveNumber(0, "Giá phòng")).toContain("lớn hơn 0");
      expect(validatePositiveNumber(-10, "Giá phòng")).toContain("lớn hơn 0");
      expect(validatePositiveNumber("abc", "Giá phòng")).toContain("số hợp lệ");
    });
  });
});
