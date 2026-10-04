"use client";

import type { FormEvent } from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCircle,
  User,
  EnvelopeSimple,
  Phone,
  LockSimple,
  ShieldCheck,
  House,
  Buildings,
  CheckCircle,
  Eye,
  EyeSlash,
  Clock,
  Bell,
  Check,
  WarningCircle,
  Wrench,
  Receipt,
  FloppyDisk,
  Copy,
  ArrowSquareOut,
  Sparkle,
  Crown,
  CreditCard,
  Broadcast,
  Key,
  Door,
  CalendarBlank,
  Shield,
  ArrowRight,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { ProfileData } from "../../modules/profile/profile.service";

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"info" | "password" | "permissions">("info");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form edit info state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Form change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState(false);

  // Notifications preference toggles
  const [notifInvoice, setNotifInvoice] = useState(true);
  const [notifMaintenance, setNotifMaintenance] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifSavedToast, setNotifSavedToast] = useState(false);

  // Password strength logic
  const hasMinLength = newPassword.length >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const hasSpecialOrUpper = /[^a-zA-Z0-9]/.test(newPassword) || /[A-Z]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const pwStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (hasMinLength) score += 1;
    if (hasLetterAndNumber) score += 1;
    if (hasSpecialOrUpper) score += 1;
    return score;
  }, [newPassword, hasMinLength, hasLetterAndNumber, hasSpecialOrUpper]);

  const pwStrengthLabel = ["", "Yếu", "Khá", "Tốt", "Rất mạnh"][pwStrength];
  const pwStrengthColor = [
    "",
    "var(--color-danger, #ef4444)",
    "var(--color-warning, #f59e0b)",
    "#3b82f6",
    "var(--color-success, #10b981)",
  ][pwStrength];

  // Calculate profile completeness score
  const completeness = useMemo(() => {
    let score = 30; // base email verified
    if (profile?.fullName?.trim()) score += 35;
    if (profile?.phone?.trim()) score += 35;
    return score;
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ profile: ProfileData }>("/api/profile");
      setProfile(res.profile);
      setFullName(res.profile.fullName || "");
      setPhone(res.profile.phone || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải hồ sơ cá nhân.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async (e: FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(false);

    try {
      setSavingInfo(true);
      const res = await apiClient<{ profile: ProfileData }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      setProfile(res.profile);
      setInfoSuccess(true);
      await refreshProfile();
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setSavingPassword(true);
      await apiClient("/api/profile/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyId = () => {
    if (!profile?.id) return;
    void navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleToggleNotif = (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean) => {
    setter(!current);
    setNotifSavedToast(true);
    setTimeout(() => setNotifSavedToast(false), 2500);
  };

  if (authLoading || (loading && !profile)) {
    return (
      <main className="main-container">
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-xl)" }} />
          <div className="card skeleton" style={{ height: 380, borderRadius: "var(--radius-xl)" }} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-container">
        <div className="alert-error" role="alert">
          {error}
        </div>
      </main>
    );
  }

  const roleMeta = {
    owner: {
      title: "Chủ nhà sở hữu",
      icon: Crown,
      badgeClass: "owner",
      gradient: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      glow: "rgba(37, 99, 235, 0.3)",
      color: "var(--color-primary)",
      portalLink: "/dashboard",
      portalLabel: "Vào Bảng tổng quan",
    },
    manager: {
      title: "Quản lý tòa nhà",
      icon: ShieldCheck,
      badgeClass: "manager",
      gradient: "linear-gradient(135deg, #0284c7, #0ea5e9)",
      glow: "rgba(14, 165, 233, 0.3)",
      color: "var(--color-accent)",
      portalLink: "/properties",
      portalLabel: "Vào Quản lý nhà trọ",
    },
    tenant: {
      title: "Khách cư dân",
      icon: House,
      badgeClass: "tenant",
      gradient: "linear-gradient(135deg, #059669, #10b981)",
      glow: "rgba(16, 185, 129, 0.3)",
      color: "var(--color-success)",
      portalLink: "/",
      portalLabel: "Vào Cổng Khách Thuê",
    },
  }[profile?.role || "tenant"];

  const RoleIcon = roleMeta.icon;

  return (
    <main className="main-container">
      {/* ── Profile Header Hero ── */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(15, 23, 42, 0.4) 40%, rgba(16, 185, 129, 0.06) 100%)",
          padding: "clamp(20px, 3vw, 28px)",
          marginBottom: "var(--space-3)",
        }}
      >
        {/* Subtle Ambient Decorative Glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 20,
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left Avatar & Identity Details */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 260 }}>
            {/* Styled Avatar with Halo Ring */}
            <div
              style={{
                position: "relative",
                width: 76,
                height: 76,
                borderRadius: "50%",
                padding: 3,
                background: roleMeta.gradient,
                boxShadow: `0 8px 24px ${roleMeta.glow}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "var(--color-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                }}
              >
                {profile?.fullName ? (
                  profile.fullName.charAt(0).toUpperCase()
                ) : (
                  <UserCircle size={48} weight="duotone" style={{ color: roleMeta.color }} />
                )}
              </div>

              {/* Online/Verified Role Badge Dot */}
              <div
                title="Tài khoản đang hoạt động"
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--color-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div className="pulse-indicator" />
              </div>
            </div>

            {/* Name, Role & Contacts */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(20px, 2.4vw, 26px)",
                    fontWeight: 800,
                    letterSpacing: "var(--tracking-tight)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {profile?.fullName || profile?.email}
                </h1>
                <span
                  className={`role-tag ${roleMeta.badgeClass}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <RoleIcon size={14} weight="fill" />
                  {roleMeta.title}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    color: "var(--color-success)",
                    background: "var(--color-success-bg)",
                    border: "1px solid var(--color-success-border)",
                    borderRadius: "var(--radius-full)",
                    padding: "2px 8px",
                  }}
                >
                  <ShieldCheck size={13} weight="fill" /> Đã xác thực
                </span>
              </div>

              {/* Email & Phone Details */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-fg-2)",
                  marginBottom: 6,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <EnvelopeSimple size={14} style={{ color: "var(--color-primary)" }} /> {profile?.email}
                </span>
                {profile?.phone && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Phone size={14} style={{ color: "var(--color-success)" }} /> {profile.phone}
                  </span>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--color-fg-3)" }}>
                  <Clock size={13} />
                  Gia nhập: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}
                </span>
              </div>

              {/* User ID copy */}
              <button
                type="button"
                onClick={handleCopyId}
                className="btn-ghost"
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  height: 22,
                  color: "var(--color-fg-3)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>UID: {profile?.id.slice(0, 8)}...{profile?.id.slice(-4)}</span>
                {copiedId ? <Check size={12} style={{ color: "var(--color-success)" }} /> : <Copy size={12} />}
                <span>{copiedId ? "Đã sao chép!" : "Sao chép ID"}</span>
              </button>
            </div>
          </div>

          {/* Right Action & Profile Completeness */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            {/* Profile Completion Meter */}
            <div
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "8px 14px",
                width: 220,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 5 }}>
                <span style={{ color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Sparkle size={13} style={{ color: "#fbbf24" }} /> Hoàn thiện hồ sơ
                </span>
                <strong style={{ color: completeness === 100 ? "var(--color-success)" : "var(--color-primary)" }}>
                  {completeness}%
                </strong>
              </div>
              <div style={{ height: 5, width: "100%", background: "var(--color-surface-3)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${completeness}%`,
                    background: completeness === 100 ? "var(--color-success)" : "var(--color-primary)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            {/* Quick Portal Switcher */}
            <Link
              href={roleMeta.portalLink}
              className="btn-primary"
              style={{
                fontSize: "var(--text-xs)",
                padding: "7px 14px",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
              }}
            >
              {roleMeta.portalLabel}
              <ArrowSquareOut size={15} weight="bold" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Segmented Tab Navigation ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          padding: 5,
          borderRadius: "var(--radius-lg)",
          marginBottom: "var(--space-3)",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          style={{
            flex: 1,
            minWidth: 150,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: activeTab === "info" ? 700 : 500,
            color: activeTab === "info" ? "var(--color-primary)" : "var(--color-fg-2)",
            background: activeTab === "info" ? "var(--color-primary-light)" : "transparent",
            border: activeTab === "info" ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          <User size={18} weight={activeTab === "info" ? "fill" : "regular"} />
          Thông tin cá nhân
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          style={{
            flex: 1,
            minWidth: 150,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: activeTab === "password" ? 700 : 500,
            color: activeTab === "password" ? "var(--color-primary)" : "var(--color-fg-2)",
            background: activeTab === "password" ? "var(--color-primary-light)" : "transparent",
            border: activeTab === "password" ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          <LockSimple size={18} weight={activeTab === "password" ? "fill" : "regular"} />
          Bảo mật &amp; Đổi mật khẩu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          style={{
            flex: 1,
            minWidth: 160,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: activeTab === "permissions" ? 700 : 500,
            color: activeTab === "permissions" ? "var(--color-primary)" : "var(--color-fg-2)",
            background: activeTab === "permissions" ? "var(--color-primary-light)" : "transparent",
            border: activeTab === "permissions" ? "1px solid rgba(59, 130, 246, 0.3)" : "1px solid transparent",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
        >
          <ShieldCheck size={18} weight={activeTab === "permissions" ? "fill" : "regular"} />
          Phân quyền &amp; Thông báo
        </button>
      </div>

      {/* ── TAB 1: Thông tin cá nhân ── */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-3)" }}>
          {/* Left Form: Edit Personal Details */}
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={18} weight="bold" />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>Cập nhật thông tin</h2>
                <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
                  Thông tin định danh và phương thức liên hệ chính thức của bạn
                </p>
              </div>
            </div>

            <AnimatePresence>
              {infoSuccess && (
                <motion.div
                  className="alert-success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                >
                  <CheckCircle size={18} weight="fill" /> Đã lưu thông tin hồ sơ thành công!
                </motion.div>
              )}
              {infoError && (
                <motion.div
                  className="alert-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                >
                  <WarningCircle size={18} weight="fill" /> {infoError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleUpdateInfo} style={{ display: "grid", gap: 16 }}>
              {/* Email (Readonly) */}
              <div>
                <label className="field-label" htmlFor="infoEmail" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Địa chỉ Email</span>
                  <span style={{ fontSize: 11, color: "var(--color-fg-3)" }}>Không thể thay đổi</span>
                </label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <EnvelopeSimple size={18} />
                  </div>
                  <input
                    id="infoEmail"
                    type="email"
                    className="input-field"
                    value={profile?.email || ""}
                    disabled
                    style={{
                      paddingLeft: 38,
                      paddingRight: 110,
                      opacity: 0.8,
                      cursor: "not-allowed",
                      background: "var(--color-surface-hover)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-success)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle size={14} weight="fill" /> Đã xác thực
                  </span>
                </div>
                <p className="text-muted" style={{ fontSize: 11, marginTop: 4, margin: "4px 0 0" }}>
                  Email được dùng để đăng nhập và nhận thông báo hệ thống bảo mật.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="field-label" htmlFor="infoName">Họ và tên hiển thị</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <User size={18} />
                  </div>
                  <input
                    id="infoName"
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: 38 }}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
                  Họ tên sẽ được in trên hợp đồng thuê phòng và phiếu thu tiền.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="field-label" htmlFor="infoPhone">Số điện thoại liên lạc</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Phone size={18} />
                  </div>
                  <input
                    id="infoPhone"
                    type="tel"
                    className="input-field"
                    style={{ paddingLeft: 38 }}
                    placeholder="Ví dụ: 0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="text-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
                  {profile?.role === "tenant"
                    ? "Chủ trọ sẽ dùng số điện thoại này để tự động đồng bộ hợp đồng phòng vào tài khoản của bạn."
                    : "Số điện thoại hiển thị cho người thuê liên hệ khi có sự cố kỹ thuật hoặc chuyển tiền."}
                </p>
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingInfo}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 20px",
                  }}
                >
                  <FloppyDisk size={17} weight="bold" />
                  {savingInfo ? "Đang lưu thay đổi..." : "Lưu thay đổi hồ sơ"}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Context Role Card */}
          <div>
            {profile?.role === "tenant" ? (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {/* ── Thẻ Cư Dân Điện Tử (Digital Resident Smart Card) ── */}
                <div className="resident-card">
                  {/* Subtle Background Circuit Mesh */}
                  <div
                    style={{
                      position: "absolute",
                      right: -20,
                      bottom: -20,
                      width: 160,
                      height: 160,
                      borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Header of Card */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255, 255, 255, 0.6)", fontWeight: 700 }}>
                        Nhà Trọ Thông Minh
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                        THẺ CƯ DÂN ĐIỆN TỬ
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Broadcast size={22} weight="bold" style={{ color: "rgba(255, 255, 255, 0.8)" }} />
                      <div className="resident-card-chip">
                        <CreditCard size={18} weight="bold" style={{ color: "#78350f" }} />
                      </div>
                    </div>
                  </div>

                  {/* Room & Property Info */}
                  {profile.tenantInfo?.propertyName ? (
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", textTransform: "uppercase" }}>
                        Phòng thuê hiện tại
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#ffffff", margin: "2px 0 10px", letterSpacing: "-0.02em" }}>
                        Phòng {profile.tenantInfo.roomNumber}
                      </div>

                      <div style={{ display: "grid", gap: 8, fontSize: 12, borderTop: "1px solid rgba(255, 255, 255, 0.12)", paddingTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Địa chỉ nhà trọ:</span>
                          <span style={{ fontWeight: 600 }}>{profile.tenantInfo.propertyName}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Họ tên cư dân:</span>
                          <span style={{ fontWeight: 600 }}>{profile.fullName || profile.email}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Chủ nhà / Quản lý:</span>
                          <span style={{ fontWeight: 600 }}>{profile.tenantInfo.landlordName || "Ban quản lý"}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>Trạng thái hợp đồng:</span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              color: "#34d399",
                              fontSize: 11,
                              fontWeight: 700,
                              background: "rgba(16, 185, 129, 0.2)",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                            }}
                          >
                            <span className="pulse-indicator" style={{ width: 6, height: 6 }} /> Đang hiệu lực
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "16px 0", textAlign: "center" }}>
                      <Door size={40} weight="duotone" style={{ color: "rgba(255, 255, 255, 0.5)", margin: "0 auto 8px" }} />
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Chưa gắn với phòng trọ</div>
                      <p style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)", margin: 0, lineHeight: 1.5 }}>
                        Cập nhật Số điện thoại chính xác để Chủ nhà tìm kiếm và thêm bạn vào danh sách người ở.
                      </p>
                    </div>
                  )}
                </div>

                {/* Resident Shortcuts */}
                <div className="card" style={{ padding: "var(--space-3)" }}>
                  <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
                    <Receipt size={17} style={{ color: "var(--color-primary)" }} /> Lối tắt dành cho Khách thuê
                  </h3>
                  <div style={{ display: "grid", gap: 8 }}>
                    <Link
                      href="/"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontSize: "var(--text-xs)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Receipt size={16} style={{ color: "var(--color-primary)" }} />
                        Cổng Khách Thuê (Xem tiền phòng &amp; VietQR)
                      </span>
                      <ArrowRight size={14} />
                    </Link>

                    <Link
                      href="/maintenance"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontSize: "var(--text-xs)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Wrench size={16} style={{ color: "#f59e0b" }} />
                        Báo hỏng &amp; Yêu cầu sửa chữa thiết bị
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {/* ── Operational Stats Overview (Owner / Manager) ── */}
                <div className="card" style={{ padding: "var(--space-3)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <Buildings size={20} style={{ color: "var(--color-primary)" }} /> Quy mô vận hành
                    </h2>
                    <span className="badge ready" style={{ fontSize: 11 }}>
                      Sẵn sàng hoạt động
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div
                      style={{
                        padding: 16,
                        borderRadius: "var(--radius-lg)",
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-fg-3)", fontSize: 11, marginBottom: 6 }}>
                        <Buildings size={15} style={{ color: "var(--color-primary)" }} /> Nhà trọ quản lý
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--font-display)", color: "var(--color-fg)", lineHeight: 1 }}>
                        {profile?.staffInfo?.propertiesCount ?? 0}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Bất động sản</div>
                    </div>

                    <div
                      style={{
                        padding: 16,
                        borderRadius: "var(--radius-lg)",
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-fg-3)", fontSize: 11, marginBottom: 6 }}>
                        <Door size={15} style={{ color: "var(--color-success)" }} /> Tổng số phòng trọ
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 900, fontFamily: "var(--font-display)", color: "var(--color-success)", lineHeight: 1 }}>
                        {profile?.staffInfo?.roomsCount ?? 0}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Căn phòng</div>
                    </div>
                  </div>

                  {/* Operational Shortcuts */}
                  <div style={{ display: "grid", gap: 8 }}>
                    <Link
                      href="/properties"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontSize: "var(--text-xs)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Buildings size={16} style={{ color: "var(--color-primary)" }} />
                        Quản lý danh sách Nhà trọ &amp; Phòng
                      </span>
                      <ArrowRight size={14} />
                    </Link>

                    <Link
                      href="/invoices"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontSize: "var(--text-xs)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Receipt size={16} style={{ color: "var(--color-success)" }} />
                        Lập phiếu thu &amp; Xuất hóa đơn VietQR
                      </span>
                      <ArrowRight size={14} />
                    </Link>

                    <Link
                      href="/meter-readings"
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        fontSize: "var(--text-xs)",
                        textDecoration: "none",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CalendarBlank size={16} style={{ color: "#fbbf24" }} />
                        Ghi chỉ số Điện &amp; Nước định kỳ
                      </span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Bảo mật & Đổi mật khẩu ── */}
      {activeTab === "password" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--space-3)" }}>
          {/* Left: Change Password Form */}
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LockSimple size={18} weight="bold" />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>Đổi mật khẩu tài khoản</h2>
                <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
                  Nên sử dụng mật khẩu mạnh kết hợp chữ, số và ký tự đặc biệt
                </p>
              </div>
            </div>

            <AnimatePresence>
              {passwordSuccess && (
                <motion.div
                  className="alert-success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                >
                  <CheckCircle size={18} weight="fill" /> Đã cập nhật mật khẩu mới thành công!
                </motion.div>
              )}
              {passwordError && (
                <motion.div
                  className="alert-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                >
                  <WarningCircle size={18} weight="fill" /> {passwordError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 16 }}>
              {/* Current Password */}
              <div>
                <label className="field-label" htmlFor="currPw">Mật khẩu hiện tại</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Key size={18} />
                  </div>
                  <input
                    id="currPw"
                    type={showCurrent ? "text" : "password"}
                    required
                    className="input-field"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    placeholder="Nhập mật khẩu hiện tại..."
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 6 }}
                    onClick={() => setShowCurrent((p) => !p)}
                    aria-label={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="field-label" htmlFor="newPw">Mật khẩu mới</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <LockSimple size={18} />
                  </div>
                  <input
                    id="newPw"
                    type={showNew ? "text" : "password"}
                    required
                    className="input-field"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 6 }}
                    onClick={() => setShowNew((p) => !p)}
                    aria-label={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Progress Bar */}
                {newPassword.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                      <span className="text-muted">Độ mạnh mật khẩu:</span>
                      <strong style={{ color: pwStrengthColor }}>{pwStrengthLabel}</strong>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "var(--color-surface-3)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(pwStrength / 4) * 100}%`,
                          background: pwStrengthColor,
                          transition: "all 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="field-label" htmlFor="confPw">Xác nhận mật khẩu mới</label>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-fg-3)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <CheckCircle size={18} />
                  </div>
                  <input
                    id="confPw"
                    type={showConfirm ? "text" : "password"}
                    required
                    className="input-field"
                    style={{ paddingLeft: 38, paddingRight: 40 }}
                    placeholder="Nhập lại chính xác mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 6 }}
                    onClick={() => setShowConfirm((p) => !p)}
                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Checklist Criteria */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: 11,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: hasMinLength ? "var(--color-success)" : "var(--color-fg-3)" }}>
                  <Check size={14} weight="bold" /> Tối thiểu 8 ký tự
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: hasLetterAndNumber ? "var(--color-success)" : "var(--color-fg-3)" }}>
                  <Check size={14} weight="bold" /> Bao gồm cả chữ cái và chữ số
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: isMatch ? "var(--color-success)" : "var(--color-fg-3)" }}>
                  <Check size={14} weight="bold" /> Mật khẩu xác nhận trùng khớp
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingPassword || !currentPassword || !hasMinLength || !isMatch}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 20px",
                  }}
                >
                  <LockSimple size={17} weight="bold" />
                  {savingPassword ? "Đang cập nhật mật khẩu..." : "Cập nhật mật khẩu mới"}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Security Health & Best Practices */}
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {/* Security Status Card */}
            <div className="card" style={{ padding: "var(--space-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-success-bg)",
                    color: "var(--color-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield size={18} weight="bold" />
                </div>
                <div>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>Tình trạng an toàn</h3>
                  <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
                    Hệ thống xác thực và bảo vệ phiên làm việc
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10, fontSize: "var(--text-xs)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                  <span className="text-muted">Mã hóa mật khẩu:</span>
                  <span style={{ fontWeight: 600, color: "var(--color-success)" }}>Bcrypt (Salt 10 Rounds)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                  <span className="text-muted">Trạng thái xác thực:</span>
                  <span className="badge ready" style={{ fontSize: 10 }}>Đang bảo vệ</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 }}>
                  <span className="text-muted">Phiên thiết bị hiện tại:</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                    <span className="pulse-indicator" style={{ width: 6, height: 6 }} /> Web Browser
                  </span>
                </div>
              </div>

              {/* Revocation Warning Box */}
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-light)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "var(--color-fg-2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--color-primary)", marginBottom: 4 }}>
                  <ShieldCheck size={15} weight="fill" /> Tự động thu hồi phiên đăng nhập
                </div>
                Khi đổi mật khẩu thành công, toàn bộ token làm mới trên các thiết bị khác sẽ được tự động thu hồi ngay lập tức để bảo vệ tài khoản của bạn.
              </div>
            </div>

            {/* Security Advice Card */}
            <div className="card" style={{ padding: "var(--space-3)" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 10px" }}>
                Khuyến nghị an toàn tài khoản
              </h3>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6, color: "var(--color-fg-2)" }}>
                <li>Không chia sẻ thông tin đăng nhập với người khác.</li>
                <li>Đăng xuất tài khoản khi dùng máy tính công cộng hoặc quán nét.</li>
                <li>Đổi mật khẩu định kỳ 3 đến 6 tháng một lần để phòng ngừa rò rỉ.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Phân quyền & Thông báo ── */}
      {activeTab === "permissions" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {/* Permissions Matrix */}
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={20} style={{ color: "var(--color-primary)" }} /> Ma trận phân quyền hệ thống
                </h2>
                <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
                  Quy định chi tiết các quyền hạn truy cập của Chủ nhà, Quản lý tòa nhà và Khách cư dân
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="text-muted" style={{ fontSize: 12 }}>Vai trò của bạn:</span>
                <span className={`role-tag ${roleMeta.badgeClass}`} style={{ padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                  <RoleIcon size={14} weight="fill" /> {roleMeta.title}
                </span>
              </div>
            </div>

            <div className="table-responsive" style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Tính năng &amp; Phân hệ chức năng</th>
                    <th style={{ textAlign: "center", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      Chủ nhà (Owner)
                    </th>
                    <th style={{ textAlign: "center", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      Quản lý (Manager)
                    </th>
                    <th style={{ textAlign: "center", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>
                      Khách thuê (Tenant)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Tạo &amp; Cấu hình Nhà trọ, STK VietQR Napas</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Cài đặt ngân hàng, giá điện nước cơ sở</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>—</td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>—</td>
                  </tr>

                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Ký kết hợp đồng &amp; Bàn giao phòng</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Xếp phòng, điều chỉnh tiền cọc, ngày bắt đầu</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>—</td>
                  </tr>

                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Ghi nhận chỉ số Điện &amp; Nước tháng</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Cập nhật số cũ, số mới, tính lượng tiêu thụ</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>
                      <span className="badge" style={{ fontSize: 10 }}>Xem lịch sử</span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Phát hành hóa đơn &amp; Thu tiền phòng</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Tạo phiếu thu, gửi mã QR, chốt thanh toán</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>
                      <span className="badge ready" style={{ fontSize: 10 }}>Thanh toán QR</span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Báo hỏng &amp; Điều phối thợ sửa chữa</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Sự cố thiết bị điện nước, khóa cửa, điều hòa</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <span className="badge" style={{ fontSize: 10 }}>Tiếp nhận &amp; Sửa</span>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      <span className="badge" style={{ fontSize: 10 }}>Tiếp nhận &amp; Sửa</span>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>
                      <span className="badge ready" style={{ fontSize: 10 }}>Gửi yêu cầu</span>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div style={{ fontWeight: 600 }}>Nhận thông báo tự động trên hệ thống</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>Chuông thông báo thời gian thực về hóa đơn, sự cố</div>
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "owner" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "manager" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                    <td style={{ textAlign: "center", color: "#16a34a", background: profile?.role === "tenant" ? "var(--color-primary-light)" : undefined }}>
                      <Check size={18} weight="bold" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Bell size={20} style={{ color: "var(--color-primary)" }} /> Tùy chọn thông báo hệ thống
                </h2>
                <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
                  Cấu hình các loại sự kiện bạn muốn nhận trên chuông báo thông minh
                </p>
              </div>

              <AnimatePresence>
                {notifSavedToast && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-success)",
                      background: "var(--color-success-bg)",
                      border: "1px solid var(--color-success-border)",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle size={14} weight="fill" /> Đã cập nhật tùy chọn
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {/* Item 1: Invoices */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--color-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-primary-light)",
                      color: "var(--color-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Receipt size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Hóa đơn tiền phòng &amp; Dịch vụ</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Nhận thông báo ngay khi hóa đơn tiền phòng mới được xuất hoặc sắp đến hạn thanh toán.
                    </div>
                  </div>
                </div>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={notifInvoice}
                    onChange={() => handleToggleNotif(setNotifInvoice, notifInvoice)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              {/* Item 2: Maintenance */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--color-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-warning-bg)",
                      color: "var(--color-warning)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Wrench size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Sự cố &amp; Yêu cầu sửa chữa thiết bị</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Cập nhật tiến độ xử lý khi có người báo hỏng thiết bị hoặc lịch thợ đến sửa phòng.
                    </div>
                  </div>
                </div>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={notifMaintenance}
                    onChange={() => handleToggleNotif(setNotifMaintenance, notifMaintenance)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              {/* Item 3: Payments */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--color-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-success-bg)",
                      color: "var(--color-success)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Xác nhận nộp tiền &amp; Quét mã QR</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Nhận thông báo khi thanh toán được ghi nhận và chốt thành công trong sổ quỹ.
                    </div>
                  </div>
                </div>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={notifPayment}
                    onChange={() => handleToggleNotif(setNotifPayment, notifPayment)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>

              {/* Item 4: General Announcements */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "var(--color-surface-2)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-md)",
                      background: "rgba(147, 51, 234, 0.12)",
                      color: "#a855f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Thông báo bảo trì &amp; Quy định chung</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      Lời nhắc chốt chỉ số điện nước định kỳ và các thông báo khẩn từ ban quản lý tòa nhà.
                    </div>
                  </div>
                </div>

                <label className="profile-switch">
                  <input
                    type="checkbox"
                    checked={notifReminders}
                    onChange={() => handleToggleNotif(setNotifReminders, notifReminders)}
                  />
                  <span className="profile-switch-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
