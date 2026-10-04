"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { TenantRow } from "../../modules/tenants/tenant.service";

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
  onSubmit: (data: { fullName: string; phone: string; birthDate: string }) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ fullName, phone, birthDate });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
        {/* Họ tên */}
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

        {/* Điện thoại */}
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
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* Ngày sinh */}
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

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ tenants: TenantRow[] }>("/api/tenants");
      setTenants(res.tenants);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách khách thuê.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadTenants();
  }, [user, authLoading, router, loadTenants]);

  const handleCreate = async (data: { fullName: string; phone: string; birthDate: string }) => {
    try {
      setSubmittingAdd(true);
      await apiClient("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          phone: data.phone.trim() || null,
          birthDate: data.birthDate || null,
        }),
      });
      setShowAdd(false);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo khách thuê thất bại.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdate = async (data: { fullName: string; phone: string; birthDate: string }) => {
    if (!editingTenant) return;
    try {
      setSubmittingEdit(true);
      await apiClient(`/api/tenants/${editingTenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: data.fullName.trim(),
          phone: data.phone.trim() || null,
          birthDate: data.birthDate || null,
        }),
      });
      setEditingTenant(null);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật khách thuê thất bại.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (tenant: TenantRow) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khách thuê "${tenant.fullName}"?`)) return;
    try {
      await apiClient(`/api/tenants/${tenant.id}`, { method: "DELETE" });
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa khách thuê.");
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

  const filtered = tenants.filter(
    (t) =>
      t.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (t.phone ?? "").includes(search),
  );

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
      "Ngày sinh",
      "Ngày tạo hồ sơ",
    ];
    const rows = filtered.map((t) => [
      t.id,
      `"${t.fullName.replace(/"/g, '""')}"`,
      t.phone || "",
      formatDate(t.birthDate),
      t.createdAt ? new Date(t.createdAt).toLocaleDateString("vi-VN") : "",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_khach_thue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {/* Search */}
        {tenants.length > 0 && (
          <motion.div
            style={{ position: "relative", marginBottom: "var(--space-2)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <MagnifyingGlass size={15} />
            </span>
            <input
              type="search"
              className="form-control"
              style={{ paddingLeft: 34, maxWidth: 360 }}
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm khách thuê"
            />
          </motion.div>
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
              <p className="text-muted" style={{ margin: 0 }}>
                Không tìm thấy khách thuê nào khớp với &ldquo;{search}&rdquo;.
              </p>
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
                    <th>Họ và tên</th>
                    <th>Số điện thoại</th>
                    <th>Ngày sinh</th>
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
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: "var(--radius-md)",
                            background: "var(--color-primary-light)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)",
                            flexShrink: 0,
                          }}>
                            {tenant.fullName.charAt(0).toUpperCase()}
                          </span>
                          {tenant.fullName}
                        </span>
                      </td>
                      <td className="text-muted">
                        {tenant.phone ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Phone size={12} />
                            {tenant.phone}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="text-muted">{formatDate(tenant.birthDate)}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <motion.button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                            onClick={() => { setEditingTenant(tenant); setShowAdd(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Chỉnh sửa"
                          >
                            <PencilSimple size={11} />
                            Sửa
                          </motion.button>
                          <motion.button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                            onClick={() => void handleDelete(tenant)}
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
    </div>
  );
}
