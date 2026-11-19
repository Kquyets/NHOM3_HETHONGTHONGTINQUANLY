"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  EyeSlash,
  EnvelopeSimple,
  LockSimple,
  House,
  UserCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Sun,
  Moon,
} from "@phosphor-icons/react";

import { useAuth } from "../../lib/auth-context";
import { formatAuthError, validateRegisterForm } from "../../lib/auth-form";
import { useTheme } from "../../lib/theme-context";
import { AuthShowcase } from "../../components/auth/auth-showcase";

export default function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<"owner" | "tenant">("owner");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipAutoRedirectRef = useRef(false);

  // Password strength
  const pwStrength =
    password.length === 0
      ? 0
      : password.length < 6
      ? 1
      : password.length < 10
      ? 2
      : 3;
  const pwStrengthLabel = ["", "Yếu", "Trung bình", "Mạnh"][pwStrength];
  const pwStrengthColor = [
    "",
    "var(--color-danger)",
    "var(--color-warning)",
    "var(--color-success)",
  ][pwStrength];

  useEffect(() => {
    if (!isLoading && user && !skipAutoRedirectRef.current) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateRegisterForm({ email, password, confirmPassword });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    if (role === "tenant" && !phone.trim()) {
      setError("Khách thuê vui lòng nhập Số điện thoại để hệ thống liên kết với phòng trọ.");
      return;
    }

    skipAutoRedirectRef.current = true;
    setSubmitting(true);
    try {
      await register(
        validation.email,
        password,
        role,
        fullName.trim() || undefined,
        phone.trim() || undefined,
      );
    } catch (err) {
      skipAutoRedirectRef.current = false;
      setError(
        formatAuthError(err, "Đăng ký thất bại. Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-indicator">
          <span className="spinner" role="status" aria-label="Đang tải" />
          Đang tải thông tin...
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      {/* ── Left Showcase Panel ──────────────────────────────── */}
      <AuthShowcase />

      {/* ── Right Form Panel ─────────────────────────────────── */}
      <main className="auth-form-side">
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
          <motion.button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex" }}
                >
                  <Sun size={15} weight="fill" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex" }}
                >
                  <Moon size={15} weight="fill" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="auth-form-container" style={{ maxWidth: 480 }}>
          <motion.div
            className="auth-form-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="auth-header" style={{ textAlign: "left", marginBottom: 20 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  background: "var(--color-primary)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-on-primary)",
                  marginBottom: 14,
                  boxShadow: "0 4px 14px var(--color-primary-glow)",
                }}
              >
                {role === "owner" ? (
                  <House size={20} weight="fill" />
                ) : (
                  <UserCircle size={20} weight="fill" />
                )}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
                {role === "owner" ? "Đăng ký tài khoản Quản trị" : "Kích hoạt Cổng thông tin Cư dân"}
              </h1>
              <p style={{ color: "var(--color-fg-2)", fontSize: 14, lineHeight: 1.5 }}>
                {role === "owner"
                  ? "Bắt đầu số hóa và tối ưu 90% thời gian vận hành dãy trọ hoàn toàn miễn phí."
                  : "Tra cứu hóa đơn, chỉ số điện nước, thanh toán VietQR và gửi phản ánh nhanh chóng."}
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="alert-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} noValidate>
              {/* Role selector */}
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label id="role-label" style={{ fontWeight: 600, marginBottom: 8, display: "block" }}>
                  Vai trò của bạn
                </label>
                <div className="role-selector" role="radiogroup" aria-labelledby="role-label">
                  <label className={`role-option ${role === "owner" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      value="owner"
                      checked={role === "owner"}
                      onChange={() => setRole("owner")}
                    />
                    <div className="role-option-check">
                      {role === "owner" && <Check size={11} weight="bold" />}
                    </div>
                    <div className="role-option-icon">
                      <House size={22} weight={role === "owner" ? "fill" : "regular"} />
                    </div>
                    <span className="role-option-title">Chủ nhà / BQL</span>
                    <span className="role-option-desc">Toàn quyền quản trị</span>
                  </label>

                  <label className={`role-option ${role === "tenant" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="role"
                      value="tenant"
                      checked={role === "tenant"}
                      onChange={() => setRole("tenant")}
                    />
                    <div className="role-option-check">
                      {role === "tenant" && <Check size={11} weight="bold" />}
                    </div>
                    <div className="role-option-icon">
                      <UserCircle size={22} weight={role === "tenant" ? "fill" : "regular"} />
                    </div>
                    <span className="role-option-title">Khách thuê phòng</span>
                    <span className="role-option-desc">Xem bill &amp; Báo sự cố</span>
                  </label>
                </div>
              </div>

              {/* Full Name & Phone */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="fullName">
                    {role === "owner" ? "Họ và tên chủ nhà" : "Họ và tên khách thuê"}
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    className="form-control"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="phone">
                    {role === "owner" ? "Số điện thoại liên hệ" : "Số điện thoại nhận phòng *"}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-control"
                    placeholder="0912.345.678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    required={role === "tenant"}
                  />
                </div>
              </div>
              {role === "tenant" && (
                <div
                  style={{
                    background: "rgba(99, 102, 241, 0.08)",
                    border: "1px dashed var(--color-primary)",
                    borderRadius: "var(--radius-md)",
                    padding: "9px 12px",
                    fontSize: "12px",
                    color: "var(--color-fg-2)",
                    lineHeight: 1.5,
                    marginTop: -4,
                    marginBottom: 14,
                  }}
                >
                  💡 <strong>Lưu ý quan trọng:</strong> Điền chính xác <strong>Số điện thoại</strong> bạn đã cung cấp cho Chủ trọ khi ký hợp đồng để hệ thống tự động kết nối với phòng và hóa đơn của bạn.
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">
                  {role === "owner" ? "Email quản trị" : "Email đăng nhập"}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      pointerEvents: "none",
                    }}
                  >
                    <EnvelopeSimple size={17} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: 38 }}
                    placeholder={role === "owner" ? "chu-nha@example.com" : "khach-thue@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password">
                  Mật khẩu <span style={{ fontWeight: 400, color: "var(--color-fg-3)" }}>(tối thiểu 8 ký tự)</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      pointerEvents: "none",
                    }}
                  >
                    <LockSimple size={17} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    style={{ paddingLeft: 38, paddingRight: 44 }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength bar */}
                <AnimatePresence>
                  {password.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: 8 }}
                    >
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 99,
                              background:
                                pwStrength >= level
                                  ? pwStrengthColor
                                  : "var(--color-border)",
                              transition: "background 0.25s ease",
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: pwStrengthColor, fontWeight: 500 }}>
                        Độ mạnh mật khẩu: {pwStrengthLabel}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      pointerEvents: "none",
                    }}
                  >
                    <ShieldCheck size={17} />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    className="form-control"
                    style={{
                      paddingLeft: 38,
                      paddingRight: 44,
                      borderColor:
                        confirmPassword.length > 0 && confirmPassword !== password
                          ? "var(--color-danger)"
                          : undefined,
                    }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <AnimatePresence>
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "var(--color-danger)",
                        marginBottom: 0,
                      }}
                    >
                      Mật khẩu xác nhận không trùng khớp
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                className="btn-primary"
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "11px 16px",
                  fontSize: 14.5,
                  justifyContent: "center",
                  gap: 8,
                }}
                disabled={submitting}
                aria-busy={submitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    {role === "owner" ? "Đang tạo tài khoản quản trị..." : "Đang kích hoạt tài khoản cư dân..."}
                  </>
                ) : (
                  <>
                    {role === "owner" ? "Đăng ký tài khoản quản trị miễn phí" : "Kích hoạt Cổng thông tin Cư dân"}
                    <ArrowRight size={15} weight="bold" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="auth-footer" style={{ marginTop: 22 }}>
              {role === "owner" ? "Đã có tài khoản quản lý? " : "Đã có tài khoản cư dân? "}
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                Đăng nhập ngay
              </Link>
            </div>

            {/* Back to Home */}
            <div style={{ textAlign: "center", marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: "var(--color-fg-3)",
                }}
              >
                ← Quay lại trang chủ
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
