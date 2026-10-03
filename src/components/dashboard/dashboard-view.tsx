"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Buildings,
  Door,
  CheckCircle,
  WarningCircle,
  ClockCountdown,
  ArrowRight,
  Lightning,
  FileText,
  Users,
  Receipt,
  ArrowClockwise,
  Drop,
  Calendar,
  CurrencyCircleDollar,
  TrendUp,
  CaretRight,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { DashboardSummary } from "../../modules/dashboard/dashboard.service";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

export function DashboardView() {
  const { user } = useAuth();

  const now = new Date();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedProperty !== "all") {
        params.set("propertyId", selectedProperty);
      }
      params.set("month", selectedMonth.toString());
      params.set("year", selectedYear.toString());

      const res = await apiClient<DashboardSummary>(`/api/dashboard?${params.toString()}`);
      setSummary(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu bảng tổng quan.");
    } finally {
      setLoading(false);
    }
  }, [selectedProperty, selectedMonth, selectedYear]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const occupancy = summary?.occupancy ?? {
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    maintenanceRooms: 0,
    occupancyRate: 0,
  };

  const financials = summary?.financials ?? {
    totalBilled: 0,
    totalCollected: 0,
    totalDebt: 0,
    unpaidInvoiceCount: 0,
    collectionRate: 100,
  };

  const utilities = summary?.utilities ?? {
    electricityKwh: 0,
    waterM3: 0,
  };

  const expiring = summary?.expiringContracts ?? [];
  const unpaid = summary?.unpaidInvoices ?? [];
  const properties = summary?.properties ?? [];

  return (
    <div className="main-container">
      {/* ── Page Header & Controls ─────────────────────────────────────── */}
      <motion.div
        className="page-title-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-desc">
            Theo dõi hiệu suất vận hành, doanh thu kỳ thu phí và các công việc cần xử lý ngay.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Property Filter */}
          <div className="form-group-inline" style={{ margin: 0 }}>
            <select
              id="property-filter"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="form-select"
              style={{ minWidth: 160, fontSize: "var(--text-xs)", padding: "7px 12px" }}
              aria-label="Chọn nhà trọ"
            >
              <option value="all">Tất cả nhà trọ ({properties.length} cơ sở)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="form-group-inline" style={{ margin: 0 }}>
            <select
              id="month-filter"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="form-select"
              style={{ fontSize: "var(--text-xs)", padding: "7px 10px" }}
              aria-label="Chọn tháng"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="form-group-inline" style={{ margin: 0 }}>
            <select
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="form-select"
              style={{ fontSize: "var(--text-xs)", padding: "7px 10px" }}
              aria-label="Chọn năm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <motion.button
            type="button"
            className="btn-secondary"
            onClick={fetchDashboard}
            disabled={loading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ padding: "7px 12px", gap: 6, fontSize: "var(--text-xs)" }}
            aria-label="Làm mới dữ liệu"
          >
            <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Error Alert */}
      {error && (
        <motion.div
          className="alert-error"
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: "var(--space-3)" }}
        >
          <WarningCircle size={18} weight="bold" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Loading Skeleton or Stats Content */}
      {loading && !summary ? (
        <div className="stats-grid" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card" style={{ minHeight: 120 }}>
              <div
                className="skeleton"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  marginBottom: 12,
                }}
              />
              <div className="skeleton" style={{ width: "50%", height: 11, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "40%", height: 28, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: "70%", height: 11 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI Metric Cards ────────────────────────────────────────── */}
          <section className="stats-grid" aria-label="Chỉ số hiệu suất chính">
            {/* Occupancy Card */}
            <motion.article
              className="stat-card"
              custom={0}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon teal">
                <Door size={20} weight="fill" />
              </div>
              <span className="stat-label">Tỷ lệ lấp đầy</span>
              <div className="stat-value vacant">{occupancy.occupancyRate}%</div>
              <span className="stat-sub">
                {occupancy.occupiedRooms}/{occupancy.totalRooms} phòng đang có khách thuê
              </span>
            </motion.article>

            {/* Billed Revenue Card */}
            <motion.article
              className="stat-card"
              custom={1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon emerald">
                <CurrencyCircleDollar size={20} weight="fill" />
              </div>
              <span className="stat-label">
                Doanh thu T{selectedMonth}/{selectedYear}
              </span>
              <div className="stat-value" style={{ color: "var(--color-primary)" }}>
                {money.format(financials.totalBilled)}
              </div>
              <span className="stat-sub">
                Đã thu: {money.format(financials.totalCollected)} ({financials.collectionRate}%)
              </span>
            </motion.article>

            {/* Total Debt Card */}
            <motion.article
              className="stat-card"
              custom={2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div
                className="stat-icon"
                style={{
                  background: financials.totalDebt > 0 ? "var(--color-danger-bg)" : "var(--color-success-bg)",
                  color: financials.totalDebt > 0 ? "var(--color-danger)" : "var(--color-success)",
                }}
              >
                <WarningCircle size={20} weight="fill" />
              </div>
              <span className="stat-label">Công nợ cần thu</span>
              <div
                className="stat-value"
                style={{
                  color: financials.totalDebt > 0 ? "var(--color-danger)" : "var(--color-success)",
                }}
              >
                {money.format(financials.totalDebt)}
              </div>
              <span className="stat-sub">
                {financials.unpaidInvoiceCount === 0
                  ? "Tất cả hóa đơn đã thanh toán xong"
                  : `${financials.unpaidInvoiceCount} hóa đơn chưa thu đủ`}
              </span>
            </motion.article>

            {/* Expiring Contracts Card */}
            <motion.article
              className="stat-card"
              custom={3}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon amber">
                <ClockCountdown size={20} weight="fill" />
              </div>
              <span className="stat-label">Hợp đồng sắp hết hạn</span>
              <div
                className="stat-value"
                style={{
                  color: expiring.length > 0 ? "var(--color-warning)" : "var(--color-fg)",
                }}
              >
                {expiring.length}
              </div>
              <span className="stat-sub">
                {expiring.filter((c) => c.isUrgent).length > 0
                  ? `Có ${expiring.filter((c) => c.isUrgent).length} hợp đồng < 7 ngày tới`
                  : "Trong vòng 30 ngày tiếp theo"}
              </span>
            </motion.article>

            {/* Utility Card */}
            <motion.article
              className="stat-card"
              custom={4}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#c084fc" }}>
                <Lightning size={20} weight="fill" />
              </div>
              <span className="stat-label">Tiêu thụ điện / nước</span>
              <div className="stat-value" style={{ fontSize: "var(--text-xl)" }}>
                {utilities.electricityKwh} <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>kWh</span> / {utilities.waterM3} <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>m³</span>
              </div>
              <span className="stat-sub">Đã ghi chỉ số trong kỳ {selectedMonth}/{selectedYear}</span>
            </motion.article>
          </section>

          {/* ── Visual Breakdown Bars ───────────────────────────────────── */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
              marginBottom: "var(--space-3)",
            }}
          >
            {/* Room Breakdown Card */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Phân bổ trạng thái phòng
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                  Tổng: {occupancy.totalRooms} phòng
                </span>
              </div>

              {/* Multi-segment Bar */}
              <div
                style={{
                  height: 10,
                  width: "100%",
                  background: "var(--color-surface-3)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  display: "flex",
                  marginBottom: 14,
                }}
              >
                {occupancy.totalRooms > 0 && (
                  <>
                    <div
                      style={{
                        width: `${(occupancy.occupiedRooms / occupancy.totalRooms) * 100}%`,
                        background: "var(--color-success)",
                        transition: "width 0.4s ease",
                      }}
                      title={`Đang thuê: ${occupancy.occupiedRooms}`}
                    />
                    <div
                      style={{
                        width: `${(occupancy.vacantRooms / occupancy.totalRooms) * 100}%`,
                        background: "var(--color-primary)",
                        transition: "width 0.4s ease",
                      }}
                      title={`Phòng trống: ${occupancy.vacantRooms}`}
                    />
                    <div
                      style={{
                        width: `${(occupancy.maintenanceRooms / occupancy.totalRooms) * 100}%`,
                        background: "var(--color-warning)",
                        transition: "width 0.4s ease",
                      }}
                      title={`Bảo trì: ${occupancy.maintenanceRooms}`}
                    />
                  </>
                )}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--color-fg-2)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)" }} />
                  Đang thuê: <strong>{occupancy.occupiedRooms}</strong>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
                  Trống: <strong>{occupancy.vacantRooms}</strong>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-warning)" }} />
                  Bảo trì: <strong>{occupancy.maintenanceRooms}</strong>
                </span>
              </div>
            </div>

            {/* Financial Collection Bar */}
            <div className="card" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Tiến độ thu tiền kỳ {selectedMonth}/{selectedYear}
                </span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-success)" }}>
                  Đạt {financials.collectionRate}%
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: 10,
                  width: "100%",
                  background: "var(--color-surface-3)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                  display: "flex",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, financials.collectionRate)}%`,
                    background: "var(--color-success)",
                    transition: "width 0.4s ease",
                  }}
                  title={`Đã thu: ${money.format(financials.totalCollected)}`}
                />
              </div>

              {/* Legend */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--color-fg-2)" }}>
                <span>
                  Đã thu: <strong style={{ color: "var(--color-success)" }}>{money.format(financials.totalCollected)}</strong>
                </span>
                <span>
                  Chưa thu: <strong style={{ color: financials.totalDebt > 0 ? "var(--color-danger)" : "var(--color-fg-3)" }}>
                    {money.format(Math.max(0, financials.totalBilled - financials.totalCollected))}
                  </strong>
                </span>
              </div>
            </div>
          </section>

          {/* ── Actionable Alerts Grid (2 Columns) ──────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 16,
              marginBottom: "var(--space-4)",
            }}
          >
            {/* Column 1: Unpaid Invoices */}
            <motion.article
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <header className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="stat-icon" style={{ width: 28, height: 28, background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
                    <Receipt size={16} weight="bold" />
                  </div>
                  <div>
                    <h2 className="card-title" style={{ fontSize: "var(--text-base)" }}>Hóa đơn cần thu</h2>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                      {unpaid.length} hóa đơn đang chờ thanh toán
                    </span>
                  </div>
                </div>

                <Link href="/invoices" className="btn-secondary" style={{ padding: "5px 10px", fontSize: "var(--text-xs)", gap: 4 }}>
                  <span>Tất cả</span>
                  <CaretRight size={12} />
                </Link>
              </header>

              <div style={{ padding: unpaid.length === 0 ? "32px 20px" : "8px 0" }}>
                {unpaid.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--color-fg-3)" }}>
                    <CheckCircle size={32} weight="fill" style={{ color: "var(--color-success)", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-fg-2)" }}>
                      Tuyệt vời! Không có hóa đơn nào nợ quá hạn.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table" style={{ fontSize: "var(--text-xs)" }}>
                      <thead>
                        <tr>
                          <th>Phòng</th>
                          <th>Khách thuê</th>
                          <th>Còn nợ</th>
                          <th>Hạn trả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaid.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <span style={{ fontWeight: 600 }}>Phòng {inv.roomNumber}</span>
                              <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>{inv.propertyName}</div>
                            </td>
                            <td>{inv.tenantName}</td>
                            <td style={{ color: "var(--color-danger)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                              {money.format(inv.remainingAmount)}
                            </td>
                            <td>
                              {inv.isOverdue ? (
                                <span className="badge" style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
                                  Quá {inv.daysOverdue} ngày
                                </span>
                              ) : inv.dueDate ? (
                                <span className="text-muted">{inv.dueDate}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.article>

            {/* Column 2: Expiring Contracts */}
            <motion.article
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <header className="card-header" style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="stat-icon" style={{ width: 28, height: 28, background: "var(--color-warning-bg)", color: "var(--color-warning)" }}>
                    <FileText size={16} weight="bold" />
                  </div>
                  <div>
                    <h2 className="card-title" style={{ fontSize: "var(--text-base)" }}>Hợp đồng sắp hết hạn</h2>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                      Trong vòng 30 ngày tới
                    </span>
                  </div>
                </div>

                <Link href="/contracts" className="btn-secondary" style={{ padding: "5px 10px", fontSize: "var(--text-xs)", gap: 4 }}>
                  <span>Tất cả</span>
                  <CaretRight size={12} />
                </Link>
              </header>

              <div style={{ padding: expiring.length === 0 ? "32px 20px" : "8px 0" }}>
                {expiring.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--color-fg-3)" }}>
                    <CheckCircle size={32} weight="fill" style={{ color: "var(--color-success)", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-fg-2)" }}>
                      Không có hợp đồng nào hết hạn trong 30 ngày tới.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="data-table" style={{ fontSize: "var(--text-xs)" }}>
                      <thead>
                        <tr>
                          <th>Phòng</th>
                          <th>Khách thuê</th>
                          <th>Ngày hết hạn</th>
                          <th>Thời hạn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiring.map((c) => (
                          <tr key={c.id}>
                            <td>
                              <span style={{ fontWeight: 600 }}>Phòng {c.roomNumber}</span>
                              <div style={{ fontSize: "11px", color: "var(--color-fg-3)" }}>{c.propertyName}</div>
                            </td>
                            <td>{c.tenantName}</td>
                            <td className="text-muted">{c.endDate}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: c.isUrgent ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
                                  color: c.isUrgent ? "var(--color-danger)" : "var(--color-warning)",
                                  fontWeight: 600,
                                }}
                              >
                                {c.isUrgent ? `Gấp: còn ${c.daysRemaining} ngày` : `Còn ${c.daysRemaining} ngày`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.article>
          </div>

          {/* ── Quick Module Shortcuts Strip ────────────────────────────── */}
          <motion.div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "16px 20px",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-3)", marginRight: 6 }}>
              Truy cập nhanh:
            </span>
            {[
              { href: "/properties", label: "Nhà & Phòng", Icon: Buildings },
              { href: "/tenants", label: "Khách thuê", Icon: Users },
              { href: "/contracts", label: "Hợp đồng", Icon: FileText },
              { href: "/meters", label: "Điện & Nước", Icon: Lightning },
              { href: "/invoices", label: "Hóa đơn", Icon: Receipt },
            ].map(({ href, label, Icon }, i) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link
                  href={href}
                  className="btn-secondary"
                  style={{ fontSize: "var(--text-xs)", padding: "7px 14px", gap: 6 }}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
