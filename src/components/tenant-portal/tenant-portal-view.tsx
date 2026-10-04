"use client";

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
  MapPin,
  CalendarBlank,
  Copy,
  Check,
  DownloadSimple,
  X,
  Bank,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { buildVietQrUrl, getBankInfo } from "../../utils/vietqr";
import { PrintableInvoiceModal } from "../invoices/printable-invoice-modal";
import type { InvoiceDetail, InvoiceStatus } from "../../modules/invoices/invoice.service";
import type { TenantPortalData } from "../../modules/tenant-portal/tenant-portal.service";

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

export function TenantPortalView() {
  const { user } = useAuth();
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // VietQR modal state
  const [qrInvoice, setQrInvoice] = useState<InvoiceDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Printable A4/PDF modal state
  const [printInvoice, setPrintInvoice] = useState<InvoiceDetail | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<TenantPortalData>("/api/tenant-portal");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông tin cổng khách thuê.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
          <div className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
          <div className="stats-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="stat-card skeleton" style={{ minHeight: 110 }} />
            ))}
          </div>
          <div className="card skeleton" style={{ height: 260 }} />
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
    <main className="main-container">
      {/* Welcome Banner */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)",
          borderColor: "rgba(37, 99, 235, 0.25)",
          padding: "var(--space-3)",
          marginBottom: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", background: "rgba(37, 99, 235, 0.15)", borderRadius: 12, fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600, marginBottom: 6 }}>
              <House size={12} weight="bold" /> Cổng thông tin Khách thuê
            </div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: "2px 0 6px" }}>
              Xin chào, {tenant?.fullName || user?.email || "Bạn"}!
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
              {stay ? (
                <>Bạn đang thuê <strong>Phòng {stay.roomNumber}</strong> tại <strong>{stay.propertyName}</strong></>
              ) : (
                "Chào mừng bạn đến với hệ thống quản lý phòng trọ trực tuyến."
              )}
            </p>
          </div>

          {stay && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <a
                href="#maintenance"
                className="btn-secondary"
                style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
              >
                <Wrench size={14} /> Báo sự cố
              </a>
            </div>
          )}
        </div>
      </motion.div>

      {/* If tenant not yet linked to any contract */}
      {!stay && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-4) var(--space-2)", marginBottom: "var(--space-3)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.1)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-2)" }}>
            <Buildings size={28} />
          </div>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: 8 }}>
            Tài khoản chưa liên kết với phòng trọ
          </h2>
          <p className="text-muted" style={{ maxWidth: 460, margin: "0 auto var(--space-2)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Vui lòng cung cấp Số điện thoại (<strong>{user?.email || "của bạn"}</strong>) hoặc CCCD cho Chủ nhà / Quản lý để được thêm vào hợp đồng phòng trọ. Sau khi được thêm, bạn sẽ thấy thông tin phòng, chỉ số điện nước và hóa đơn hàng tháng tại đây.
          </p>
        </div>
      )}

      {/* Urgent Payment Callout */}
      {urgentInvoice && (
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)",
            borderColor: "rgba(239, 68, 68, 0.35)",
            marginBottom: "var(--space-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            padding: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-danger, #ef4444)", fontWeight: 700, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <WarningCircle size={16} weight="bold" /> Hóa đơn cần thanh toán
            </div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "4px 0" }}>
              Kỳ thu {urgentInvoice.billingPeriodStart} • Phòng {urgentInvoice.roomNumber}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
              Hạn nộp tiền: <strong>{urgentInvoice.dueDate || "Ngày 10 cùng tháng"}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tiền còn nợ:</div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-danger, #ef4444)", fontFamily: "var(--font-mono)" }}>
                {money.format(Math.max(0, urgentInvoice.totalAmount - (urgentInvoice.paidAmount || 0)))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: "var(--text-sm)",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
              }}
              onClick={() => setQrInvoice(urgentInvoice)}
            >
              <QrCode size={18} weight="bold" /> Quét mã VietQR trả tiền
            </button>
          </div>
        </motion.div>
      )}

      {/* Stay Details Grid */}
      {stay && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          {/* Room info card */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(37,99,235,0.1)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Buildings size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                  Thông tin phòng thuê
                </h2>
                <span className="badge ready" style={{ fontSize: "10px" }}>Hợp đồng hiệu lực</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Nhà trọ:</span>
                <strong>{stay.propertyName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Phòng số:</span>
                <strong style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}>Phòng {stay.roomNumber}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Địa chỉ:</span>
                <span>{stay.propertyAddress || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Tiền phòng/tháng:</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{money.format(stay.monthlyRent)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Tiền cọc giữ chỗ:</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{money.format(stay.deposit)}</strong>
              </div>
            </div>
          </div>

          {/* Contract Period */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(16,185,129,0.1)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarBlank size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                  Thời hạn hợp đồng
                </h2>
                <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Cam kết thuê</span>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Ngày bắt đầu:</span>
                <strong>{stay.startDate}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Ngày kết thúc:</span>
                <strong>{stay.endDate || "Dài hạn"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                <span className="text-muted">Họ và tên người thuê:</span>
                <strong>{tenant?.fullName}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Số điện thoại đăng ký:</span>
                <strong>{tenant?.phone || "—"}</strong>
              </div>
            </div>
          </div>

          {/* Landlord VietQR Bank Account info */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(245,158,11,0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bank size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                  Tài khoản nhận tiền chủ trọ
                </h2>
                <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Chuyển khoản VietQR</span>
              </div>
            </div>

            {stay.bankCode && stay.bankAccount ? (
              <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                  <span className="text-muted">Ngân hàng:</span>
                  <strong>{stay.bankCode}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: 6 }}>
                  <span className="text-muted">Số tài khoản:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{stay.bankAccount}</strong>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "2px 6px" }}
                      onClick={() => void handleCopy(stay.bankAccount!, "stk")}
                      title="Sao chép STK"
                    >
                      {copiedKey === "stk" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Chủ tài khoản:</span>
                  <strong style={{ textTransform: "uppercase" }}>{stay.accountHolder || "Chủ nhà"}</strong>
                </div>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: 0 }}>
                Chủ nhà chưa cấu hình STK tự động. Vui lòng thanh toán trực tiếp hoặc theo hướng dẫn của chủ nhà.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Invoices List Section */}
      <div id="invoices" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Receipt size={20} style={{ color: "var(--color-primary)" }} /> Lịch sử Hóa đơn tiền phòng &amp; Dịch vụ
            </h2>
            <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
              Xem chi tiết các khoản thu, thanh toán qua mã VietQR và in phiếu thu A4.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-3)", textAlign: "center" }}>
            <p className="text-muted" style={{ margin: 0 }}>Chưa có hóa đơn nào được phát hành.</p>
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
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.billingPeriodStart}</td>
                        <td>Phòng {inv.roomNumber}</td>
                        <td className="text-muted">{inv.dueDate ?? "—"}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {money.format(inv.totalAmount)}
                        </td>
                        <td>
                          <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <cfg.Icon size={10} weight="fill" />
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            {inv.status !== "cancelled" && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => setQrInvoice(inv)}
                                title="Quét mã VietQR"
                              >
                                <QrCode size={13} /> VietQR
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setPrintInvoice(inv)}
                              title="In phiếu thu / Lưu PDF"
                            >
                              <Printer size={13} /> In / PDF
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
      </div>

      {/* Electricity & Water Consumption History */}
      <div id="utilities" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Lightning size={20} style={{ color: "#eab308" }} /> Lịch sử Chỉ số Điện &amp; Nước
            </h2>
            <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
              Theo dõi số điện (kWh) và số nước (m³) theo từng kỳ chốt số của phòng.
            </p>
          </div>
        </div>

        {meters.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-3)", textAlign: "center" }}>
            <p className="text-muted" style={{ margin: 0 }}>Chưa có dữ liệu chốt số điện nước.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {meters.map((m) => {
              const isElectric = m.utilityType === "electricity";
              return (
                <div key={m.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "var(--text-sm)" }}>
                      {isElectric ? (
                        <Lightning size={16} weight="fill" style={{ color: "#eab308" }} />
                      ) : (
                        <Drop size={16} weight="fill" style={{ color: "#06b6d4" }} />
                      )}
                      <span>{isElectric ? "Điện sinh hoạt" : "Nước sinh hoạt"}</span>
                    </div>
                    <span className="badge" style={{ fontSize: "10px" }}>Kỳ {m.billingPeriod}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center", background: "var(--color-surface)", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Số cũ</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.previousValue}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Số mới</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.currentValue}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Tiêu thụ</div>
                      <div style={{ fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                        {m.consumption} {isElectric ? "kWh" : "m³"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VietQR Payment Modal for Tenant */}
      <AnimatePresence>
        {qrInvoice && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 110,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQrInvoice(null)}
          >
            <motion.div
              className="card"
              style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <div>
                  <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <QrCode size={22} style={{ color: "var(--color-primary)" }} />
                    Quét mã VietQR thanh toán
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Phòng {qrInvoice.roomNumber} • Kỳ {qrInvoice.billingPeriodStart}
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setQrInvoice(null)} aria-label="Đóng">
                  <X size={14} />
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
                    <div style={{ textAlign: "center", padding: "20px 10px" }}>
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
                      borderRadius: "12px",
                      marginBottom: "var(--space-2)",
                      boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
                    }}>
                      <img
                        src={qrUrl}
                        alt="VietQR thanh toán"
                        style={{
                          width: "100%",
                          maxWidth: 260,
                          height: "auto",
                          aspectRatio: "1/1",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`vietqr-${qrInvoice.roomNumber}.png`}
                          className="btn-ghost"
                          style={{
                            padding: "4px 12px",
                            fontSize: "var(--text-xs)",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                          }}
                        >
                          <DownloadSimple size={13} /> Tải mã QR
                        </a>
                      </div>
                    </div>

                    {/* Details box */}
                    <div style={{ marginBottom: "var(--space-3)", display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Ngân hàng</div>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                            {bankInfo ? `${bankInfo.shortName} (${bankInfo.code})` : qrInvoice.bankCode}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tài khoản</div>
                          <div style={{ fontSize: "var(--text-base)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            {qrInvoice.bankAccount}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(qrInvoice.bankAccount!, "acc")}
                        >
                          {copiedKey === "acc" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tiền chuyển khoản</div>
                          <div style={{ fontSize: "var(--text-base)", fontWeight: 800, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                            {money.format(remaining)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(String(remaining), "amt")}
                        >
                          {copiedKey === "amt" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Nội dung chuyển khoản</div>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
                            {transferDesc}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(transferDesc, "desc")}
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

      {/* Printable Invoice Modal */}
      <PrintableInvoiceModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
    </main>
  );
}
