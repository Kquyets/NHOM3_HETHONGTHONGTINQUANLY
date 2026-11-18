import { describe, expect, it } from "vitest";

import { ApiRequestError } from "./api-client";
import {
  formatAuthError,
  validateLoginForm,
  validateRegisterForm,
} from "./auth-form";

describe("auth-form helpers", () => {
  describe("validateLoginForm", () => {
    it("rejects empty or whitespace-only email or phone", () => {
      expect(validateLoginForm("   ", "secret")).toEqual({
        ok: false,
        error: "Vui lòng nhập địa chỉ email hoặc số điện thoại.",
      });
    });

    it("rejects malformed email address and phone", () => {
      expect(validateLoginForm("not-an-email", "secret")).toEqual({
        ok: false,
        error: "Địa chỉ email hoặc số điện thoại không đúng định dạng.",
      });
    });

    it("rejects empty password", () => {
      expect(validateLoginForm("owner@example.com", "")).toEqual({
        ok: false,
        error: "Vui lòng nhập mật khẩu.",
      });
    });

    it("returns trimmed email and password when valid", () => {
      expect(validateLoginForm("  owner.demo@example.com  ", "DemoPassword123!")).toEqual({
        ok: true,
        email: "owner.demo@example.com",
        password: "DemoPassword123!",
      });
    });

    it("accepts valid phone numbers for login", () => {
      expect(validateLoginForm("0912 345 678", "DemoPassword123!")).toEqual({
        ok: true,
        email: "0912 345 678",
        password: "DemoPassword123!",
      });
      expect(validateLoginForm("+84912345678", "DemoPassword123!")).toEqual({
        ok: true,
        email: "+84912345678",
        password: "DemoPassword123!",
      });
    });
  });

  describe("validateRegisterForm", () => {
    it("validates email, password length, and confirmation password", () => {
      expect(
        validateRegisterForm({
          email: "",
          password: "Password123!",
          confirmPassword: "Password123!",
        }),
      ).toEqual({ ok: false, error: "Vui lòng nhập địa chỉ email." });

      expect(
        validateRegisterForm({
          email: "bad-email",
          password: "Password123!",
          confirmPassword: "Password123!",
        }),
      ).toEqual({ ok: false, error: "Địa chỉ email không đúng định dạng." });

      expect(
        validateRegisterForm({
          email: "new@example.com",
          password: "short",
          confirmPassword: "short",
        }),
      ).toEqual({ ok: false, error: "Mật khẩu phải có ít nhất 8 ký tự." });

      expect(
        validateRegisterForm({
          email: "new@example.com",
          password: "Password123!",
          confirmPassword: "DifferentPassword!",
        }),
      ).toEqual({ ok: false, error: "Mật khẩu xác nhận không khớp." });

      expect(
        validateRegisterForm({
          email: "  new@example.com ",
          password: "Password123!",
          confirmPassword: "Password123!",
        }),
      ).toEqual({ ok: true, email: "new@example.com" });
    });
  });

  describe("formatAuthError", () => {
    it("translates common English API auth errors to Vietnamese", () => {
      expect(
        formatAuthError(
          new ApiRequestError("Invalid email or password.", "UNAUTHORIZED", 401),
          "Đăng nhập thất bại.",
        ),
      ).toBe("Số điện thoại / Gmail hoặc mật khẩu không chính xác.");

      expect(
        formatAuthError(
          new ApiRequestError("Account is disabled.", "FORBIDDEN", 403),
          "Đăng nhập thất bại.",
        ),
      ).toBe("Tài khoản của bạn đã bị vô hiệu hóa.");

      expect(
        formatAuthError(
          new ApiRequestError("Email already registered.", "CONFLICT", 409),
          "Đăng ký thất bại.",
        ),
      ).toBe("Email này đã được đăng ký.");

      expect(
        formatAuthError(
          new ApiRequestError("Email is required.", "VALIDATION_ERROR", 400),
          "Đăng nhập thất bại.",
        ),
      ).toBe("Vui lòng nhập số điện thoại hoặc email.");

      expect(
        formatAuthError(
          new ApiRequestError("Password is required.", "VALIDATION_ERROR", 400),
          "Đăng nhập thất bại.",
        ),
      ).toBe("Vui lòng nhập mật khẩu.");
    });

    it("maps fetch network errors and generic status errors safely", () => {
      expect(formatAuthError(new TypeError("Failed to fetch"), "Đăng nhập thất bại.")).toBe(
        "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
      );
      expect(
        formatAuthError(
          new ApiRequestError("Request failed with status 500", "API_ERROR", 500),
          "Đăng nhập thất bại. Vui lòng thử lại.",
        ),
      ).toBe("Đăng nhập thất bại. Vui lòng thử lại.");
      expect(formatAuthError("unknown", "Đăng nhập thất bại.")).toBe("Đăng nhập thất bại.");
    });
  });
});
