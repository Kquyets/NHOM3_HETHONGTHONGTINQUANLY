"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Lightning,
  Drop,
  Plus,
  X,
  Trash,
  Door,
  CalendarBlank,
  CurrencyDollar,
  Receipt,
  Buildings,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { MeterReadingRow, UtilityRateRow, UtilityType } from "../../modules/meters/meter.service";

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
export default function MetersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"readings" | "rates">("readings");
  const [readings, setReadings] = useState<MeterReadingRow[]>([]);
  const [rates, setRates] = useState<UtilityRateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | UtilityType>("all");

  const [showAddReading, setShowAddReading] = useState(false);
  const [submittingReading, setSubmittingReading] = useState(false);
  const [rRoomId, setRRoomId] = useState("");
  const [rPropId, setRPropId] = useState("");
  const [rType, setRType] = useState<UtilityType>("electricity");
  const [rPeriod, setRPeriod] = useState("");
  const [rPrev, setRPrev] = useState("");
  const [rCurr, setRCurr] = useState("");
  const [rPrice, setRPrice] = useState("");

  const [showAddRate, setShowAddRate] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [ratePropId, setRatePropId] = useState("");
  const [rateType, setRateType] = useState<UtilityType>("electricity");
  const [ratePrice, setRatePrice] = useState("");
  const [rateFrom, setRateFrom] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [readingsRes, ratesRes] = await Promise.all([
        apiClient<{ readings: MeterReadingRow[] }>("/api/meters"),
        apiClient<{ utilityRates: UtilityRateRow[] }>("/api/utility-rates"),
      ]);
      setReadings(readingsRes.readings);
      setRates(ratesRes.utilityRates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu chỉ số.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadData();
  }, [user, authLoading, router, loadData]);

  const handleCreateReading = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingReading(true);
      await apiClient("/api/meters", {
        method: "POST",
        body: JSON.stringify({
          roomId: rRoomId.trim(),
          propertyId: rPropId.trim(),
          utilityType: rType,
          billingPeriod: rPeriod,
          previousValue: Number(rPrev),
          currentValue: Number(rCurr),
          unitPriceSnapshot: Number(rPrice || 0),
        }),
      });
      setShowAddReading(false);
      setRRoomId("");
      setRPropId("");
      setRPrev("");
      setRCurr("");
      setRPrice("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu chỉ số thất bại.");
    } finally {
      setSubmittingReading(false);
    }
  };

  const handleCreateRate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingRate(true);
      await apiClient("/api/utility-rates", {
        method: "POST",
        body: JSON.stringify({
          propertyId: ratePropId.trim(),
          utilityType: rateType,
          unitPrice: Number(ratePrice),
          effectiveFrom: rateFrom,
        }),
      });
      setShowAddRate(false);
      setRatePropId("");
      setRatePrice("");
      setRateFrom("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo biểu giá thất bại.");
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleDeleteReading = async (reading: MeterReadingRow) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi chỉ số này?")) return;
    try {
      await apiClient(`/api/meters/${reading.id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa bản ghi chỉ số.");
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

  const filteredReadings = readings.filter(
    (r) => filterType === "all" || r.utilityType === filterType,
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
            <h1 className="page-title">Điện &amp; Nước</h1>
            <p className="page-desc">Ghi nhận chỉ số điện nước hàng tháng và quản lý đơn giá tiêu thụ.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {activeTab === "readings" ? (
              <motion.button
                type="button"
                className={showAddReading ? "btn-secondary" : "btn-primary"}
                onClick={() => setShowAddReading(!showAddReading)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {showAddReading ? <X size={14} /> : <Plus size={14} weight="bold" />}
                {showAddReading ? "Đóng" : "Ghi chỉ số"}
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className={showAddRate ? "btn-secondary" : "btn-primary"}
                onClick={() => setShowAddRate(!showAddRate)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {showAddRate ? <X size={14} /> : <Plus size={14} weight="bold" />}
                {showAddRate ? "Đóng" : "Thêm đơn giá"}
              </motion.button>
            )}
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

        {/* Add Reading Panel */}
        <AnimatePresence>
          {showAddReading && (
            <SlidePanel title="Ghi chỉ số mới" onClose={() => setShowAddReading(false)}>
              <form onSubmit={handleCreateReading}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-prop">Property ID *</label>
                    <input id="r-prop" type="text" className="form-control" placeholder="ID nhà trọ" value={rPropId} onChange={(e) => setRPropId(e.target.value)} required autoFocus />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-room">Room ID *</label>
                    <input id="r-room" type="text" className="form-control" placeholder="ID phòng" value={rRoomId} onChange={(e) => setRRoomId(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-type">Loại tiện ích *</label>
                    <select id="r-type" className="form-control" value={rType} onChange={(e) => setRType(e.target.value as UtilityType)}>
                      <option value="electricity">Điện (kWh)</option>
                      <option value="water">Nước (m³)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-period">Kỳ hóa đơn (Ngày 01 đầu tháng) *</label>
                    <input id="r-period" type="date" className="form-control" value={rPeriod} onChange={(e) => setRPeriod(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-prev">Chỉ số cũ *</label>
                    <input id="r-prev" type="number" step="0.001" min="0" className="form-control" placeholder="VD: 100" value={rPrev} onChange={(e) => setRPrev(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-curr">Chỉ số mới *</label>
                    <input id="r-curr" type="number" step="0.001" min="0" className="form-control" placeholder="VD: 150" value={rCurr} onChange={(e) => setRCurr(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-price">Đơn giá áp dụng (VND) *</label>
                    <input id="r-price" type="number" min="0" className="form-control" placeholder="VD: 3500" value={rPrice} onChange={(e) => setRPrice(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddReading(false)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingReading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingReading ? "Đang lưu..." : "Lưu chỉ số"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Add Rate Panel */}
        <AnimatePresence>
          {showAddRate && (
            <SlidePanel title="Thêm đơn giá mới" onClose={() => setShowAddRate(false)}>
              <form onSubmit={handleCreateRate}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-prop">Property ID *</label>
                    <input id="rate-prop" type="text" className="form-control" placeholder="ID nhà trọ" value={ratePropId} onChange={(e) => setRatePropId(e.target.value)} required autoFocus />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-type">Loại tiện ích *</label>
                    <select id="rate-type" className="form-control" value={rateType} onChange={(e) => setRateType(e.target.value as UtilityType)}>
                      <option value="electricity">Điện (kWh)</option>
                      <option value="water">Nước (m³)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-price">Đơn giá (VND) *</label>
                    <input id="rate-price" type="number" min="0" className="form-control" placeholder="VD: 3500" value={ratePrice} onChange={(e) => setRatePrice(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-from">Hiệu lực từ *</label>
                    <input id="rate-from" type="date" className="form-control" value={rateFrom} onChange={(e) => setRateFrom(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddRate(false)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingRate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingRate ? "Đang lưu..." : "Lưu đơn giá"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-2)" }}>
          <motion.button
            type="button"
            className={activeTab === "readings" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 16px", fontSize: "var(--text-sm)" }}
            onClick={() => setActiveTab("readings")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Chỉ số định kỳ ({readings.length})
          </motion.button>
          <motion.button
            type="button"
            className={activeTab === "rates" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 16px", fontSize: "var(--text-sm)" }}
            onClick={() => setActiveTab("rates")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Đơn giá tiêu thụ ({rates.length})
          </motion.button>
        </div>

        {/* Content */}
        {activeTab === "readings" ? (
          <div>
            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-2)" }}>
              <button
                type="button"
                className={filterType === "all" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)" }}
                onClick={() => setFilterType("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={filterType === "electricity" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => setFilterType("electricity")}
              >
                <Lightning size={12} weight="fill" /> Điện
              </button>
              <button
                type="button"
                className={filterType === "water" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => setFilterType("water")}
              >
                <Drop size={12} weight="fill" /> Nước
              </button>
            </div>

            {loading ? (
              <div className="card" style={{ padding: "var(--space-3)" }}>
                <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : filteredReadings.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"><Receipt size={28} /></div>
                  <p className="text-muted" style={{ margin: 0 }}>Chưa có bản ghi chỉ số nào.</p>
                </div>
              </div>
            ) : (
              <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Phòng / Nhà</th>
                        <th>Loại</th>
                        <th>Kỳ tính</th>
                        <th>Chỉ số cũ</th>
                        <th>Chỉ số mới</th>
                        <th>Tiêu thụ</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReadings.map((reading, i) => {
                        const usage = Number(reading.currentValue) - Number(reading.previousValue);
                        const cost = usage * reading.unitPriceSnapshot;
                        return (
                          <motion.tr key={reading.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Door size={13} style={{ color: "var(--color-fg-3)" }} />
                                  Phòng {reading.roomNumber}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Buildings size={11} />{reading.propertyName}
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                {reading.utilityType === "electricity" ? (
                                  <><Lightning size={10} weight="fill" /> Điện</>
                                ) : (
                                  <><Drop size={10} weight="fill" /> Nước</>
                                )}
                              </span>
                            </td>
                            <td className="text-muted">{reading.billingPeriod}</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{reading.previousValue}</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{reading.currentValue}</td>
                            <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                              {usage.toFixed(1)} {reading.utilityType === "electricity" ? "kWh" : "m³"}
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{money.format(reading.unitPriceSnapshot)}</td>
                            <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money.format(cost)}</td>
                            <td style={{ textAlign: "right" }}>
                              {user?.role === "owner" && (
                                <motion.button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => void handleDeleteReading(reading)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  title="Xóa chỉ số"
                                >
                                  <Trash size={12} />
                                </motion.button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          /* Rates tab */
          <div>
            {loading ? (
              <div className="card" style={{ padding: "var(--space-3)" }}>
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : rates.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"><CurrencyDollar size={28} /></div>
                  <p className="text-muted" style={{ margin: 0 }}>Chưa có biểu giá nào được thiết lập.</p>
                </div>
              </div>
            ) : (
              <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Loại tiện ích</th>
                        <th>Đơn giá</th>
                        <th>Hiệu lực từ</th>
                        <th>Hiệu lực đến</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate, i) => (
                        <motion.tr key={rate.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {rate.utilityType === "electricity" ? (
                                <><Lightning size={14} weight="fill" /> Điện (kWh)</>
                              ) : (
                                <><Drop size={14} weight="fill" /> Nước (m³)</>
                              )}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money.format(rate.unitPrice)}</td>
                          <td className="text-muted">{rate.effectiveFrom}</td>
                          <td className="text-muted">{rate.effectiveTo ?? "Hiện tại"}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
