"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCircle,
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
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notifications preference toggles (mock preference states)
  const [notifInvoice, setNotifInvoice] = useState(true);
  const [notifMaintenance, setNotifMaintenance] = useState(true);
  const [notifPayment, setNotifPayment] = useState(true);

  // Password strength
  const pwStrength =
    newPassword.length === 0
      ? 0
      : newPassword.length < 6
      ? 1
      : newPassword.length < 10
      ? 2
      : 3;
  const pwStrengthLabel = ["", "Yếu", "Trung bình", "Mạnh"][pwStrength];
  const pwStrengthColor = [
    "",
    "var(--color-danger, #ef4444)",
    "var(--color-warning, #f59e0b)",
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

  if (authLoading || (loading && !profile)) {
    return (
      <main className="main-container">
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="skeleton" style={{ height: 160, borderRadius: "var(--radius-lg)" }} />
          <div className="card skeleton" style={{ height: 320 }} />
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

  const roleText =
    profile?.role === "owner" ? "Chủ nhà" :
    profile?.role === "manager" ? "Quản lý" : "Khách thuê";

  return (
    <main className="main-container">
      {/* ── Profile Header Banner ── */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)",
          borderColor: "rgba(37, 99, 235, 0.25)",
          padding: "var(--space-4)",
          marginBottom: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {/* Avatar Icon */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background:
                profile?.role === "owner"
                  ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                  : profile?.role === "manager"
                  ? "linear-gradient(135deg, #0ea5e9, #0284c7)"
                  : "linear-gradient(135deg, #10b981, #059669)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
          >
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : <UserCircle size={40} />}
          </div>

          {/* Info Details */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0 }}>
                {profile?.fullName || profile?.email}
              </h1>
              <span className={`role-tag ${profile?.role}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                {roleText}
              </span>
            </div>

            <p className="text-muted" style={{ margin: "2px 0 6px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 6 }}>
              <EnvelopeSimple size={14} /> {profile?.email}
              {profile?.phone && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <Phone size={14} /> {profile.phone}
                </>
              )}
            </p>

            <div style={{ fontSize: 11, color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={12} />
              Thành viên từ {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "—"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border)", marginBottom: "var(--space-3)", paddingBottom: 2 }}>
        <button
          type="button"
          className={`btn-ghost ${activeTab === "info" ? "active" : ""}`}
          style={{
            fontWeight: activeTab === "info" ? 700 : 500,
            borderBottom: activeTab === "info" ? "2px solid var(--color-primary)" : "2px solid transparent",
            borderRadius: "4px 4px 0 0",
            padding: "8px 14px",
            fontSize: "var(--text-sm)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("info")}
        >
          <UserCircle size={16} /> Thông tin cá nhân
        </button>

        <button
          type="button"
          className={`btn-ghost ${activeTab === "password" ? "active" : ""}`}
          style={{
            fontWeight: activeTab === "password" ? 700 : 500,
            borderBottom: activeTab === "password" ? "2px solid var(--color-primary)" : "2px solid transparent",
            borderRadius: "4px 4px 0 0",
            padding: "8px 14px",
            fontSize: "var(--text-sm)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("password")}
        >
          <LockSimple size={16} /> Đổi mật khẩu
        </button>

        <button
          type="button"
          className={`btn-ghost ${activeTab === "permissions" ? "active" : ""}`}
          style={{
            fontWeight: activeTab === "permissions" ? 700 : 500,
            borderBottom: activeTab === "permissions" ? "2px solid var(--color-primary)" : "2px solid transparent",
            borderRadius: "4px 4px 0 0",
            padding: "8px 14px",
            fontSize: "var(--text-sm)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("permissions")}
        >
          <ShieldCheck size={16} /> Phân quyền &amp; Thông báo
        </button>
      </div>

      {/* ── TAB 1: Personal Info ── */}
      {activeTab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-3)" }}>
          {/* Edit Form */}
          <div className="card">
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <UserCircle size={20} style={{ color: "var(--color-primary)" }} /> Cập nhật thông tin
            </h2>

            <AnimatePresence>
              {infoSuccess && (
                <motion.div
                  className="alert-success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}
                >
                  <CheckCircle size={16} weight="fill" /> Đã lưu thông tin hồ sơ thành công!
                </motion.div>
              )}
              {infoError && (
                <motion.div
                  className="alert-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginBottom: 14 }}
                >
                  {infoError}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleUpdateInfo} style={{ display: "grid", gap: 14 }}>
              <div>
                <label className="field-label" htmlFor="infoEmail">Địa chỉ Email</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="infoEmail"
                    type="email"
                    className="input-field"
                    value={profile?.email || ""}
                    disabled
                    style={{ opacity: 0.7, cursor: "not-allowed", background: "var(--color-surface-hover)" }}
                  />
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--color-success, #10b981)", display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={14} weight="fill" /> Đã xác thực
                  </span>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="infoName">Họ và tên</label>
                <input
                  id="infoName"
                  type="text"
                  className="input-field"
                  placeholder="Nhập họ và tên đầy đủ..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="infoPhone">Số điện thoại</label>
                <input
                  id="infoPhone"
                  type="tel"
                  className="input-field"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {profile?.role === "tenant" && (
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                    Số điện thoại giúp Chủ nhà tìm thấy hồ sơ của bạn khi tạo hợp đồng phòng trọ.
                  </p>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingInfo}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <FloppyDisk size={16} />
                  {savingInfo ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>

          {/* Context Overview Card */}
          <div className="card">
            {profile?.role === "tenant" ? (
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                  <House size={20} style={{ color: "var(--color-primary)" }} /> Tình trạng phòng thuê
                </h2>

                {profile.tenantInfo?.propertyName ? (
                  <div style={{ display: "grid", gap: 10, fontSize: "var(--text-xs)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                      <span className="text-muted">Nhà trọ:</span>
                      <strong>{profile.tenantInfo.propertyName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                      <span className="text-muted">Số phòng:</span>
                      <strong>Phòng {profile.tenantInfo.roomNumber}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                      <span className="text-muted">Chủ nhà / Quản lý:</span>
                      <strong>{profile.tenantInfo.landlordName || "Ban quản lý"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                      <span className="text-muted">Trạng thái hợp đồng:</span>
                      <span className="badge ready" style={{ fontSize: 10 }}>Đang hiệu lực</span>
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <a href="/" className="btn-secondary" style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)" }}>
                        <Receipt size={14} /> Xem chi tiết tại Cổng Khách Thuê
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <Buildings size={36} style={{ color: "var(--color-fg-3)", opacity: 0.6, margin: "0 auto 8px" }} />
                    <p style={{ margin: "0 0 8px", fontSize: "var(--text-xs)", color: "var(--color-fg-2)" }}>
                      Tài khoản của bạn chưa được liên kết với phòng trọ nào.
                    </p>
                    <p className="text-muted" style={{ fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                      Vui lòng cập nhật đúng Số điện thoại và gửi cho Chủ nhà để được thêm vào hợp đồng.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                  <Buildings size={20} style={{ color: "var(--color-primary)" }} /> Quy mô quản lý
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 14, borderRadius: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-primary)" }}>
                      {profile?.staffInfo?.propertiesCount ?? 0}
                    </div>
                    <div className="text-muted" style={{ fontSize: "var(--text-xs)", marginTop: 2 }}>Nhà trọ quản lý</div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 8, background: "var(--color-surface)", border: "1px solid var(--color-border)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-success, #10b981)" }}>
                      {profile?.staffInfo?.roomsCount ?? 0}
                    </div>
                    <div className="text-muted" style={{ fontSize: "var(--text-xs)", marginTop: 2 }}>Tổng số phòng</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <a href="/properties" className="btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: "var(--text-xs)" }}>
                    Quản lý Nhà trọ
                  </a>
                  <a href="/invoices" className="btn-secondary" style={{ flex: 1, justifyContent: "center", fontSize: "var(--text-xs)" }}>
                    Lập hóa đơn
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: Change Password ── */}
      {activeTab === "password" && (
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <LockSimple size={20} style={{ color: "var(--color-primary)" }} /> Đổi mật khẩu đăng nhập
          </h2>

          <AnimatePresence>
            {passwordSuccess && (
              <motion.div
                className="alert-success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}
              >
                <CheckCircle size={16} weight="fill" /> Đã cập nhật mật khẩu mới thành công!
              </motion.div>
            )}
            {passwordError && (
              <motion.div
                className="alert-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 14 }}
              >
                {passwordError}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="currPw">Mật khẩu hiện tại</label>
              <div style={{ position: "relative" }}>
                <input
                  id="currPw"
                  type={showCurrent ? "text" : "password"}
                  required
                  className="input-field"
                  style={{ paddingRight: 36 }}
                  placeholder="Nhập mật khẩu hiện tại..."
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 4 }}
                  onClick={() => setShowCurrent((p) => !p)}
                  aria-label={showCurrent ? "Ẩn" : "Hiện"}
                >
                  {showCurrent ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label" htmlFor="newPw">Mật khẩu mới (tối thiểu 8 ký tự)</label>
              <div style={{ position: "relative" }}>
                <input
                  id="newPw"
                  type={showNew ? "text" : "password"}
                  required
                  className="input-field"
                  style={{ paddingRight: 36 }}
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: 4 }}
                  onClick={() => setShowNew((p) => !p)}
                  aria-label={showNew ? "Ẩn" : "Hiện"}
                >
                  {showNew ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span className="text-muted">Độ mạnh mật khẩu:</span>
                    <span style={{ fontWeight: 700, color: pwStrengthColor }}>{pwStrengthLabel}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--color-border)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(pwStrength / 3) * 100}%`,
                        background: pwStrengthColor,
                        transition: "all 0.25s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="field-label" htmlFor="confPw">Xác nhận mật khẩu mới</label>
              <input
                id="confPw"
                type="password"
                required
                className="input-field"
                placeholder="Nhập lại mật khẩu mới..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={savingPassword || !currentPassword || !newPassword}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <LockSimple size={16} />
                {savingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: Permissions & Notifications ── */}
      {activeTab === "permissions" && (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {/* Permissions Matrix */}
          <div className="card">
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={20} style={{ color: "var(--color-primary)" }} /> Quyền hạn vai trò {roleText}
            </h2>
            <p className="text-muted" style={{ margin: "0 0 16px", fontSize: "var(--text-xs)" }}>
              Hệ thống phân quyền chi tiết giữa Chủ nhà, Quản lý phòng và Khách thuê nhằm đảm bảo tính minh bạch và an toàn dữ liệu.
            </p>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tính năng / Quyền hạn</th>
                    <th style={{ textAlign: "center" }}>Chủ nhà (Owner)</th>
                    <th style={{ textAlign: "center" }}>Quản lý (Manager)</th>
                    <th style={{ textAlign: "center" }}>Khách thuê (Tenant)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Thêm &amp; Thiết lập Nhà trọ, STK VietQR</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>—</td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>—</td>
                  </tr>
                  <tr>
                    <td>Tạo hợp đồng &amp; Xếp phòng trọ</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>—</td>
                  </tr>
                  <tr>
                    <td>Ghi chỉ số Điện &amp; Nước tháng</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>Xem lịch sử</td>
                  </tr>
                  <tr>
                    <td>Phát hành hóa đơn &amp; Ghi nhận tiền nộp</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>Xem &amp; Trả tiền</td>
                  </tr>
                  <tr>
                    <td>Quét mã VietQR Napas &amp; In hóa đơn A4</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                  </tr>
                  <tr>
                    <td>Báo hỏng hóc &amp; Sự cố thiết bị phòng</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}>Tiếp nhận &amp; Sửa</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}>Tiếp nhận &amp; Sửa</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}>Gửi yêu cầu</td>
                  </tr>
                  <tr>
                    <td>Nhận thông báo tự động (Hóa đơn, Sự cố, Thanh toán)</td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                    <td style={{ textAlign: "center", color: "#16a34a" }}><Check size={16} weight="bold" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card">
            <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={20} style={{ color: "var(--color-primary)" }} /> Cài đặt nhận thông báo
            </h2>
            <p className="text-muted" style={{ margin: "0 0 14px", fontSize: "var(--text-xs)" }}>
              Chọn các thông báo bạn muốn nhận trên chuông báo hệ thống và ứng dụng.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>Hóa đơn tiền phòng &amp; Dịch vụ</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Thông báo khi hóa đơn mới được phát hành hoặc nhắc hạn đóng tiền.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifInvoice}
                  onChange={(e) => setNotifInvoice(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
              </label>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>Sự cố &amp; Yêu cầu sửa chữa</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Thông báo khi có người báo sự cố mới hoặc tiến độ sửa chữa thay đổi.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifMaintenance}
                  onChange={(e) => setNotifMaintenance(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
              </label>

              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "var(--text-xs)" }}>Xác nhận thanh toán</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Thông báo ngay khi thanh toán được ghi nhận vào hệ thống.</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPayment}
                  onChange={(e) => setNotifPayment(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
