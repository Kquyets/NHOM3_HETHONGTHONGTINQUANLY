"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  Phone,
  IdentificationCard,
  CalendarBlank,
  PencilSimple,
  Trash,
  X,
  MagnifyingGlass,
  Check,
  DownloadSimple,
  MapPin,
  Image as ImageIcon,
  FirstAid,
  Buildings,
  Door,
  WarningCircle,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { exportTableToCsv } from "../../utils/export-csv";
import { validateVietnamesePhone } from "../../utils/form-validation";
import type { TenantRow } from "../../modules/tenants/tenant.service";
import type { ContractRow } from "../../modules/contracts/contract.service";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

/* ── Form Panel ──────────────────────────────────────────────────── */
function SlidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: "var(--space-3)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <motion.button
          type="button"
          className="btn-ghost"
          style={{ padding: "5px 10px" }}
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Đóng"
        >
          <X size={14} />
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

type TenantFormData = {
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  hometown: string;
  vehicleNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  idCardFrontUrl: string;
  idCardBackUrl: string;
};

/* ── Tenant Form ─────────────────────────────────────────────────── */
function TenantForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Partial<TenantRow>;
  submitting: boolean;
  onSubmit: (data: TenantFormData) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [nationalId, setNationalId] = useState(initial?.nationalId ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [hometown, setHometown] = useState(initial?.hometown ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(initial?.vehicleNumber ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(initial?.emergencyContactName ?? "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(initial?.emergencyContactPhone ?? "");
  const [idCardFrontUrl, setIdCardFrontUrl] = useState(initial?.idCardFrontUrl ?? "");
  const [idCardBackUrl, setIdCardBackUrl] = useState(initial?.idCardBackUrl ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (phone) {
      const err = validateVietnamesePhone(phone);
      if (err) {
        setPhoneError(err);
        return;
      }
    }
    setPhoneError(null);
    onSubmit({
      fullName,
      phone,
      nationalId,
      birthDate,
      hometown,
      vehicleNumber,
      emergencyContactName,
      emergencyContactPhone,
      idCardFrontUrl,
      idCardBackUrl,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 1. Thông tin cá nhân */}
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-primary)", marginBottom: "var(--space-2)" }}>
        1. Thông tin cá nhân cơ bản
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: "var(--space-2)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-name">Họ và tên *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <IdentificationCard size={15} />
            </span>
            <input
              id="tenant-name"
              type="text"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-phone">Số điện thoại</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <Phone size={15} />
            </span>
            <input
              id="tenant-phone"
              type="tel"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: 0901 234 567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
            />
          </div>
          {phoneError && (
            <div style={{ color: "var(--color-danger, #ef4444)", fontSize: 12, marginTop: 4 }}>
              {phoneError}
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-national-id">Số CCCD / CMND</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <IdentificationCard size={15} />
            </span>
            <input
              id="tenant-national-id"
              type="text"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: 001201012345"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-birth">Ngày sinh</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CalendarBlank size={15} />
            </span>
            <input
              id="tenant-birth"
              type="date"
              className="form-control"
              style={{ paddingLeft: 34 }}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Quê quán & Phương tiện */}
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-primary)", marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>
        2. Thường trú (Khai báo tạm trú) & Bãi đỗ xe
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-hometown">Nơi thường trú / Quê quán (Khai báo tạm trú CA)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <MapPin size={15} />
            </span>
            <input
              id="tenant-hometown"
              type="text"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: Xã Yên Phong, Huyện Yên Phong, Bắc Ninh"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="tenant-vehicle">Biển số phương tiện (Xe máy / xe đạp điện)</label>
          <input
            id="tenant-vehicle"
            type="text"
            className="form-control"
            placeholder="VD: 29B1-123.45 / 99K1-8888"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Liên hệ khẩn cấp */}
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-primary)", marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>
        3. Liên hệ khẩn cấp (Người thân)
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="emergency-name">Họ tên người thân khẩn cấp</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <FirstAid size={15} />
            </span>
            <input
              id="emergency-name"
              type="text"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: Bố - Nguyễn Văn B"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="emergency-phone">SĐT người thân khẩn cấp</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <Phone size={15} />
            </span>
            <input
              id="emergency-phone"
              type="tel"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: 0912 345 678"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 4. Quản lý ảnh CCCD */}
      <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-primary)", marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>
        4. Ảnh căn cước công dân (CCCD 2 mặt)
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="cccd-front">Ảnh mặt trước CCCD (URL)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <ImageIcon size={15} />
            </span>
            <input
              id="cccd-front"
              type="url"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="https://...cccd-mat-truoc.jpg"
              value={idCardFrontUrl}
              onChange={(e) => setIdCardFrontUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="cccd-back">Ảnh mặt sau CCCD (URL)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <ImageIcon size={15} />
            </span>
            <input
              id="cccd-back"
              type="url"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="https://...cccd-mat-sau.jpg"
              value={idCardBackUrl}
              onChange={(e) => setIdCardBackUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-3)" }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Hủy
        </button>
        <motion.button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {submitting ? (
            <><span className="spinner" aria-hidden="true" />Đang lưu...</>
          ) : (
            <><Check size={13} weight="bold" />{submitLabel}</>
          )}
        </motion.button>
      </div>
    </form>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function TenantsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [occupancyFilter, setOccupancyFilter] = useState<"all" | "active" | "unassigned">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [viewingIdCardsTenant, setViewingIdCardsTenant] = useState<TenantRow | null>(null);

  // Confirm delete modal state
  const [deletingTenant, setDeletingTenant] = useState<TenantRow | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, contractRes] = await Promise.all([
        apiClient<{ tenants: TenantRow[] }>("/api/tenants"),
        apiClient<{ contracts: ContractRow[] }>("/api/contracts").catch(() => ({ contracts: [] })),
      ]);
      setTenants(res.tenants);
      setContracts(contractRes.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách khách thuê.");
    } finally {
      setLoading(false);
    }
  }, []);

  const getTenantContract = useCallback(
    (tenant: TenantRow) => {
      return contracts.find(
        (c) =>
          c.status === "active" &&
          c.tenants.some(
            (t) =>
              t.id === tenant.id ||
              (Boolean(t.phone) && Boolean(tenant.phone) && t.phone === tenant.phone),
          ),
      );
    },
    [contracts],
  );

  const uniqueProperties = useMemo(
    () => Array.from(new Set(contracts.filter((c) => Boolean(c.propertyName)).map((c) => c.propertyName))),
    [contracts],
  );

  const activeTenantsCount = useMemo(
    () => tenants.filter((t) => Boolean(getTenantContract(t))).length,
    [tenants, getTenantContract],
  );

  const unassignedTenantsCount = tenants.length - activeTenantsCount;

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        (t.phone ?? "").includes(search) ||
        (t.nationalId ?? "").includes(search) ||
        (t.hometown ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.vehicleNumber ?? "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      const contract = getTenantContract(t);
      if (propertyFilter !== "all" && contract?.propertyName !== propertyFilter) return false;

      if (occupancyFilter === "active" && !contract) return false;
      if (occupancyFilter === "unassigned" && contract) return false;

      return true;
    });
  }, [tenants, search, propertyFilter, occupancyFilter, getTenantContract]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadTenants();
  }, [user, authLoading, router, loadTenants]);

  const handleCreate = async (data: TenantFormData) => {
    try {
      setSubmittingAdd(true);
      await apiClient("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          phone: data.phone.trim() || null,
          nationalId: data.nationalId.trim() || null,
          birthDate: data.birthDate || null,
          hometown: data.hometown.trim() || null,
          vehicleNumber: data.vehicleNumber.trim() || null,
          emergencyContactName: data.emergencyContactName.trim() || null,
          emergencyContactPhone: data.emergencyContactPhone.trim() || null,
          idCardFrontUrl: data.idCardFrontUrl.trim() || null,
          idCardBackUrl: data.idCardBackUrl.trim() || null,
        }),
      });
      setShowAdd(false);
      await loadTenants();
      showToast("success", "Đã thêm khách thuê mới thành công!");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Tạo khách thuê thất bại.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdate = async (data: TenantFormData) => {
    if (!editingTenant) return;
    try {
      setSubmittingEdit(true);
      await apiClient(`/api/tenants/${editingTenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          phone: data.phone.trim() || null,
          nationalId: data.nationalId.trim() || null,
          birthDate: data.birthDate || null,
          hometown: data.hometown.trim() || null,
          vehicleNumber: data.vehicleNumber.trim() || null,
          emergencyContactName: data.emergencyContactName.trim() || null,
          emergencyContactPhone: data.emergencyContactPhone.trim() || null,
          idCardFrontUrl: data.idCardFrontUrl.trim() || null,
          idCardBackUrl: data.idCardBackUrl.trim() || null,
        }),
      });
      setEditingTenant(null);
      await loadTenants();
      showToast("success", "Đã cập nhật thông tin khách thuê!");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Cập nhật khách thuê thất bại.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTenant) return;
    try {
      setSubmittingDelete(true);
      await apiClient(`/api/tenants/${deletingTenant.id}`, { method: "DELETE" });
      setDeletingTenant(null);
      await loadTenants();
      showToast("success", "Đã xóa khách thuê thành công!");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Không thể xóa khách thuê.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="main-container">
          <div className="loading-indicator">
            <span className="spinner" role="status" aria-label="Đang tải" />
            Đang xác thực thông tin...
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const exportTenantsCSV = () => {
    if (tenants.length === 0) return;
    const headers = [
      "Mã Khách Thuê",
      "Họ và Tên",
      "Số điện thoại",
      "Nhà trọ",
      "Số phòng",
      "Trạng thái thuê",
      "Ngày sinh",
      "Thường trú (Khai báo tạm trú)",
      "Biển số phương tiện",
      "Người thân khẩn cấp",
      "SĐT khẩn cấp",
      "Ngày tạo hồ sơ",
    ];
    const rows = filtered.map((t) => {
      const contract = getTenantContract(t);
      return [
        t.id,
        t.fullName,
        t.phone || "",
        contract?.propertyName || "—",
        contract ? `Phòng ${contract.roomNumber}` : "—",
        contract ? "Đang thuê" : "Chưa gán",
        formatDate(t.birthDate),
        t.hometown || "",
        t.vehicleNumber || "",
        t.emergencyContactName || "",
        t.emergencyContactPhone || "",
        t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "",
      ];
    });

    exportTableToCsv(
      `Danh_sach_khach_thue_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows,
    );
  };

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {/* Page header */}
        <motion.div
          className="page-title-row"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="page-title">Khách thuê</h1>
            <p className="page-desc">Quản lý hồ sơ khách thuê và thông tin liên hệ.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <motion.button
              type="button"
              className="btn-secondary"
              onClick={exportTenantsCSV}
              disabled={tenants.length === 0}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Xuất danh sách khách thuê ra file CSV"
            >
              <DownloadSimple size={14} />
              Xuất CSV
            </motion.button>
            <motion.button
              type="button"
              className={showAdd ? "btn-secondary" : "btn-primary"}
              onClick={() => { setShowAdd(!showAdd); setEditingTenant(null); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {showAdd ? <X size={14} /> : <UserPlus size={14} weight="bold" />}
              {showAdd ? "Đóng" : "Thêm khách thuê"}
            </motion.button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="alert-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: "var(--space-2)" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Panel */}
        <AnimatePresence>
          {showAdd && (
            <SlidePanel title="Thêm khách thuê mới" onClose={() => setShowAdd(false)}>
              <TenantForm
                submitting={submittingAdd}
                onSubmit={handleCreate}
                onCancel={() => setShowAdd(false)}
                submitLabel="Lưu khách thuê"
              />
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Edit Panel */}
        <AnimatePresence>
          {editingTenant && (
            <SlidePanel
              title={`Chỉnh sửa — ${editingTenant.fullName}`}
              onClose={() => setEditingTenant(null)}
            >
              <TenantForm
                initial={editingTenant}
                submitting={submittingEdit}
                onSubmit={handleUpdate}
                onCancel={() => setEditingTenant(null)}
                submitLabel="Lưu thay đổi"
              />
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Filter & Search Bar */}
        {tenants.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              backgroundColor: "var(--color-bg-panel, #ffffff)",
              padding: "12px 16px",
              borderRadius: "var(--radius-lg, 12px)",
              border: "1px solid var(--color-border)",
              marginBottom: "var(--space-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
                  <MagnifyingGlass size={14} />
                </span>
                <input
                  type="search"
                  className="form-control"
                  style={{ paddingLeft: 30, width: 230, height: 34, fontSize: "var(--text-xs)" }}
                  placeholder="Tìm tên, SĐT, quê quán..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Tìm kiếm khách thuê"
                />
              </div>

              {uniqueProperties.length > 0 && (
                <select
                  className="form-control"
                  style={{ height: 34, fontSize: "var(--text-xs)", minWidth: 160 }}
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                >
                  <option value="all">🏢 Tất cả nhà trọ</option>
                  {uniqueProperties.map((p) => (
                    <option key={p} value={p}>
                      🏠 {p}
                    </option>
                  ))}
                </select>
              )}

              {/* Status Segment */}
              <div style={{ display: "inline-flex", padding: 2, backgroundColor: "var(--color-bg-subtle)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                <button
                  type="button"
                  onClick={() => setOccupancyFilter("all")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    fontSize: "11px",
                    border: "none",
                    backgroundColor: occupancyFilter === "all" ? "var(--color-primary)" : "transparent",
                    color: occupancyFilter === "all" ? "#fff" : "var(--color-fg-2)",
                    fontWeight: occupancyFilter === "all" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  Tất cả ({tenants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOccupancyFilter("active")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    fontSize: "11px",
                    border: "none",
                    backgroundColor: occupancyFilter === "active" ? "var(--color-primary)" : "transparent",
                    color: occupancyFilter === "active" ? "#fff" : "var(--color-fg-2)",
                    fontWeight: occupancyFilter === "active" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  🟢 Đang ở ({activeTenantsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOccupancyFilter("unassigned")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 4,
                    fontSize: "11px",
                    border: "none",
                    backgroundColor: occupancyFilter === "unassigned" ? "var(--color-primary)" : "transparent",
                    color: occupancyFilter === "unassigned" ? "#fff" : "var(--color-fg-2)",
                    fontWeight: occupancyFilter === "unassigned" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  ⚪ Chưa gán ({unassignedTenantsCount})
                </button>
              </div>
            </div>

            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
              Hiển thị: <strong>{filtered.length}</strong> khách
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: "flex", gap: 16 }}>
                  <div className="skeleton" style={{ flex: 2, height: 14 }} />
                  <div className="skeleton" style={{ flex: 1, height: 14 }} />
                  <div className="skeleton" style={{ flex: 1, height: 14 }} />
                  <div className="skeleton" style={{ width: 70, height: 14 }} />
                </div>
              ))}
            </div>
          </div>
        ) : tenants.length === 0 ? (
          <motion.div
            className="card"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={28} />
              </div>
              <p className="text-muted" style={{ margin: 0 }}>
                Chưa có khách thuê nào. Hãy thêm khách thuê để quản lý hợp đồng.
              </p>
              <motion.button
                type="button"
                className="btn-primary"
                onClick={() => setShowAdd(true)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <UserPlus size={14} weight="bold" />
                Thêm khách thuê ngay
              </motion.button>
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-state">
              <div className="empty-icon">
                <MagnifyingGlass size={24} />
              </div>
              <p className="text-muted" style={{ margin: "0 0 var(--space-2)" }}>
                {search ? (
                  <>Không tìm thấy khách thuê nào khớp với &ldquo;{search}&rdquo;.</>
                ) : (
                  <>Không tìm thấy khách thuê nào phù hợp với bộ lọc hiện tại.</>
                )}
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "var(--text-xs)" }}
                onClick={() => {
                  setSearch("");
                  setPropertyFilter("all");
                  setOccupancyFilter("all");
                }}
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ padding: 0 }}
          >
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Khách thuê</th>
                    <th>Phòng / Nhà trọ</th>
                    <th>Thường trú / Khai báo tạm trú</th>
                    <th>Biển số xe</th>
                    <th>Liên hệ khẩn cấp</th>
                    <th>CCCD 2 mặt</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tenant, i) => (
                    <motion.tr
                      key={tenant.id}
                      custom={i}
                      initial="hidden"
                      animate="visible"
                      variants={fadeUp}
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: "var(--radius-md)",
                            background: "var(--color-primary-light)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)",
                            flexShrink: 0,
                          }}>
                            {tenant.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{tenant.fullName}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                              {tenant.phone ? (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <Phone size={11} /> {tenant.phone}
                                </span>
                              ) : null}
                              {tenant.nationalId && (
                                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  • CCCD: {tenant.nationalId}
                                </span>
                              )}
                              {tenant.birthDate && <span>• NS: {formatDate(tenant.birthDate)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {(() => {
                          const contract = getTenantContract(tenant);
                          if (!contract) {
                            return (
                              <span className="badge neutral" style={{ fontSize: "11px" }}>
                                ⚪ Chưa gán phòng
                              </span>
                            );
                          }
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span className="badge ready" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                                <Door size={12} weight="bold" />
                                Phòng {contract.roomNumber}
                              </span>
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 3 }}>
                                <Buildings size={11} /> {contract.propertyName}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      <td style={{ maxWidth: 220 }}>
                        {tenant.hometown ? (
                          <span
                            title={tenant.hometown}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: "var(--text-xs)",
                              color: "var(--color-fg-2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <MapPin size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {tenant.hometown}
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Chưa khai báo</span>
                        )}
                      </td>

                      <td>
                        {tenant.vehicleNumber ? (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 4,
                            backgroundColor: "var(--color-bg-subtle)",
                            border: "1px solid var(--color-border)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-xs)",
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                          }}>
                            {tenant.vehicleNumber}
                          </span>
                        ) : (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>—</span>
                        )}
                      </td>

                      <td>
                        {tenant.emergencyContactName ? (
                          <div style={{ fontSize: "var(--text-xs)" }}>
                            <span style={{ fontWeight: 500, color: "var(--color-fg-2)" }}>{tenant.emergencyContactName}</span>
                            {tenant.emergencyContactPhone && (
                              <div style={{ color: "var(--color-fg-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                <Phone size={10} /> {tenant.emergencyContactPhone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>—</span>
                        )}
                      </td>

                      <td>
                        {tenant.idCardFrontUrl || tenant.idCardBackUrl ? (
                          <motion.button
                            type="button"
                            className="badge ready"
                            style={{ border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px" }}
                            onClick={() => setViewingIdCardsTenant(tenant)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <ImageIcon size={12} />
                            <span>Xem CCCD</span>
                          </motion.button>
                        ) : (
                          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Chưa có ảnh</span>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <motion.button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                            onClick={() => {
                              setEditingTenant(tenant);
                              setShowAdd(false);
                              requestAnimationFrame(() => {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              });
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Chỉnh sửa hồ sơ"
                          >
                            <PencilSimple size={11} />
                            Sửa
                          </motion.button>
                          <motion.button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)", color: "var(--color-danger, #ef4444)" }}
                            onClick={() => setDeletingTenant(tenant)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Xóa khách thuê"
                          >
                            <Trash size={11} />
                            Xóa
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer stats */}
            <div style={{
              padding: "10px var(--space-3)",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              gap: 16,
              fontSize: "var(--text-xs)",
              color: "var(--color-fg-3)",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Users size={11} />
                {filtered.length} / {tenants.length} khách thuê
              </span>
            </div>
          </motion.div>
        )}
      </main>

      {/* CCCD Photo Preview Modal */}
      {viewingIdCardsTenant && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setViewingIdCardsTenant(null)}
        >
          <div
            className="modal-card"
            style={{
              backgroundColor: "var(--color-bg)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-3)",
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)", borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, margin: 0 }}>
                  Ảnh CCCD — {viewingIdCardsTenant.fullName}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                  {viewingIdCardsTenant.hometown ? `Thường trú: ${viewingIdCardsTenant.hometown}` : "Chưa có thông tin thường trú"}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost"
                style={{ padding: "4px 8px" }}
                onClick={() => setViewingIdCardsTenant(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 8 }}>
                  Mặt trước CCCD:
                </div>
                {viewingIdCardsTenant.idCardFrontUrl ? (
                  <img
                    src={viewingIdCardsTenant.idCardFrontUrl}
                    alt="CCCD mặt trước"
                    style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-subtle)", borderRadius: 8, color: "var(--color-fg-3)", fontSize: "var(--text-xs)" }}>
                    Chưa cập nhật mặt trước
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", marginBottom: 8 }}>
                  Mặt sau CCCD:
                </div>
                {viewingIdCardsTenant.idCardBackUrl ? (
                  <img
                    src={viewingIdCardsTenant.idCardBackUrl}
                    alt="CCCD mặt sau"
                    style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, border: "1px solid var(--color-border)" }}
                  />
                ) : (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--color-bg-subtle)", borderRadius: 8, color: "var(--color-fg-3)", fontSize: "var(--text-xs)" }}>
                    Chưa cập nhật mặt sau
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setViewingIdCardsTenant(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Tenant Modal */}
      {deletingTenant && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !submittingDelete && setDeletingTenant(null)}
        >
          <motion.div
            className="modal-card"
            style={{
              backgroundColor: "var(--color-bg)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-3)",
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              border: "1px solid var(--color-border)",
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <WarningCircle size={22} weight="bold" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                  Xác nhận xóa khách thuê?
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: "var(--text-xs)", color: "var(--color-fg-2)", lineHeight: 1.5 }}>
                  Bạn có chắc muốn xóa khách thuê <strong>{deletingTenant.fullName}</strong>
                  {deletingTenant.phone ? ` (${deletingTenant.phone})` : ""}? Hồ sơ thông tin và ảnh CCCD sẽ bị gỡ khỏi hệ thống.
                </p>
                {(() => {
                  const contract = getTenantContract(deletingTenant);
                  if (contract) {
                    return (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "8px 10px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#d97706",
                          fontSize: "11px",
                          lineHeight: 1.4,
                        }}
                      >
                        ⚠️ Lưu ý: Khách này đang có hợp đồng hoạt động tại <strong>Phòng {contract.roomNumber} - {contract.propertyName}</strong>.
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="btn-ghost"
                disabled={submittingDelete}
                onClick={() => setDeletingTenant(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  cursor: submittingDelete ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                disabled={submittingDelete}
                onClick={handleConfirmDelete}
              >
                {submittingDelete ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash size={13} weight="bold" />
                    Xóa khách thuê
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              backgroundColor: toast.type === "success" ? "#059669" : "#dc2626",
              color: "#ffffff",
              boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
            }}
          >
            {toast.type === "success" ? (
              <Check size={16} weight="bold" />
            ) : (
              <WarningCircle size={16} weight="bold" />
            )}
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                cursor: "pointer",
                padding: 2,
                marginLeft: 4,
                display: "flex",
              }}
              aria-label="Đóng thông báo"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
