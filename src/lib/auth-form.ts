const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid email or password.": "Số điện thoại / Gmail hoặc mật khẩu không chính xác.",
  "Account is disabled.": "Tài khoản của bạn đã bị vô hiệu hóa.",
  "Email is required.": "Vui lòng nhập số điện thoại hoặc email.",
  "Password is required.": "Vui lòng nhập mật khẩu.",
  "Email already registered.": "Email này đã được đăng ký.",
  "An account with this email already exists.": "Email này đã được đăng ký.",
  "Password must be at least 8 characters.": "Mật khẩu phải có ít nhất 8 ký tự.",
  "Role must be 'owner', 'manager', or 'tenant'.": "Vai trò tài khoản không hợp lệ.",
  "Request body must be JSON.": "Dữ liệu gửi lên không hợp lệ.",
  "Invalid or expired refresh token.": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  "Refresh token has been revoked or expired.": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
};

export type LoginValidationResult =
  | { ok: true; email: string; password: string }
  | { ok: false; error: string };

export type RegisterValidationResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function validateLoginForm(emailOrPhone: string, password: string): LoginValidationResult {
  const trimmed = emailOrPhone.trim();
  if (!trimmed) {
    return { ok: false, error: "Vui lòng nhập địa chỉ email hoặc số điện thoại." };
  }
  const cleanPhone = trimmed.replace(/[\s.-]/g, "");
  const isPhoneValid = /^\+?[0-9]{9,15}$/.test(cleanPhone);
  if (!isPhoneValid && !EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, error: "Địa chỉ email hoặc số điện thoại không đúng định dạng." };
  }
  if (!password) {
    return { ok: false, error: "Vui lòng nhập mật khẩu." };
  }
  return { ok: true, email: trimmed, password };
}

export function validateRegisterForm(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): RegisterValidationResult {
  const trimmedEmail = input.email.trim();
  if (!trimmedEmail) {
    return { ok: false, error: "Vui lòng nhập địa chỉ email." };
  }
  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return { ok: false, error: "Địa chỉ email không đúng định dạng." };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "Mật khẩu phải có ít nhất 8 ký tự." };
  }
  if (input.password !== input.confirmPassword) {
    return { ok: false, error: "Mật khẩu xác nhận không khớp." };
  }
  return { ok: true, email: trimmedEmail };
}

export function formatAuthError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message in AUTH_ERROR_MESSAGES) {
      return AUTH_ERROR_MESSAGES[message];
    }
    if (
      error instanceof TypeError ||
      /failed to fetch|networkerror|load failed/i.test(message)
    ) {
      return "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
    }
    if (/^Request failed with status \d+$/i.test(message) || !message) {
      return fallback;
    }
    return message;
  }
  return fallback;
}
