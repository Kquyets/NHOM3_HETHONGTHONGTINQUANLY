"use client";

import { useEffect, useState, type FormEvent } from "react";
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
} from "@phosphor-icons/react";

import { useAuth } from "../../lib/auth-context";

function LogoIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2L2 8.5V20a1 1 0 001 1h5v-6h8v6h5a1 1 0 001-1V8.5L12 2z" />
    </svg>
  );
}

export default function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState<"owner" | "manager">("owner");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength
  const pwStrength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;
  const pwStrengthLabel = ["", "Yếu", "Trung bình", "Mạnh"][pwStrength];
  const pwStrengthColor = ["", "var(--color-danger)", "var(--color-warning)", "var(--color-success)"][pwStrength];

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, role);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-wrapper">
        <div className="loading-indicator">
          <span className="spinner" role="status" aria-label="Đang tải" />
          Đang tải thông tin...
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <motion.div
        className="auth-card"
        style={{ maxWidth: 480 }}
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="auth-header">
          <motion.div
            className="auth-logo"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <LogoIcon />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            Tạo tài khoản
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            Bắt đầu quản lý dãy phòng trọ dễ dàng
          </motion.p>
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
              transition={{ duration: 0.25 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {/* Role selector */}
          <div className="form-group">
            <label id="role-label">Vai trò của bạn</label>
            <div className="role-selector" role="radiogroup" aria-labelledby="role-label">
              {/* Owner */}
              <label className={`role-option ${role === "owner" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={role === "owner"}
                  onChange={() => setRole("owner")}
                />
                <House size={22} weight={role === "owner" ? "fill" : "regular"} />
                <span>Chủ nhà</span>
                <span style={{ fontSize: "var(--text-xs)", color: "inherit", opacity: 0.7 }}>
                  Toàn quyền quản lý
                </span>
              </label>

              {/* Manager */}
              <label className={`role-option ${role === "manager" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === "manager"}
                  onChange={() => setRole("manager")}
                />
                <UserCircle size={22} weight={role === "manager" ? "fill" : "regular"} />
                <span>Quản lý</span>
                <span style={{ fontSize: "var(--text-xs)", color: "inherit", opacity: 0.7 }}>
                  Quản lý theo nhà trọ
                </span>
              </label>
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-fg-3)", display: "flex", pointerEvents: "none",
              }}>
                <EnvelopeSimple size={16} />
              </span>
              <input
                id="email"
                type="email"
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="chu-nha@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">
              Mật khẩu{" "}
              <span style={{ fontWeight: 400, color: "var(--color-fg-3)" }}>(ít nhất 8 ký tự)</span>
            </label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-fg-3)", display: "flex", pointerEvents: "none",
              }}>
                <LockSimple size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                style={{ paddingLeft: 36, paddingRight: 44 }}
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
                      <motion.div
                        key={level}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 99,
                          background: pwStrength >= level ? pwStrengthColor : "rgba(255,255,255,0.08)",
                        }}
                        animate={{ background: pwStrength >= level ? pwStrengthColor : "rgba(255,255,255,0.08)" }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", color: pwStrengthColor }}>
                    {pwStrengthLabel}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-fg-3)", display: "flex", pointerEvents: "none",
              }}>
                <ShieldCheck size={16} />
              </span>
              <input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                className="form-control"
                style={{
                  paddingLeft: 36,
                  paddingRight: 44,
                  borderColor: confirmPassword.length > 0 && confirmPassword !== password
                    ? "rgba(248,113,113,0.5)" : undefined,
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
                  style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--color-danger)", marginBottom: 0 }}
                >
                  Mật khẩu không khớp
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: 8, justifyContent: "center", gap: 8 }}
            disabled={submitting}
            aria-busy={submitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Đang tạo tài khoản...
              </>
            ) : (
              <>
                Đăng ký tài khoản
                <ArrowRight size={15} weight="bold" />
              </>
            )}
          </motion.button>
        </motion.form>

        <div className="auth-footer" style={{ marginTop: 20 }}>
          Đã có tài khoản?{" "}
          <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
