"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Receipt,
  Plus,
  X,
  Trash,
  CheckCircle,
  Clock,
  XCircle,
  CurrencyDollar,
  Buildings,
  Door,
  MagnifyingGlass,
  CreditCard,
  ListPlus,
  QrCode,
  Copy,
  Check,
  DownloadSimple,
  Bank,
  Printer,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { PrintableInvoiceModal } from "../../components/invoices/printable-invoice-modal";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { buildVietQrUrl, getBankInfo } from "../../utils/vietqr";
import type {
  InvoiceDetail,
  InvoiceItemType,
  InvoiceRow,
  InvoiceStatus,
  PaymentMethod,
} from "../../modules/invoices/invoice.service";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  draft:          { label: "Nháp",              cls: "badge",              Icon: Clock },
  issued:         { label: "Chờ thanh toán",    cls: "badge maintenance",  Icon: Clock },
  partially_paid: { label: "Thanh toán 1 phần", cls: "badge maintenance",  Icon: CurrencyDollar },
  paid:           { label: "Đã thanh toán",     cls: "badge ready",        Icon: CheckCircle },
  cancelled:      { label: "Đã hủy",            cls: "badge",              Icon: XCircle },
};

/* ── Slide Panel ─────────────────────────────────────────────────── */
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
        <motion.button type="button" className="btn-ghost" style={{ padding: "5px 10px" }} onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label="Đóng">
          <X size={14} />
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | InvoiceStatus>("all");

  // Selected invoice for detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create invoice state
  const [showCreate, setShowCreate] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [cContractId, setCContractId] = useState("");
  const [cPeriod, setCPeriod] = useState("");
  const [cIssueDate, setCIssueDate] = useState("");
  const [cDueDate, setCDueDate] = useState("");
  const [cItems, setCItems] = useState<
    Array<{ itemType: InvoiceItemType; description: string; quantity: number; unitPriceSnapshot: number; amount: number }>
  >([
    { itemType: "rent", description: "Tiền thuê phòng", quantity: 1, unitPriceSnapshot: 0, amount: 0 },
  ]);

  // Record payment state
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // VietQR modal state
  const [qrInvoice, setQrInvoice] = useState<InvoiceRow | InvoiceDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Printable A4/PDF modal state
  const [printInvoice, setPrintInvoice] = useState<InvoiceRow | InvoiceDetail | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ invoices: InvoiceRow[] }>("/api/invoices");
      setInvoices(res.invoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách hóa đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadInvoices();
  }, [user, authLoading, router, loadInvoices]);

  const viewInvoiceDetail = async (invoiceId: string) => {
    try {
      setLoadingDetail(true);
      const res = await apiClient<{ invoice: InvoiceDetail }>(`/api/invoices/${invoiceId}`);
      setSelectedInvoice(res.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải chi tiết hóa đơn.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    const total = cItems.reduce((sum, item) => sum + item.amount, 0);
    try {
      setSubmittingCreate(true);
      await apiClient("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          contractId: cContractId.trim(),
          billingPeriodStart: cPeriod,
          issueDate: cIssueDate || null,
          dueDate: cDueDate || null,
          totalAmount: total,
          items: cItems,
        }),
      });
      setShowCreate(false);
      setCContractId("");
      setCPeriod("");
      setCIssueDate("");
      setCDueDate("");
      setCItems([{ itemType: "rent", description: "Tiền thuê phòng", quantity: 1, unitPriceSnapshot: 0, amount: 0 }]);
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo hóa đơn thất bại.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId) return;
    try {
      setSubmittingPay(true);
      await apiClient(`/api/invoices/${payInvoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payAmount),
          method: payMethod,
          reference: payRef.trim() || null,
        }),
      });
      setPayInvoiceId(null);
      setPayAmount("");
      setPayRef("");
      await loadInvoices();
      if (selectedInvoice && selectedInvoice.id === payInvoiceId) {
        await viewInvoiceDetail(payInvoiceId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ghi nhận thanh toán thất bại.");
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleDeleteInvoice = async (invoice: InvoiceRow) => {
    if (!window.confirm("Bạn có chắc muốn xóa hóa đơn nháp này?")) return;
    try {
      await apiClient(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa hóa đơn.");
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

  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus = filterStatus === "all" || inv.status === filterStatus;
    const matchSearch =
      inv.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.propertyName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const exportCSV = () => {
    if (invoices.length === 0) return;
    const headers = [
      "Mã Hóa Đơn",
      "Phòng",
      "Nhà trọ",
      "Kỳ thu tiền",
      "Hạn nộp",
      "Tổng tiền (VND)",
      "Đã thanh toán (VND)",
      "Còn lại (VND)",
      "Trạng thái",
    ];
    const rows = filteredInvoices.map((inv) => {
      const paid = inv.paidAmount ?? 0;
      return [
        inv.id,
        `P${inv.roomNumber}`,
        `"${inv.propertyName.replace(/"/g, '""')}"`,
        inv.billingPeriodStart,
        inv.dueDate || "",
        inv.totalAmount,
        paid,
        inv.totalAmount - paid,
        STATUS_CONFIG[inv.status].label,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_hoa_don_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <h1 className="page-title">Hóa đơn &amp; Thanh toán</h1>
            <p className="page-desc">Quản lý hóa đơn thu tiền phòng, điện nước và lịch sử thanh toán.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <motion.button
              type="button"
              className="btn-secondary"
              onClick={exportCSV}
              disabled={invoices.length === 0}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              title="Xuất danh sách hóa đơn ra file CSV"
            >
              <DownloadSimple size={14} />
              Xuất CSV
            </motion.button>
            <motion.button
              type="button"
              className={showCreate ? "btn-secondary" : "btn-primary"}
              onClick={() => setShowCreate(!showCreate)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {showCreate ? <X size={14} /> : <Plus size={14} weight="bold" />}
              {showCreate ? "Đóng" : "Tạo hóa đơn"}
            </motion.button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div className="alert-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ marginBottom: "var(--space-2)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Invoice Panel */}
        <AnimatePresence>
          {showCreate && (
            <SlidePanel title="Tạo hóa đơn thu tiền" onClose={() => setShowCreate(false)}>
              <form onSubmit={handleCreateInvoice}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="inv-contract">Contract ID *</label>
                    <input id="inv-contract" type="text" className="form-control" placeholder="ID hợp đồng" value={cContractId} onChange={(e) => setCContractId(e.target.value)} required autoFocus />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="inv-period">Kỳ thu tiền (Ngày 01) *</label>
                    <input id="inv-period" type="date" className="form-control" value={cPeriod} onChange={(e) => setCPeriod(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="inv-due">Hạn nộp tiền</label>
                    <input id="inv-due" type="date" className="form-control" value={cDueDate} onChange={(e) => setCDueDate(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: "var(--space-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Chi tiết các khoản thu</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "3px 8px", fontSize: "var(--text-xs)" }}
                      onClick={() => setCItems([...cItems, { itemType: "service", description: "", quantity: 1, unitPriceSnapshot: 0, amount: 0 }])}
                    >
                      <ListPlus size={13} /> Thêm mục
                    </button>
                  </div>
                  {cItems.map((item, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px 120px 120px 30px", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <select
                        className="form-control"
                        value={item.itemType}
                        onChange={(e) => {
                          const updated = [...cItems];
                          updated[idx].itemType = e.target.value as InvoiceItemType;
                          setCItems(updated);
                        }}
                      >
                        <option value="rent">Tiền phòng</option>
                        <option value="electricity">Tiền điện</option>
                        <option value="water">Tiền nước</option>
                        <option value="service">Dịch vụ</option>
                        <option value="adjustment">Phụ thu</option>
                      </select>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Mô tả khoản thu"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...cItems];
                          updated[idx].description = e.target.value;
                          setCItems(updated);
                        }}
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        placeholder="SL"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...cItems];
                          updated[idx].quantity = Number(e.target.value);
                          updated[idx].amount = updated[idx].quantity * updated[idx].unitPriceSnapshot;
                          setCItems(updated);
                        }}
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="Đơn giá"
                        value={item.unitPriceSnapshot}
                        onChange={(e) => {
                          const updated = [...cItems];
                          updated[idx].unitPriceSnapshot = Number(e.target.value);
                          updated[idx].amount = updated[idx].quantity * updated[idx].unitPriceSnapshot;
                          setCItems(updated);
                        }}
                        required
                      />
                      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                        {money.format(item.amount)}
                      </div>
                      {cItems.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: 4 }}
                          onClick={() => setCItems(cItems.filter((_, i) => i !== idx))}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div style={{ textAlign: "right", marginTop: 8, fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-primary)" }}>
                    Tổng cộng: {money.format(cItems.reduce((sum, item) => sum + item.amount, 0))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingCreate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingCreate ? "Đang lưu..." : "Phát hành hóa đơn"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Record Payment Panel */}
        <AnimatePresence>
          {payInvoiceId && (
            <SlidePanel title="Ghi nhận thanh toán" onClose={() => setPayInvoiceId(null)}>
              <form onSubmit={handleRecordPayment}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="pay-amt">Số tiền thanh toán (VND) *</label>
                    <input id="pay-amt" type="number" min="1000" className="form-control" placeholder="VD: 3500000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required autoFocus />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="pay-meth">Phương thức *</label>
                    <select id="pay-meth" className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                      <option value="bank_transfer">Chuyển khoản</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="pay-ref">Mã tham chiếu / Ghi chú</label>
                    <input id="pay-ref" type="text" className="form-control" placeholder="Mã giao dịch..." value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setPayInvoiceId(null)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingPay} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingPay ? "Đang ghi nhận..." : "Xác nhận đã thanh toán"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Filter & Search */}
        <div style={{ display: "flex", gap: 10, marginBottom: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <MagnifyingGlass size={15} />
            </span>
            <input
              type="search"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="Tìm theo phòng hoặc nhà trọ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["all", "issued", "paid", "partially_paid", "draft", "cancelled"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={filterStatus === s ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)" }}
                onClick={() => setFilterStatus(s)}
              >
                {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 40 }} />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><Receipt size={28} /></div>
              <p className="text-muted" style={{ margin: 0 }}>Chưa có hóa đơn nào.</p>
            </div>
          </div>
        ) : (
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phòng / Nhà</th>
                    <th>Kỳ thu</th>
                    <th>Hạn nộp</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, i) => {
                    const cfg = STATUS_CONFIG[inv.status];
                    return (
                      <motion.tr key={inv.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Door size={13} style={{ color: "var(--color-fg-3)" }} />
                              Phòng {inv.roomNumber}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                              <Buildings size={11} />{inv.propertyName}
                            </span>
                          </span>
                        </td>
                        <td className="text-muted">{inv.billingPeriodStart}</td>
                        <td className="text-muted">{inv.dueDate ?? "—"}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money.format(inv.totalAmount)}</td>
                        <td>
                          <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <cfg.Icon size={10} weight="fill" />{cfg.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                              onClick={() => void viewInvoiceDetail(inv.id)}
                            >
                              Chi tiết
                            </button>
                            {inv.status !== "cancelled" && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => setQrInvoice(inv)}
                                title="Xem mã VietQR thanh toán"
                              >
                                <QrCode size={13} /> QR
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setPrintInvoice(inv)}
                              title="In phiếu thu / Xuất PDF (A4)"
                            >
                              <Printer size={13} /> In
                            </button>
                            {inv.status !== "paid" && inv.status !== "cancelled" && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => {
                                  setPayInvoiceId(inv.id);
                                  setPayAmount(String(inv.totalAmount));
                                }}
                              >
                                <CreditCard size={12} /> Thu tiền
                              </button>
                            )}
                            {inv.status === "draft" && user?.role === "owner" && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 6px" }}
                                onClick={() => void handleDeleteInvoice(inv)}
                                title="Xóa nháp"
                              >
                                <Trash size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Invoice Detail Modal */}
        <AnimatePresence>
          {selectedInvoice && (
            <motion.div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 16,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
            >
              <motion.div
                className="card"
                style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                  <div>
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>Hóa đơn {selectedInvoice.roomNumber}</h2>
                    <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: 0 }}>
                      Kỳ {selectedInvoice.billingPeriodStart} • {selectedInvoice.propertyName}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {selectedInvoice.status !== "cancelled" && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                        onClick={() => setQrInvoice(selectedInvoice)}
                      >
                        <QrCode size={14} /> Mã VietQR
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "4px 10px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                      onClick={() => setPrintInvoice(selectedInvoice)}
                      title="In phiếu thu / Lưu PDF (A4)"
                    >
                      <Printer size={14} /> In phiếu thu
                    </button>
                    <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setSelectedInvoice(null)} aria-label="Đóng">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "var(--space-2)" }}>
                  <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 8 }}>Chi tiết khoản thu</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mục</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th style={{ textAlign: "right" }}>Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{money.format(item.unitPriceSnapshot)}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{money.format(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ textAlign: "right", marginTop: 8, fontWeight: 700, fontSize: "var(--text-base)", color: "var(--color-primary)" }}>
                    Tổng: {money.format(selectedInvoice.totalAmount)}
                  </div>
                </div>

                {selectedInvoice.payments.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 8 }}>Lịch sử thanh toán</h3>
                    {selectedInvoice.payments.map((p) => (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-xs)" }}>
                        <span>
                          {p.method === "bank_transfer" ? "Chuyển khoản" : p.method === "cash" ? "Tiền mặt" : "Khác"}{" "}
                          {p.reference ? `(${p.reference})` : ""}
                        </span>
                        <span style={{ fontWeight: 600, color: "var(--color-success)" }}>+{money.format(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VietQR Payment Modal */}
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
                style={{ maxWidth: 500, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                  <div>
                    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                      <QrCode size={22} style={{ color: "var(--color-primary)" }} />
                      Mã VietQR Thanh Toán
                    </h2>
                    <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                      Phòng {qrInvoice.roomNumber} • {qrInvoice.propertyName} • Kỳ {qrInvoice.billingPeriodStart}
                    </p>
                  </div>
                  <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setQrInvoice(null)} aria-label="Đóng">
                    <X size={14} />
                  </button>
                </div>

                {!qrInvoice.bankCode || !qrInvoice.bankAccount ? (
                  <div style={{ textAlign: "center", padding: "var(--space-4) var(--space-2)" }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#eab308",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto var(--space-2)",
                    }}>
                      <Bank size={28} />
                    </div>
                    <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: 6 }}>
                      Chưa thiết lập tài khoản ngân hàng
                    </h3>
                    <p className="text-muted" style={{ fontSize: "var(--text-xs)", maxWidth: 380, margin: "0 auto var(--space-3)", lineHeight: 1.5 }}>
                      Nhà trọ <strong>{qrInvoice.propertyName}</strong> chưa có thông tin STK ngân hàng nhận tiền. Vui lòng cài đặt tài khoản ngân hàng cho nhà trọ này để hệ thống tạo mã VietQR chuẩn NAPAS 247.
                    </p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <button type="button" className="btn-ghost" onClick={() => setQrInvoice(null)}>
                        Đóng
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          setQrInvoice(null);
                          router.push("/properties");
                        }}
                      >
                        Cài đặt tài khoản ngân hàng
                      </button>
                    </div>
                  </div>
                ) : (() => {
                  const remaining = Math.max(0, qrInvoice.totalAmount - (qrInvoice.paidAmount || 0));
                  const transferDesc = `TT P${qrInvoice.roomNumber.replace(/\s+/g, "")} ${qrInvoice.billingPeriodStart.replace(/-/g, "").slice(0, 6)}`;
                  const qrUrl = buildVietQrUrl({
                    bankCode: qrInvoice.bankCode,
                    bankAccount: qrInvoice.bankAccount,
                    accountHolder: qrInvoice.accountHolder,
                    amount: remaining,
                    description: transferDesc,
                    template: "compact2",
                  });
                  const bankInfo = getBankInfo(qrInvoice.bankCode);

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
                          alt={`VietQR ${qrInvoice.propertyName} ${qrInvoice.roomNumber}`}
                          style={{
                            width: "100%",
                            maxWidth: 280,
                            height: "auto",
                            aspectRatio: "1/1",
                            objectFit: "contain",
                            display: "block",
                          }}
                          loading="eager"
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                          <a
                            href={qrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={`vietqr-phong-${qrInvoice.roomNumber}.png`}
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

                      {/* Payment Detail Items */}
                      <div style={{ marginBottom: "var(--space-3)" }}>
                        {/* Bank */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          marginBottom: 6,
                        }}>
                          <div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Ngân hàng</div>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                              {bankInfo ? `${bankInfo.shortName} (${bankInfo.code})` : qrInvoice.bankCode}
                            </div>
                          </div>
                        </div>

                        {/* Account Number */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          marginBottom: 6,
                        }}>
                          <div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tài khoản</div>
                            <div style={{ fontSize: "var(--text-base)", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}>
                              {qrInvoice.bankAccount}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => void handleCopy(qrInvoice.bankAccount!, "account")}
                          >
                            {copiedKey === "account" ? (
                              <>
                                <Check size={12} weight="bold" style={{ color: "var(--color-success)" }} />
                                <span style={{ color: "var(--color-success)" }}>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Sao chép
                              </>
                            )}
                          </button>
                        </div>

                        {/* Account Holder */}
                        {qrInvoice.accountHolder && (
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "var(--color-surface)",
                            borderRadius: 8,
                            border: "1px solid var(--color-border)",
                            marginBottom: 6,
                          }}>
                            <div>
                              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Chủ tài khoản</div>
                              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, textTransform: "uppercase" }}>
                                {qrInvoice.accountHolder}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => void handleCopy(qrInvoice.accountHolder!, "holder")}
                            >
                              {copiedKey === "holder" ? (
                                <>
                                  <Check size={12} weight="bold" style={{ color: "var(--color-success)" }} />
                                  <span style={{ color: "var(--color-success)" }}>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Sao chép
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* Amount */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          marginBottom: 6,
                        }}>
                          <div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                              {remaining < qrInvoice.totalAmount ? "Số tiền còn nợ" : "Số tiền thanh toán"}
                            </div>
                            <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                              {money.format(remaining)}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => void handleCopy(String(remaining), "amount")}
                          >
                            {copiedKey === "amount" ? (
                              <>
                                <Check size={12} weight="bold" style={{ color: "var(--color-success)" }} />
                                <span style={{ color: "var(--color-success)" }}>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Sao chép
                              </>
                            )}
                          </button>
                        </div>

                        {/* Transfer Content */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "var(--color-surface)",
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                        }}>
                          <div>
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Nội dung chuyển khoản</div>
                            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
                              {transferDesc}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={() => void handleCopy(transferDesc, "desc")}
                          >
                            {copiedKey === "desc" ? (
                              <>
                                <Check size={12} weight="bold" style={{ color: "var(--color-success)" }} />
                                <span style={{ color: "var(--color-success)" }}>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Sao chép
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button type="button" className="btn-ghost" onClick={() => setQrInvoice(null)}>
                          Đóng
                        </button>
                        {qrInvoice.status !== "paid" && qrInvoice.status !== "cancelled" && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ display: "flex", alignItems: "center", gap: 5 }}
                            onClick={() => {
                              const cur = qrInvoice;
                              setQrInvoice(null);
                              setPayInvoiceId(cur.id);
                              setPayAmount(String(remaining));
                            }}
                          >
                            <CreditCard size={14} /> Ghi nhận thanh toán
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Printable Invoice Modal (A4/PDF) */}
        <PrintableInvoiceModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      </main>
    </div>
  );
}
