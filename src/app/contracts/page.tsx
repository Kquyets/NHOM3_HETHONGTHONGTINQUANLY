"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  X,
  Trash,
  MagnifyingGlass,
  CalendarBlank,
  CheckCircle,
  Clock,
  XCircle,
  ArrowCounterClockwise,
  Buildings,
  Door,
  CurrencyDollar,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { ContractRow, ContractStatus } from "../../modules/contracts/contract.service";

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

const STATUS_CONFIG: Record<ContractStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  draft:     { label: "Nháp",          cls: "badge",              Icon: Clock },
  active:    { label: "Đang hiệu lực", cls: "badge ready",        Icon: CheckCircle },
  ended:     { label: "Đã kết thúc",   cls: "badge maintenance",  Icon: ArrowCounterClockwise },
  cancelled: { label: "Đã hủy",        cls: "badge",              Icon: XCircle },
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

/* ── Create Form ─────────────────────────────────────────────────── */
function CreateContractForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  onSubmit: (data: {
    roomId: string;
    startDate: string;
    endDate: string;
    monthlyRentSnapshot: string;
    depositSnapshot: string;
  }) => void;
  onCancel: () => void;
}) {
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [deposit, setDeposit] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ roomId, startDate, endDate, monthlyRentSnapshot: monthlyRent, depositSnapshot: deposit });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-room-id">Room ID *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <Door size={15} />
            </span>
            <input id="c-room-id" type="text" className="form-control" style={{ paddingLeft: 34 }} placeholder="ID phòng" value={roomId} onChange={(e) => setRoomId(e.target.value)} required autoFocus />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-start">Ngày bắt đầu *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CalendarBlank size={15} />
            </span>
            <input id="c-start" type="date" className="form-control" style={{ paddingLeft: 34 }} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-end">Ngày kết thúc</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CalendarBlank size={15} />
            </span>
            <input id="c-end" type="date" className="form-control" style={{ paddingLeft: 34 }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-rent">Tiền thuê / tháng (VND) *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CurrencyDollar size={15} />
            </span>
            <input id="c-rent" type="number" className="form-control" style={{ paddingLeft: 34 }} placeholder="VD: 3000000" min="0" step="100000" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-deposit">Tiền cọc (VND) *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CurrencyDollar size={15} />
            </span>
            <input id="c-deposit" type="number" className="form-control" style={{ paddingLeft: 34 }} placeholder="VD: 6000000" min="0" step="100000" value={deposit} onChange={(e) => setDeposit(e.target.value)} required />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Hủy</button>
        <motion.button type="submit" className="btn-primary" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          {submitting ? <><span className="spinner" aria-hidden="true" />Đang lưu...</> : <><Plus size={13} weight="bold" />Tạo hợp đồng</>}
        </motion.button>
      </div>
    </form>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function ContractsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContractStatus | "all">("all");

  const [showAdd, setShowAdd] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ contracts: ContractRow[] }>("/api/contracts");
      setContracts(res.contracts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách hợp đồng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadContracts();
  }, [user, authLoading, router, loadContracts]);

  const handleCreate = async (data: {
    roomId: string;
    startDate: string;
    endDate: string;
    monthlyRentSnapshot: string;
    depositSnapshot: string;
  }) => {
    try {
      setSubmittingAdd(true);
      await apiClient("/api/contracts", {
        method: "POST",
        body: JSON.stringify({
          roomId: data.roomId,
          startDate: data.startDate,
          endDate: data.endDate || null,
          monthlyRentSnapshot: Number(data.monthlyRentSnapshot),
          depositSnapshot: Number(data.depositSnapshot),
        }),
      });
      setShowAdd(false);
      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo hợp đồng thất bại.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleUpdateStatus = async (contract: ContractRow, status: ContractStatus) => {
    const labels: Record<ContractStatus, string> = {
      draft: "chuyển sang nháp",
      active: "kích hoạt",
      ended: "kết thúc",
      cancelled: "hủy",
    };
    if (!window.confirm(`Bạn có chắc muốn ${labels[status]} hợp đồng này?`)) return;
    try {
      await apiClient(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái.");
    }
  };

  const handleDelete = async (contract: ContractRow) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hợp đồng này?`)) return;
    try {
      await apiClient(`/api/contracts/${contract.id}`, { method: "DELETE" });
      await loadContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa hợp đồng.");
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
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

  const filtered = contracts.filter((c) => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchSearch =
      c.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.propertyName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = contracts.reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] ?? 0) + 1; return acc; },
    {} as Partial<Record<ContractStatus, number>>,
  );

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
            <h1 className="page-title">Hợp đồng</h1>
            <p className="page-desc">Quản lý hợp đồng thuê phòng và theo dõi trạng thái.</p>
          </div>
          <motion.button
            type="button"
            className={showAdd ? "btn-secondary" : "btn-primary"}
            onClick={() => setShowAdd(!showAdd)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {showAdd ? <X size={14} /> : <Plus size={14} weight="bold" />}
            {showAdd ? "Đóng" : "Tạo hợp đồng"}
          </motion.button>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div className="alert-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ marginBottom: "var(--space-2)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Panel */}
        <AnimatePresence>
          {showAdd && (
            <SlidePanel title="Tạo hợp đồng mới" onClose={() => setShowAdd(false)}>
              <CreateContractForm submitting={submittingAdd} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Stats */}
        {contracts.length > 0 && (
          <motion.div
            style={{ display: "flex", gap: 10, marginBottom: "var(--space-2)", flexWrap: "wrap" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {(["all", "draft", "active", "ended", "cancelled"] as const).map((s) => {
              const count = s === "all" ? contracts.length : (statusCounts[s] ?? 0);
              const isActive = filterStatus === s;
              return (
                <motion.button
                  key={s}
                  type="button"
                  className={isActive ? "btn-primary" : "btn-ghost"}
                  style={{ padding: "5px 14px", fontSize: "var(--text-sm)" }}
                  onClick={() => setFilterStatus(s)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label} ({count})
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Search */}
        {contracts.length > 0 && (
          <div style={{ position: "relative", marginBottom: "var(--space-2)" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <MagnifyingGlass size={15} />
            </span>
            <input
              type="search"
              className="form-control"
              style={{ paddingLeft: 34, maxWidth: 360 }}
              placeholder="Tìm theo phòng hoặc nhà trọ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tìm kiếm hợp đồng"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="card" style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <div className="skeleton" style={{ flex: 2, height: 14 }} />
                <div className="skeleton" style={{ flex: 1, height: 14 }} />
                <div className="skeleton" style={{ flex: 1, height: 14 }} />
                <div className="skeleton" style={{ width: 80, height: 14 }} />
              </div>
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="empty-state">
              <div className="empty-icon"><FileText size={28} /></div>
              <p className="text-muted" style={{ margin: 0 }}>Chưa có hợp đồng nào. Tạo hợp đồng để bắt đầu quản lý.</p>
              <motion.button type="button" className="btn-primary" onClick={() => setShowAdd(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Plus size={14} weight="bold" />Tạo hợp đồng ngay
              </motion.button>
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="empty-state">
              <div className="empty-icon"><MagnifyingGlass size={24} /></div>
              <p className="text-muted" style={{ margin: 0 }}>Không tìm thấy hợp đồng phù hợp.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phòng / Nhà trọ</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th>Tiền thuê</th>
                    <th>Tiền cọc</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contract, i) => {
                    const cfg = STATUS_CONFIG[contract.status];
                    return (
                      <motion.tr key={contract.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Door size={13} style={{ color: "var(--color-fg-3)" }} />
                              Phòng {contract.roomNumber}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                              <Buildings size={11} />{contract.propertyName}
                            </span>
                          </span>
                        </td>
                        <td className="text-muted">{formatDate(contract.startDate)}</td>
                        <td className="text-muted">{formatDate(contract.endDate)}</td>
                        <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                          {money.format(contract.monthlyRentSnapshot)}
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                          {money.format(contract.depositSnapshot)}
                        </td>
                        <td>
                          <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <cfg.Icon size={10} weight="fill" />{cfg.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {contract.status === "draft" && (
                              <motion.button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }} onClick={() => void handleUpdateStatus(contract, "active")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <CheckCircle size={11} />Kích hoạt
                              </motion.button>
                            )}
                            {contract.status === "active" && (
                              <motion.button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }} onClick={() => void handleUpdateStatus(contract, "ended")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <ArrowCounterClockwise size={11} />Kết thúc
                              </motion.button>
                            )}
                            {(contract.status === "draft" || contract.status === "cancelled") && user?.role === "owner" && (
                              <motion.button type="button" className="btn-ghost" style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }} onClick={() => void handleDelete(contract)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Trash size={11} />Xóa
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: "10px var(--space-3)", borderTop: "1px solid var(--color-border)", display: "flex", gap: 16, fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <FileText size={11} />
                {filtered.length} / {contracts.length} hợp đồng
              </span>
              {statusCounts.active && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle size={11} weight="fill" style={{ color: "var(--color-success)" }} />
                  {statusCounts.active} đang hiệu lực
                </span>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
