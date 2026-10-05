"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  EyeSlash,
  EnvelopeSimple,
  LockSimple,
  ArrowRight,
  House,
} from "@phosphor-icons/react";

import { useAuth } from "../../lib/auth-context";
import { AuthShowcase } from "../../components/auth/auth-showcase";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="auth-wrapper" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div
          className="loading-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="spinner" role="status" aria-label="Đang tải" />
          Đang tải thông tin...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-split-wrapper">
      {/* ── Left Showcase Panel ──────────────────────────────── */}
      <AuthShowcase />

      {/* ── Right Form Panel ─────────────────────────────────── */}
      <main className="auth-form-side">
        <div className="auth-form-container">
          <motion.div
            className="auth-form-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="auth-header" style={{ textAlign: "left", marginBottom: 24 }}>
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
                  marginBottom: 16,
                  boxShadow: "0 4px 14px var(--color-primary-glow)",
                }}
              >
                <House size={20} weight="fill" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
                Đăng nhập hệ thống
              </h1>
              <p style={{ color: "var(--color-fg-2)", fontSize: 14 }}>
                Chào mừng trở lại! Vui lòng nhập email và mật khẩu của bạn.
              </p>
            </div>

            {/* Error Message */}
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

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group">
                <label htmlFor="email">Địa chỉ Email</label>
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
                    ref={emailRef}
                    id="email"
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: 38 }}
                    placeholder="chu-nha@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label htmlFor="password">Mật khẩu</label>
                </div>
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
                    autoComplete="current-password"
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
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                className="btn-primary"
                style={{
                  width: "100%",
                  marginTop: 12,
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
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập vào tài khoản
                    <ArrowRight size={15} weight="bold" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="auth-divider" style={{ margin: "24px 0 20px" }}>
              <span>hoặc</span>
            </div>

            <div style={{ textAlign: "center", fontSize: 14, color: "var(--color-fg-2)" }}>
              Chưa có tài khoản quản lý?{" "}
              <Link
                href="/register"
                style={{ color: "var(--color-primary)", fontWeight: 700 }}
              >
                Đăng ký dùng thử ngay
              </Link>
            </div>

            {/* Back to Home */}
            <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
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
