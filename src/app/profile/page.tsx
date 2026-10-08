"use client";

import type { FormEvent } from "react";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
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
  ArrowRight,
  Shield,
  Key,
  Door,
  CalendarBlank,
  DeviceMobile,
  CheckFat,
  IdentificationBadge,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { ProfileData } from "../../modules/profile/profile.service";

type TabKey = "info" | "password" | "notifications" | "permissions";

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("info");
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

  // Notifications preference toggles
  const [notifInvoice, setNotifInvoice] = useState(true);
  const [notifMaintenance, setNotifMaintenance] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);
  const [notifSavedToast, setNotifSavedToast] = useState(false);

  // Password strength logic
  const hasMinLength = newPassword.length >= 8;
  const hasLetterAndNumber = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const pwStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (hasMinLength) score += 1;
    if (hasLetterAndNumber) score += 1;
    if (newPassword.length >= 12 || /[^a-zA-Z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword, hasMinLength, hasLetterAndNumber]);

  const pwStrengthLabel = ["", "Yếu", "Trung bình", "Khá", "Mạnh"][pwStrength];
  const pwStrengthColor = [
    "",
    "var(--color-danger, #ef4444)",
    "var(--color-warning, #f59e0b)",
    "var(--color-primary, #D2C3F6)",
    "var(--color-success, #10b981)",
  ][pwStrength];

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
      setError(err instanceof Error ? err.message : "Không thể tải thông tin hồ sơ.");
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
      setPasswordError("Mật khẩu mới phải có tối thiểu 8 ký tự.");
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

  const handleToggleNotif = (setter: React.Dispatch<React.SetStateAction<boolean>>, current: boolean) => {
    setter(!current);
    setNotifSavedToast(true);
    setTimeout(() => setNotifSavedToast(false), 2000);
  };

  if (authLoading || (loading && !profile)) {
    return (
      <main className="main-container" style={{ maxWidth: 1040, margin: "0 auto", padding: "var(--space-3) var(--space-2)" }}>
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
          <div className="card skeleton" style={{ height: 380, borderRadius: "var(--radius-lg)" }} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-container" style={{ maxWidth: 1040, margin: "0 auto", padding: "var(--space-3) var(--space-2)" }}>
        <div className="alert-error" role="alert">
          {error}
        </div>
      </main>
    );
  }

  const roleText =
    profile?.role === "owner" ? "Chủ nhà" :
    profile?.role === "manager" ? "Quản lý tòa nhà" : "Khách cư dân";

  const roleBadgeStyle = {
    owner: {
      bg: "rgba(59, 130, 246, 0.12)",
      text: "var(--color-primary)",
      border: "rgba(59, 130, 246, 0.25)",
      icon: Buildings,
    },
    manager: {
      bg: "rgba(14, 165, 233, 0.12)",
      text: "#0284c7",
      border: "rgba(14, 165, 233, 0.25)",
      icon: ShieldCheck,
    },
    tenant: {
      bg: "rgba(16, 185, 129, 0.12)",
      text: "var(--color-success)",
      border: "rgba(16, 185, 129, 0.25)",
      icon: House,
    },
  }[profile?.role || "tenant"];

  const RoleBadgeIcon = roleBadgeStyle.icon;

  return (
    <main className="main-container" style={{ maxWidth: 1040, margin: "0 auto", padding: "var(--space-3) var(--space-2)" }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginBottom: 4 }}>
          <span>Tài khoản</span>
          <span>/</span>
          <span style={{ color: "var(--color-fg)" }}>Cài đặt hồ sơ</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, margin: 0, letterSpacing: "var(--tracking-tight)" }}>
          Cài đặt tài khoản
        </h1>
        <p className="text-muted" style={{ fontSize: "var(--text-sm)", margin: "4px 0 0" }}>
          Quản lý thông tin định danh cá nhân, bảo mật đăng nhập và cấu hình nhận thông báo.
        </p>
      </div>

      {/* ── Profile Summary Card (Linear/Stripe Style) ── */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          marginBottom: "var(--space-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 260 }}>
          {/* Avatar Monogram */}
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: "var(--color-primary)",
              flexShrink: 0,
            }}
          >
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : <User size={28} />}
          </div>

          {/* User Meta */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-fg)" }}>
                {profile?.fullName || profile?.email}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-full)",
                  background: roleBadgeStyle.bg,
                  color: roleBadgeStyle.text,
                  border: `1px solid ${roleBadgeStyle.border}`,
                }}
              >
                <RoleBadgeIcon size={13} weight="bold" />
                {roleText}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "var(--text-xs)", color: "var(--color-fg-3)", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <EnvelopeSimple size={13} /> {profile?.email}
              </span>
              {profile?.phone && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Phone size={13} /> {profile.phone}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CalendarBlank size={13} /> Gia nhập: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Link for Role */}
        <div>
          {profile?.role === "tenant" ? (
            <Link href="/" className="btn-secondary" style={{ fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>Cổng Khách Thuê</span>
              <ArrowRight size={13} />
            </Link>
          ) : (
            <Link href="/dashboard" className="btn-secondary" style={{ fontSize: "var(--text-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>Bảng Tổng Quan</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Sub Navigation Tabs (Stripe / GitHub style) ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-3)",
          gap: 8,
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("info")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "info" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "info" ? "var(--color-fg)" : "var(--color-fg-3)",
            fontWeight: activeTab === "info" ? 600 : 500,
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: -1,
            transition: "color 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <User size={16} weight={activeTab === "info" ? "bold" : "regular"} />
          Thông tin cá nhân
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "password" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "password" ? "var(--color-fg)" : "var(--color-fg-3)",
            fontWeight: activeTab === "password" ? 600 : 500,
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: -1,
            transition: "color 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <LockSimple size={16} weight={activeTab === "password" ? "bold" : "regular"} />
          Bảo mật &amp; Đổi mật khẩu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "notifications" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "notifications" ? "var(--color-fg)" : "var(--color-fg-3)",
            fontWeight: activeTab === "notifications" ? 600 : 500,
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: -1,
            transition: "color 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <Bell size={16} weight={activeTab === "notifications" ? "bold" : "regular"} />
          Tùy chọn thông báo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "permissions" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "permissions" ? "var(--color-fg)" : "var(--color-fg-3)",
            fontWeight: activeTab === "permissions" ? 600 : 500,
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: -1,
            transition: "color 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          <ShieldCheck size={16} weight={activeTab === "permissions" ? "bold" : "regular"} />
          Quyền hạn vai trò
        </button>
      </div>

      {/* ── TAB 1: Thông tin cá nhân ── */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {/* Card: Personal Details Form */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Thông tin định danh</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                  Thông tin này xuất hiện trên hợp đồng thuê phòng và các hóa đơn dịch vụ.
                </div>
              </div>
            </div>

            <div className="card-body">
              <AnimatePresence>
                {infoSuccess && (
                  <motion.div
                    className="alert-success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                  >
                    <CheckCircle size={16} weight="fill" />
                    <span>Hồ sơ đã được cập nhật thành công.</span>
                  </motion.div>
                )}
                {infoError && (
                  <motion.div
                    className="alert-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                  >
                    <WarningCircle size={16} weight="fill" />
                    <span>{infoError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleUpdateInfo} style={{ display: "grid", gap: 18, maxWidth: 560 }}>
                {/* Email Address (Immutable) */}
                <div>
                  <label htmlFor="infoEmail" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Địa chỉ Email
                  </label>
                  <input
                    id="infoEmail"
                    type="email"
                    className="form-control"
                    value={profile?.email || ""}
                    disabled
                    style={{
                      background: "var(--color-surface-2)",
                      color: "var(--color-fg-3)",
                      cursor: "not-allowed",
                    }}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                    Email định danh chính của tài khoản, không thể thay đổi.
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label htmlFor="infoName" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Họ và tên
                  </label>
                  <input
                    id="infoName"
                    type="text"
                    className="form-control"
                    placeholder="Nhập họ và tên đầy đủ..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="infoPhone" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Số điện thoại liên lạc
                  </label>
                  <input
                    id="infoPhone"
                    type="tel"
                    className="form-control"
                    placeholder="Ví dụ: 0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                    {profile?.role === "tenant"
                      ? "Chủ trọ sẽ dùng số điện thoại này để tra cứu và gán hợp đồng phòng trọ vào tài khoản."
                      : "Số điện thoại hiển thị trên thông tin liên hệ của ban quản lý."}
                  </div>
                </div>

                {/* Save Button */}
                <div style={{ paddingTop: 4 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingInfo}
                    style={{ minWidth: 120 }}
                  >
                    <FloppyDisk size={16} />
                    <span>{savingInfo ? "Đang lưu..." : "Lưu thay đổi"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Context Card: Tenancy Info OR Operational Scope */}
          {profile?.role === "tenant" ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Thông tin lưu trú hiện tại</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                    Chi tiết hợp đồng phòng trọ đang liên kết với tài khoản này.
                  </div>
                </div>
                {profile.tenantInfo?.contractStatus && (
                  <span className="badge ready" style={{ fontSize: 11 }}>
                    Hợp đồng hiệu lực
                  </span>
                )}
              </div>

              <div className="card-body">
                {profile.tenantInfo?.propertyName ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                    <div style={{ padding: 14, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Tòa nhà / Nhà trọ</div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, marginTop: 4, color: "var(--color-fg)" }}>
                        {profile.tenantInfo.propertyName}
                      </div>
                    </div>

                    <div style={{ padding: 14, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Số phòng thuê</div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, marginTop: 4, color: "var(--color-primary)" }}>
                        Phòng {profile.tenantInfo.roomNumber}
                      </div>
                    </div>

                    <div style={{ padding: 14, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: 11, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Đại diện chủ nhà</div>
                      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, marginTop: 4, color: "var(--color-fg)" }}>
                        {profile.tenantInfo.landlordName || "Ban quản lý"}
                      </div>
                    </div>

                    <div style={{ padding: 14, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Cổng thanh toán</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: "var(--color-success)" }}>
                          Sẵn sàng quét VietQR
                        </div>
                      </div>
                      <Link href="/" className="btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }}>
                        Xem hóa đơn
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <Door size={36} style={{ color: "var(--color-fg-3)", opacity: 0.6, margin: "0 auto 8px" }} />
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 4 }}>Chưa gắn kết với phòng trọ nào</div>
                    <p className="text-muted" style={{ fontSize: 12, maxWidth: 420, margin: "0 auto" }}>
                      Vui lòng cập nhật chính xác Số điện thoại và gửi cho Chủ nhà để được thêm vào hợp đồng thuê phòng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Phạm vi quản lý</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                    Tổng quan quy mô các tòa nhà và số lượng phòng bạn đang phụ trách.
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
                  <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Nhà trọ quản lý</div>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--color-fg)", margin: "4px 0 2px" }}>
                      {profile?.staffInfo?.propertiesCount ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>Cơ sở hoạt động</div>
                  </div>

                  <div style={{ padding: 16, background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", textTransform: "uppercase", fontWeight: 600 }}>Tổng số phòng</div>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--color-success)", margin: "4px 0 2px" }}>
                      {profile?.staffInfo?.roomsCount ?? 0}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>Căn phòng cho thuê</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link href="/properties" className="btn-secondary" style={{ fontSize: "var(--text-xs)" }}>
                    Quản lý danh sách nhà trọ
                  </Link>
                  <Link href="/invoices" className="btn-secondary" style={{ fontSize: "var(--text-xs)" }}>
                    Lập hóa đơn tiền phòng
                  </Link>
                  <Link href="/meters" className="btn-secondary" style={{ fontSize: "var(--text-xs)" }}>
                    Ghi chỉ số điện nước
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Bảo mật & Đổi mật khẩu ── */}
      {activeTab === "password" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {/* Card: Change Password Form */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Đổi mật khẩu tài khoản</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                  Mật khẩu phải có độ dài tối thiểu 8 ký tự, bao gồm cả chữ cái và chữ số.
                </div>
              </div>
            </div>

            <div className="card-body">
              <AnimatePresence>
                {passwordSuccess && (
                  <motion.div
                    className="alert-success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                  >
                    <CheckCircle size={16} weight="fill" />
                    <span>Mật khẩu đã được thay đổi thành công!</span>
                  </motion.div>
                )}
                {passwordError && (
                  <motion.div
                    className="alert-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
                  >
                    <WarningCircle size={16} weight="fill" />
                    <span>{passwordError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 18, maxWidth: 520 }}>
                {/* Current Password */}
                <div>
                  <label htmlFor="currPw" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Mật khẩu hiện tại
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="currPw"
                      type={showCurrent ? "text" : "password"}
                      required
                      className="form-control"
                      placeholder="Nhập mật khẩu đang sử dụng..."
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      onClick={() => setShowCurrent((p) => !p)}
                      aria-label={showCurrent ? "Ẩn" : "Hiện"}
                    >
                      {showCurrent ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPw" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Mật khẩu mới
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="newPw"
                      type={showNew ? "text" : "password"}
                      required
                      className="form-control"
                      placeholder="Tối thiểu 8 ký tự..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      onClick={() => setShowNew((p) => !p)}
                      aria-label={showNew ? "Ẩn" : "Hiện"}
                    >
                      {showNew ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span className="text-muted">Độ mạnh:</span>
                        <strong style={{ color: pwStrengthColor }}>{pwStrengthLabel}</strong>
                      </div>
                      <div style={{ height: 4, borderRadius: 2, background: "var(--color-surface-3)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${(pwStrength / 4) * 100}%`,
                            background: pwStrengthColor,
                            transition: "all 0.25s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confPw" style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 6 }}>
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="confPw"
                      type={showConfirm ? "text" : "password"}
                      required
                      className="form-control"
                      placeholder="Nhập lại mật khẩu mới..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="input-icon-btn"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label={showConfirm ? "Ẩn" : "Hiện"}
                    >
                      {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Check criteria */}
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: hasMinLength ? "var(--color-success)" : "inherit" }}>
                    <Check size={13} weight={hasMinLength ? "bold" : "regular"} /> Tối thiểu 8 ký tự
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: hasLetterAndNumber ? "var(--color-success)" : "inherit" }}>
                    <Check size={13} weight={hasLetterAndNumber ? "bold" : "regular"} /> Chứa cả chữ cái và chữ số
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: isMatch ? "var(--color-success)" : "inherit" }}>
                    <Check size={13} weight={isMatch ? "bold" : "regular"} /> Mật khẩu xác nhận trùng khớp
                  </div>
                </div>

                {/* Submit button */}
                <div style={{ paddingTop: 4 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingPassword || !currentPassword || !hasMinLength || !isMatch}
                    style={{ minWidth: 150 }}
                  >
                    <LockSimple size={16} />
                    <span>{savingPassword ? "Đang xử lý..." : "Cập nhật mật khẩu"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Card: Active Sessions / Security Info */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Phiên đăng nhập &amp; Thiết bị</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                  Danh sách phiên hoạt động gần đây của tài khoản này.
                </div>
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <DeviceMobile size={22} style={{ color: "var(--color-fg-2)" }} />
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                      Trình duyệt Web hiện tại
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--color-fg-3)" }}>
                      Mã hóa chuẩn bcrypt • Phiên hợp lệ
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-success)" }}>
                  <span className="pulse-indicator" style={{ width: 6, height: 6 }} />
                  <span>Đang hoạt động</span>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 12, lineHeight: 1.5 }}>
                Lưu ý: Khi bạn hoàn tất đổi mật khẩu, toàn bộ các phiên đăng nhập trên các thiết bị khác sẽ được tự động thu hồi (revoke) để đảm bảo an toàn tuyệt đối.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Tùy chọn thông báo ── */}
      {activeTab === "notifications" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Cấu hình nhận thông báo</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                Lựa chọn các loại thông báo tự động xuất hiện trên biểu tượng chuông hệ thống.
              </div>
            </div>
            <AnimatePresence>
              {notifSavedToast && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: 11.5, color: "var(--color-success)", display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <CheckCircle size={14} weight="fill" /> Đã lưu tùy chọn
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="card-body" style={{ display: "grid", gap: 14 }}>
            {/* Notification Row 1 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Hóa đơn tiền phòng &amp; Dịch vụ
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                  Nhận thông báo khi có hóa đơn mới phát hành hoặc nhắc nhở trước hạn thanh toán.
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

            {/* Notification Row 2 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Báo hỏng &amp; Sự cố thiết bị
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                  Cập nhật tiến độ xử lý và phản hồi khi có yêu cầu sửa chữa điện, nước, phòng trọ.
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

            {/* Notification Row 3 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Xác nhận giao dịch thanh toán
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                  Thông báo tức thì khi tiền nộp phòng được xác nhận và ghi nhận vào hệ thống.
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

            {/* Notification Row 4 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Thông báo quản trị &amp; Lịch định kỳ
                </div>
                <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 2 }}>
                  Lời nhắc ghi nhận chỉ số điện nước cuối tháng và thông tin vận hành từ ban quản lý.
                </div>
              </div>
              <label className="profile-switch">
                <input
                  type="checkbox"
                  checked={notifSystem}
                  onChange={() => handleToggleNotif(setNotifSystem, notifSystem)}
                />
                <span className="profile-switch-slider" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Quyền hạn vai trò ── */}
      {activeTab === "permissions" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quyền hạn &amp; Phạm vi truy cập</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                Chi tiết các đặc quyền hệ thống gắn với vai trò tài khoản hiện tại của bạn.
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                background: roleBadgeStyle.bg,
                color: roleBadgeStyle.text,
                border: `1px solid ${roleBadgeStyle.border}`,
              }}
            >
              <RoleBadgeIcon size={14} weight="bold" />
              {roleText}
            </span>
          </div>

          <div className="card-body">
            <div style={{ marginBottom: 16, fontSize: "var(--text-sm)", color: "var(--color-fg-2)" }}>
              {profile?.role === "owner" && (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Với vai trò <strong>Chủ nhà (Owner)</strong>, bạn nắm quyền sở hữu và quản trị cao nhất trên hệ thống, bao gồm cấu hình tài khoản nhận tiền VietQR, phân quyền quản lý, và toàn quyền quản lý tài chính dòng tiền.
                </p>
              )}
              {profile?.role === "manager" && (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Với vai trò <strong>Quản lý (Manager)</strong>, bạn được ủy quyền phụ trách vận hành tòa nhà, xếp phòng, ghi nhận chỉ số điện nước, lập hóa đơn và điều phối khắc phục sự cố thiết bị.
                </p>
              )}
              {profile?.role === "tenant" && (
                <p style={{ margin: 0, lineHeight: 1.6 }}>
                  Với vai trò <strong>Khách cư dân (Tenant)</strong>, bạn có quyền truy cập Cổng Khách Thuê để xem hóa đơn tiền phòng chi tiết, quét mã VietQR Napas, và gửi yêu cầu sửa chữa hỏng hóc thiết bị trực tiếp cho chủ nhà.
                </p>
              )}
            </div>

            {/* Privileges List */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-fg-3)", marginBottom: 2 }}>
                Danh mục chức năng khả dụng
              </div>

              {profile?.role === "owner" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Thiết lập tòa nhà, phòng trọ và cấu hình tài khoản ngân hàng VietQR Napas</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Ký hợp đồng thuê phòng và xếp phòng cho khách cư dân</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Ghi chỉ số Điện &amp; Nước, tự động tính toán lũy kế tiêu thụ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Phát hành hóa đơn, in phiếu thu A4 và theo dõi thanh toán</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Xem báo cáo tổng quan dòng tiền và tỷ lệ lấp đầy phòng</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Tiếp nhận và điều phối giải quyết các sự cố thiết bị phòng trọ</span>
                  </div>
                </>
              ) : profile?.role === "manager" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Tạo hợp đồng thuê phòng và bàn giao phòng trọ cho khách</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Nhập chỉ số công tơ Điện &amp; Nước hàng tháng</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Lập hóa đơn tiền trọ và ghi nhận khoản thu nộp</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Cập nhật trạng thái sửa chữa, tiếp nhận sự cố kỹ thuật phòng trọ</span>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Xem chi tiết hợp đồng thuê, thông tin phòng và người đại diện chủ nhà</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Xem chi tiết phiếu thu tiền phòng, giá điện nước và hạn đóng</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Quét mã VietQR thanh toán nhanh qua ứng dụng ngân hàng</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Gửi yêu cầu báo hỏng hóc, sự cố thiết bị điện nước phòng trọ</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--text-sm)" }}>
                    <CheckFat size={16} weight="fill" style={{ color: "var(--color-success)" }} />
                    <span>Nhận thông báo cập nhật tình hình xử lý sửa chữa thiết bị</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
