"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  Buildings,
  Receipt,
  Lightning,
  Drop,
  QrCode,
  Printer,
  Clock,
  CheckCircle,
  CreditCard,
  WarningCircle,
  Wrench,
  Phone,
  CalendarBlank,
  Copy,
  Check,
  DownloadSimple,
  X,
  Bank,
  ArrowsClockwise,
  Plus,
  ShieldCheck,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { buildVietQrUrl, getBankInfo } from "../../utils/vietqr";
import { PrintableInvoiceModal } from "../invoices/printable-invoice-modal";
import type { InvoiceDetail, InvoiceStatus } from "../../modules/invoices/invoice.service";
import type { TenantPortalData } from "../../modules/tenant-portal/tenant-portal.service";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRow,
  MaintenanceStatus,
} from "../../modules/maintenance/maintenance.service";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  draft:          { label: "Nháp",              cls: "badge",              Icon: Clock },
  issued:         { label: "Chờ thanh toán",    cls: "badge maintenance",  Icon: Clock },
  partially_paid: { label: "Thanh toán 1 phần", cls: "badge maintenance",  Icon: CreditCard },
  paid:           { label: "Đã thanh toán",     cls: "badge ready",        Icon: CheckCircle },
  cancelled:      { label: "Đã hủy",            cls: "badge",              Icon: WarningCircle },
};

const MNT_STATUS_CONFIG: Record<MaintenanceStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  pending:     { label: "Chờ tiếp nhận", cls: "badge maintenance", Icon: Clock },
  in_progress: { label: "Đang xử lý",    cls: "badge",             Icon: ArrowsClockwise },
  resolved:    { label: "Đã xử lý xong", cls: "badge ready",       Icon: CheckCircle },
  cancelled:   { label: "Đã hủy",        cls: "badge",             Icon: WarningCircle },
};

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Cấp thoát nước",
  electrical: "Điện sinh hoạt",
  appliance: "Thiết bị & Đồ dùng",
  internet: "Mạng & Internet",
  structural: "Cơ sở vật chất",
  other: "Sự cố khác",
};

const PRIORITY_BADGES: Record<MaintenancePriority, { label: string; color: string }> = {
  low: { label: "Thấp", color: "var(--color-fg-3)" },
  medium: { label: "Bình thường", color: "var(--color-primary)" },
  high: { label: "Mức cao", color: "#f59e0b" },
  urgent: { label: "Khẩn cấp", color: "#ef4444" },
};

export function TenantPortalView() {
  const { user } = useAuth();
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: "invoices" | "utilities" | "maintenance"
  const [activeTab, setActiveTab] = useState<"invoices" | "utilities" | "maintenance">("invoices");

  // Maintenance state
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRow[]>([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [submittingMnt, setSubmittingMnt] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mCategory, setMCategory] = useState<MaintenanceCategory>("plumbing");
  const [mPriority, setMPriority] = useState<MaintenancePriority>("medium");
  const [mDescription, setMDescription] = useState("");

  // VietQR modal state
  const [qrInvoice, setQrInvoice] = useState<InvoiceDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Printable A4/PDF modal state
  const [printInvoice, setPrintInvoice] = useState<InvoiceDetail | null>(null);

  const loadMaintenance = useCallback(async () => {
    try {
      const res = await apiClient<{ requests: MaintenanceRow[] }>("/api/maintenance");
      setMaintenanceRequests(res.requests);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let active = true;

    apiClient<TenantPortalData>("/api/tenant-portal")
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Không thể tải thông tin cổng khách thuê.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    apiClient<{ requests: MaintenanceRow[] }>("/api/maintenance")
      .then((res) => {
        if (active) setMaintenanceRequests(res.requests);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleCreateMaintenance = async (e: FormEvent) => {
    e.preventDefault();
    if (!data?.stay) return;
    try {
      setSubmittingMnt(true);
      await apiClient("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          roomId: data.stay.roomId,
          title: mTitle.trim(),
          category: mCategory,
          priority: mPriority,
          description: mDescription.trim(),
        }),
      });
      setShowMaintenanceModal(false);
      setMTitle("");
      setMDescription("");
      await loadMaintenance();
      setActiveTab("maintenance");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gửi yêu cầu sửa chữa thất bại.");
    } finally {
      setSubmittingMnt(false);
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <main className="main-container">
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="skeleton" style={{ height: 130, borderRadius: "var(--radius-lg)" }} />
          <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
          <div className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
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

  const { tenant, stay, invoices, meters } = data || {
    tenant: null,
    stay: null,
    invoices: [],
    meters: [],
  };

  // Find urgent unpaid invoices
  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "issued" || inv.status === "partially_paid",
  );
  const urgentInvoice = unpaidInvoices[0] ?? null;

  return (
    <main className="main-container" style={{ display: "grid", gap: "var(--space-3)" }}>
      {/* ── 1. RESIDENT HERO BANNER ────────────────────────────────────────── */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(210, 195, 246, 0.14) 0%, rgba(32, 26, 54, 0.7) 100%)",
          border: "1px solid var(--color-glass-border)",
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(210, 195, 246, 0.18)", borderRadius: 20, fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 700, marginBottom: 8, letterSpacing: "0.4px" }}>
              <House size={13} weight="bold" /> CỔNG THÔNG TIN KHÁCH THUÊ
            </div>
            <h1 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, margin: "2px 0 6px", letterSpacing: "-0.03em" }}>
              Xin chào, {tenant?.fullName || user?.email || "Cư dân"}!
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
              {stay ? (
                <>
                  Bạn đang lưu trú tại <strong style={{ color: "var(--color-fg)" }}>Phòng {stay.roomNumber}</strong> • <span style={{ color: "var(--color-primary)" }}>{stay.propertyName}</span>
                  {stay.propertyAddress && <> ({stay.propertyAddress})</>}
                </>
              ) : (
                "Chào mừng bạn đến với Cổng thông tin Cư dân trực tuyến."
              )}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {stay && (
              <>
                <span className="badge ready" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: "var(--text-xs)" }}>
                  <ShieldCheck size={14} weight="bold" /> Hợp đồng hiệu lực
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px" }}
                  onClick={() => setShowMaintenanceModal(true)}
                >
                  <Wrench size={15} /> Báo sự cố
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── 2. UNLINKED NOTICE (IF NO ACTIVE STAY) ────────────────────────── */}
      {!stay && (
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(210, 195, 246, 0.15)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Buildings size={32} />
          </div>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: 8 }}>
            Tài khoản chưa được liên kết với hợp đồng phòng trọ
          </h2>
          <p className="text-muted" style={{ maxWidth: 500, margin: "0 auto", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Vui lòng cung cấp Số điện thoại hoặc CCCD của bạn cho Chủ nhà / Quản lý để được xếp vào phòng. Sau khi hợp đồng được kích hoạt, bạn sẽ có thể theo dõi chi tiết phòng, kiểm tra chỉ số điện nước và thanh toán hóa đơn VietQR ngay tại đây.
          </p>
        </motion.div>
      )}

      {/* ── 3. URGENT UNPAID INVOICE HERO WIDGET ─────────────────────────── */}
      {urgentInvoice && (
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(32, 26, 54, 0.8) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.45)",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: "rgba(239, 68, 68, 0.18)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <WarningCircle size={26} weight="bold" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#ef4444" }}>
                  Hóa đơn đến hạn thanh toán
                </span>
                <span className="badge maintenance" style={{ fontSize: 10 }}>Kỳ {urgentInvoice.billingPeriodStart}</span>
              </div>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "2px 0" }}>
                Phòng {urgentInvoice.roomNumber} • Hạn nộp: <strong style={{ color: "var(--color-fg)" }}>{urgentInvoice.dueDate || "Ngày 10 cùng tháng"}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tiền cần thanh toán:</div>
              <div style={{ fontSize: "clamp(20px, 3vw, 24px)", fontWeight: 800, color: "#ef4444", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                {money.format(Math.max(0, urgentInvoice.totalAmount - (urgentInvoice.paidAmount || 0)))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                boxShadow: "0 4px 18px rgba(210, 195, 246, 0.35)",
              }}
              onClick={() => setQrInvoice(urgentInvoice)}
            >
              <QrCode size={20} weight="bold" /> Quét VietQR thanh toán
            </button>
          </div>
        </motion.div>
      )}

      {/* ── 4. RESIDENCE HUB (BENTO OVERVIEW - NO NESTED CARDS) ────────────── */}
      {stay && (
        <section className="card" style={{ padding: 0 }}>
          <header className="card-header" style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Buildings size={22} style={{ color: "var(--color-primary)" }} />
              <div>
                <h2 className="card-title" style={{ fontSize: "var(--text-base)", margin: 0 }}>
                  Hồ sơ Lưu trú &amp; Thông tin Căn hộ
                </h2>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                  Tổng hợp thông tin hợp đồng và hướng dẫn thanh toán tiền phòng.
                </div>
              </div>
            </div>
            <span className="badge ready" style={{ fontSize: 11 }}>Đang hoạt động</span>
          </header>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 0,
            borderTop: "1px solid var(--color-glass-border)",
          }}>
            {/* Cột 1: Thông tin phòng thuê */}
            <div style={{ padding: "20px 24px", borderRight: "1px solid var(--color-glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <House size={18} style={{ color: "var(--color-primary)" }} />
                <strong style={{ fontSize: "var(--text-sm)", color: "var(--color-fg)" }}>Phòng &amp; Nhà trọ</strong>
              </div>

              <div style={{ display: "grid", gap: 10, fontSize: "var(--text-xs)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Nhà trọ:</span>
                  <strong style={{ color: "var(--color-fg)" }}>{stay.propertyName}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Phòng số:</span>
                  <strong style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}>Phòng {stay.roomNumber}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Địa chỉ:</span>
                  <span style={{ textAlign: "right", maxWidth: 170 }} title={stay.propertyAddress || ""}>
                    {stay.propertyAddress || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Giá thuê phòng:</span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>{money.format(stay.monthlyRent)}/tháng</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Tiền cọc giữ chỗ:</span>
                  <strong style={{ fontFamily: "var(--font-mono)" }}>{money.format(stay.deposit)}</strong>
                </div>
              </div>
            </div>

            {/* Cột 2: Thời hạn hợp đồng & Cư dân */}
            <div style={{ padding: "20px 24px", borderRight: "1px solid var(--color-glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <CalendarBlank size={18} style={{ color: "#10b981" }} />
                <strong style={{ fontSize: "var(--text-sm)", color: "var(--color-fg)" }}>Thời hạn &amp; Người thuê</strong>
              </div>

              <div style={{ display: "grid", gap: 10, fontSize: "var(--text-xs)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Đại diện thuê:</span>
                  <strong style={{ color: "var(--color-fg)" }}>{tenant?.fullName || "—"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Số điện thoại:</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{tenant?.phone || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Ngày bắt đầu:</span>
                  <strong>{stay.startDate}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span className="text-muted">Hạn hợp đồng:</span>
                  <strong>{stay.endDate || "Dài hạn"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Trạng thái:</span>
                  <span className="badge ready" style={{ fontSize: 10 }}>Hiệu lực</span>
                </div>
              </div>
            </div>

            {/* Cột 3: Tài khoản nhận tiền chủ trọ */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Bank size={18} style={{ color: "#f59e0b" }} />
                <strong style={{ fontSize: "var(--text-sm)", color: "var(--color-fg)" }}>Tài khoản nhận tiền Chủ trọ</strong>
              </div>

              {stay.bankCode && stay.bankAccount ? (
                <div style={{ display: "grid", gap: 10, fontSize: "var(--text-xs)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                    <span className="text-muted">Ngân hàng:</span>
                    <strong style={{ color: "var(--color-fg)" }}>{stay.bankCode}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                    <span className="text-muted">Số tài khoản:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-primary)" }}>{stay.bankAccount}</strong>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "2px 6px" }}
                        onClick={() => void handleCopy(stay.bankAccount!, "stk")}
                        title="Sao chép số tài khoản"
                      >
                        {copiedKey === "stk" ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                    <span className="text-muted">Chủ tài khoản:</span>
                    <strong style={{ textTransform: "uppercase" }}>{stay.accountHolder || "Chủ nhà"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="text-muted">Chuẩn QR:</span>
                    <span style={{ color: "var(--color-success)", fontWeight: 600 }}>Tương thích VietQR NAPAS</span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-fg-3)", lineHeight: 1.5 }}>
                  Chủ nhà chưa cài đặt STK ngân hàng tự động. Bạn có thể thanh toán trực tiếp hoặc liên hệ chủ trọ khi nhận hóa đơn.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 5. INTERACTIVE SEGMENTED TABS ─────────────────────────────────── */}
      <section>
        {/* Tab Controls Bar */}
        <div style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--color-glass-border)",
          paddingBottom: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}>
          <button
            type="button"
            className={activeTab === "invoices" ? "btn-primary" : "btn-ghost"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", padding: "8px 16px" }}
            onClick={() => setActiveTab("invoices")}
          >
            <Receipt size={17} />
            <span>Lịch sử Hóa đơn ({invoices.length})</span>
          </button>

          <button
            type="button"
            className={activeTab === "utilities" ? "btn-primary" : "btn-ghost"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", padding: "8px 16px" }}
            onClick={() => setActiveTab("utilities")}
          >
            <Lightning size={17} />
            <span>Chỉ số Điện &amp; Nước ({meters.length})</span>
          </button>

          <button
            type="button"
            className={activeTab === "maintenance" ? "btn-primary" : "btn-ghost"}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", padding: "8px 16px" }}
            onClick={() => setActiveTab("maintenance")}
          >
            <Wrench size={17} />
            <span>Bảo trì &amp; Sự cố ({maintenanceRequests.length})</span>
          </button>
        </div>

        {/* ── TAB CONTENT 1: INVOICES ─────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {invoices.length === 0 ? (
              <div className="card" style={{ padding: "36px 20px", textAlign: "center" }}>
                <Receipt size={32} style={{ color: "var(--color-fg-3)", margin: "0 auto 10px" }} />
                <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
                  Hiện chưa có hóa đơn nào được phát hành cho phòng của bạn.
                </p>
              </div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kỳ thu</th>
                        <th>Phòng</th>
                        <th>Hạn nộp</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const cfg = STATUS_CONFIG[inv.status];
                        const remaining = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
                        return (
                          <tr key={inv.id}>
                            <td style={{ fontWeight: 600 }}>{inv.billingPeriodStart}</td>
                            <td>Phòng {inv.roomNumber}</td>
                            <td className="text-muted">{inv.dueDate ?? "—"}</td>
                            <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                              <div>{money.format(inv.totalAmount)}</div>
                              {remaining > 0 && remaining < inv.totalAmount && (
                                <div style={{ fontSize: 11, color: "#ef4444" }}>
                                  Còn nợ: {money.format(remaining)}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <cfg.Icon size={11} weight="fill" />
                                {cfg.label}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                {inv.status !== "cancelled" && (
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: "4px 10px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                                    onClick={() => setQrInvoice(inv)}
                                    title="Quét mã VietQR"
                                  >
                                    <QrCode size={14} /> VietQR
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: "4px 10px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                                  onClick={() => setPrintInvoice(inv)}
                                  title="In phiếu thu / Lưu PDF"
                                >
                                  <Printer size={14} /> In / PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB CONTENT 2: UTILITIES (CLEAN STRIP - NO NESTED CARDS) ───── */}
        {activeTab === "utilities" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {meters.length === 0 ? (
              <div className="card" style={{ padding: "36px 20px", textAlign: "center" }}>
                <Lightning size={32} style={{ color: "var(--color-fg-3)", margin: "0 auto 10px" }} />
                <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
                  Chưa có dữ liệu chốt số điện nước cho phòng này.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
                {meters.map((m) => {
                  const isElectric = m.utilityType === "electricity";
                  const unit = isElectric ? "kWh" : "m³";
                  const themeColor = isElectric ? "#eab308" : "#06b6d4";

                  return (
                    <div
                      key={m.id}
                      className="card"
                      style={{
                        padding: "18px 20px",
                        borderLeft: `4px solid ${themeColor}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isElectric ? (
                            <Lightning size={20} weight="fill" style={{ color: themeColor }} />
                          ) : (
                            <Drop size={20} weight="fill" style={{ color: themeColor }} />
                          )}
                          <strong style={{ fontSize: "var(--text-sm)" }}>
                            {isElectric ? "Điện sinh hoạt" : "Nước sinh hoạt"}
                          </strong>
                        </div>
                        <span className="badge" style={{ fontSize: "11px" }}>Kỳ {m.billingPeriod}</span>
                      </div>

                      {/* Clean flat metrics row (No inner card/border box) */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1.2fr",
                        gap: 12,
                        padding: "10px 14px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "var(--radius-md)",
                      }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Chỉ số cũ</div>
                          <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", marginTop: 2 }}>
                            {m.previousValue}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Chỉ số mới</div>
                          <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", marginTop: 2 }}>
                            {m.currentValue}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Tiêu thụ</div>
                          <div style={{
                            fontWeight: 800,
                            color: themeColor,
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-base)",
                            marginTop: 2,
                          }}>
                            {m.consumption} {unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TAB CONTENT 3: MAINTENANCE ─────────────────────────────────── */}
        {activeTab === "maintenance" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                Danh sách các yêu cầu sửa chữa và báo cáo sự cố cơ sở vật chất.
              </div>
              {stay && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5, padding: "6px 14px" }}
                  onClick={() => setShowMaintenanceModal(true)}
                >
                  <Plus size={14} weight="bold" /> Tạo yêu cầu mới
                </button>
              )}
            </div>

            {maintenanceRequests.length === 0 ? (
              <div className="card" style={{ padding: "36px 20px", textAlign: "center" }}>
                <Wrench size={32} style={{ color: "var(--color-fg-3)", margin: "0 auto 10px" }} />
                <p className="text-muted" style={{ margin: "0 0 12px", fontSize: "var(--text-sm)" }}>
                  Hiện tại không có sự cố nào được ghi nhận.
                </p>
                {stay && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "var(--text-xs)", margin: "0 auto" }}
                    onClick={() => setShowMaintenanceModal(true)}
                  >
                    Báo sự cố nếu phòng gặp trục trặc
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {maintenanceRequests.map((req) => {
                  const cfg = MNT_STATUS_CONFIG[req.status] || MNT_STATUS_CONFIG.pending;
                  const priority = PRIORITY_BADGES[req.priority] || PRIORITY_BADGES.medium;
                  const catLabel = CATEGORY_LABELS[req.category] || req.category;

                  return (
                    <div key={req.id} className="card" style={{ padding: "18px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-fg)" }}>
                              {req.title}
                            </span>
                            <span className="badge" style={{ fontSize: "11px", background: "rgba(255,255,255,0.06)" }}>
                              {catLabel}
                            </span>
                            <span style={{ fontSize: "11px", color: priority.color, fontWeight: 600 }}>
                              ● {priority.label}
                            </span>
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 4 }}>
                            Phòng {req.roomNumber} • Tạo lúc {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                          </div>
                        </div>

                        <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px", padding: "4px 10px" }}>
                          <cfg.Icon size={13} weight="fill" />
                          {cfg.label}
                        </span>
                      </div>

                      {req.description && (
                        <p style={{ margin: "8px 0 0", fontSize: "var(--text-xs)", color: "var(--color-fg)", lineHeight: 1.6 }}>
                          {req.description}
                        </p>
                      )}

                      {/* Landlord resolution response: Clean Quote style (No inner card box) */}
                      {req.resolutionNotes && (
                        <div style={{
                          marginTop: 12,
                          padding: "10px 14px",
                          borderLeft: "3px solid #10b981",
                          background: "rgba(16, 185, 129, 0.08)",
                          borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                          fontSize: "var(--text-xs)",
                        }}>
                          <div style={{ color: "#10b981", fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckCircle size={13} weight="fill" /> Phản hồi từ Ban quản lý:
                          </div>
                          <div style={{ color: "var(--color-fg)", lineHeight: 1.5 }}>
                            {req.resolutionNotes}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* ── 6. VIETQR PAYMENT MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {qrInvoice && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 120,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQrInvoice(null)}
          >
            <motion.div
              className="card"
              style={{ maxWidth: 460, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <QrCode size={22} style={{ color: "var(--color-primary)" }} />
                    Quét mã VietQR thanh toán
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Phòng {qrInvoice.roomNumber} • Kỳ thu {qrInvoice.billingPeriodStart}
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setQrInvoice(null)} aria-label="Đóng">
                  <X size={15} />
                </button>
              </div>

              {(() => {
                const remaining = Math.max(0, qrInvoice.totalAmount - (qrInvoice.paidAmount || 0));
                const transferDesc = `TT P${qrInvoice.roomNumber.replace(/\s+/g, "")} ${qrInvoice.billingPeriodStart.replace(/-/g, "").slice(0, 6)}`;
                const qrUrl = qrInvoice.bankCode && qrInvoice.bankAccount
                  ? buildVietQrUrl({
                      bankCode: qrInvoice.bankCode,
                      bankAccount: qrInvoice.bankAccount,
                      accountHolder: qrInvoice.accountHolder,
                      amount: remaining > 0 ? remaining : qrInvoice.totalAmount,
                      description: transferDesc,
                      template: "compact2",
                    })
                  : null;
                const bankInfo = qrInvoice.bankCode ? getBankInfo(qrInvoice.bankCode) : undefined;

                if (!qrUrl) {
                  return (
                    <div style={{ textAlign: "center", padding: "24px 10px" }}>
                      <p className="text-muted">Chủ nhà chưa cài đặt STK ngân hàng cho nhà trọ này.</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {/* QR Code Frame */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "#ffffff",
                      padding: "16px",
                      borderRadius: "14px",
                      marginBottom: 16,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    }}>
                      <img
                        src={qrUrl}
                        alt="VietQR thanh toán"
                        style={{
                          width: "100%",
                          maxWidth: 240,
                          height: "auto",
                          aspectRatio: "1/1",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                      <div style={{ marginTop: 10 }}>
                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`vietqr-${qrInvoice.roomNumber}.png`}
                          className="btn-ghost"
                          style={{
                            padding: "5px 14px",
                            fontSize: "var(--text-xs)",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <DownloadSimple size={14} /> Tải ảnh mã QR
                        </a>
                      </div>
                    </div>

                    {/* Metadata fields (flat styling) */}
                    <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Ngân hàng thụ hưởng</span>
                        <strong style={{ fontSize: "var(--text-xs)" }}>
                          {bankInfo ? `${bankInfo.shortName} (${bankInfo.code})` : qrInvoice.bankCode}
                        </strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Số tài khoản</div>
                          <strong style={{ fontSize: "var(--text-sm)", fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
                            {qrInvoice.bankAccount}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(qrInvoice.bankAccount!, "acc")}
                          title="Sao chép số tài khoản"
                        >
                          {copiedKey === "acc" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Số tiền chuyển</div>
                          <strong style={{ fontSize: "var(--text-base)", fontWeight: 800, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                            {money.format(remaining)}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(String(remaining), "amt")}
                          title="Sao chép số tiền"
                        >
                          {copiedKey === "amt" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>Nội dung chuyển khoản</div>
                          <strong style={{ fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", color: "var(--color-fg)" }}>
                            {transferDesc}
                          </strong>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(transferDesc, "desc")}
                          title="Sao chép nội dung"
                        >
                          {copiedKey === "desc" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" className="btn-primary" onClick={() => setQrInvoice(null)}>
                        Đã chuyển khoản xong
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 7. CREATE MAINTENANCE MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 120,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMaintenanceModal(false)}
          >
            <motion.div
              className="card"
              style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24 }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                    <Wrench size={22} style={{ color: "var(--color-primary)" }} />
                    Báo sự cố phòng {stay?.roomNumber}
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Chủ nhà sẽ nhận được thông báo ngay khi bạn gửi yêu cầu.
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowMaintenanceModal(false)} aria-label="Đóng">
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleCreateMaintenance} style={{ display: "grid", gap: 14 }}>
                <div>
                  <label className="field-label" htmlFor="mTitle">Tiêu đề sự cố *</label>
                  <input
                    id="mTitle"
                    type="text"
                    required
                    className="input-field"
                    placeholder="VD: Hỏng vòi sen, Nghẹt bồn rửa, Mất điện..."
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label className="field-label" htmlFor="mCategory">Danh mục</label>
                    <select
                      id="mCategory"
                      className="input-field"
                      value={mCategory}
                      onChange={(e) => setMCategory(e.target.value as MaintenanceCategory)}
                    >
                      <option value="plumbing">Cấp thoát nước</option>
                      <option value="electrical">Điện sinh hoạt</option>
                      <option value="appliance">Thiết bị / Đồ dùng</option>
                      <option value="internet">Mạng & Internet</option>
                      <option value="structural">Cơ sở vật chất</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="mPriority">Mức độ khẩn</label>
                    <select
                      id="mPriority"
                      className="input-field"
                      value={mPriority}
                      onChange={(e) => setMPriority(e.target.value as MaintenancePriority)}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Bình thường</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="mDescription">Mô tả chi tiết</label>
                  <textarea
                    id="mDescription"
                    rows={3}
                    className="input-field"
                    placeholder="Mô tả cụ thể vị trí và tình trạng hỏng để thợ mang đúng dụng cụ sửa chữa..."
                    value={mDescription}
                    onChange={(e) => setMDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowMaintenanceModal(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-primary" disabled={submittingMnt || !mTitle.trim()}>
                    {submittingMnt ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 8. PRINTABLE INVOICE MODAL ────────────────────────────────────── */}
      <PrintableInvoiceModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
    </main>
  );
}
