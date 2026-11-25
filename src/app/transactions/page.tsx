"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  MagnifyingGlass,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { useAuth } from "../../lib/auth-context";
import { apiClient } from "../../lib/api-client";

type TransactionItem = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  propertyId: string;
  propertyName: string;
  roomId?: string | null;
  roomNumber?: string | null;
  category: string;
  method: string;
  reference?: string | null;
  note?: string | null;
};

type TransactionStats = {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  transactionCount: number;
};

type PropertyOption = {
  id: string;
  name: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [stats, setStats] = useState<TransactionStats>({
    totalIncome: 0,
    totalExpense: 0,
    netCashflow: 0,
    transactionCount: 0,
  });
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activePropertyId, setActivePropertyId] = useState("all");
  const [activeType, setActiveType] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activePropertyId !== "all") params.set("propertyId", activePropertyId);
      if (activeType !== "all") params.set("type", activeType);

      const [txRes, propRes] = await Promise.all([
        apiClient<{ transactions: TransactionItem[]; stats: TransactionStats }>(
          `/api/transactions?${params.toString()}`,
        ),
        apiClient<{ properties: PropertyOption[] }>("/api/properties"),
      ]);

      setTransactions(txRes.transactions || []);
      setStats(
        txRes.stats || {
          totalIncome: 0,
          totalExpense: 0,
          netCashflow: 0,
          transactionCount: 0,
        },
      );
      setProperties(propRes.properties || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải sổ quỹ giao dịch";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activePropertyId, activeType]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "tenant") {
      router.replace("/");
      return;
    }
    void loadData();
  }, [user, authLoading, router, loadData]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return transactions;

    return transactions.filter((t) => {
      const matchProp = t.propertyName.toLowerCase().includes(q);
      const matchRoom = t.roomNumber?.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchRef = t.reference?.toLowerCase().includes(q);
      const matchNote = t.note?.toLowerCase().includes(q);
      return matchProp || matchRoom || matchCat || matchRef || matchNote;
    });
  }, [transactions, searchQuery]);

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {/* Page Header */}
        <motion.div
          className="page-title-row"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="page-title">Sổ quỹ Giao dịch</h1>
            <p className="page-desc">
              Nhật ký dòng tiền thực tế — tổng hợp doanh thu thu từ khách thuê và các khoản chi phí vận hành, sửa chữa.
            </p>
          </div>
        </motion.div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="alert-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: "var(--space-3)" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Financial KPI Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginBottom: "var(--space-4)",
          }}
        >
          {/* Total Income */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderLeft: "4px solid #10b981",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowDownLeft size={22} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", fontWeight: 600 }}>
                TỔNG THỰC THU
              </div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "#059669" }}>
                {stats.totalIncome.toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>

          {/* Total Expense */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderLeft: "4px solid #ef4444",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowUpRight size={22} weight="bold" />
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", fontWeight: 600 }}>
                TỔNG THỰC CHI
              </div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "#dc2626" }}>
                {stats.totalExpense.toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>

          {/* Net Cashflow */}
          <div
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              borderLeft: "4px solid var(--color-primary, #2563eb)",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "var(--color-primary, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wallet size={22} weight="fill" />
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", fontWeight: 600 }}>
                DÒNG TIỀN THUẦN (LỢI NHUẬN)
              </div>
              <div
                style={{
                  fontSize: "var(--text-xl)",
                  fontWeight: 800,
                  color: stats.netCashflow >= 0 ? "var(--color-primary, #2563eb)" : "#dc2626",
                }}
              >
                {stats.netCashflow.toLocaleString("vi-VN")} đ
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar: Filters & Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            backgroundColor: "var(--color-bg-panel, #ffffff)",
            padding: "12px 18px",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border)",
            marginBottom: "var(--space-4)",
          }}
        >
          {/* Property Filter & Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              className="form-control"
              style={{ fontWeight: 600, minWidth: 200, padding: "6px 12px", height: "auto" }}
              value={activePropertyId}
              onChange={(e) => setActivePropertyId(e.target.value)}
            >
              <option value="all">🏢 Tất cả nhà trọ</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Type Filter Buttons */}
            <div style={{ display: "inline-flex", padding: 3, backgroundColor: "var(--color-bg-subtle)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
              <button
                type="button"
                onClick={() => setActiveType("all")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: "var(--text-xs)",
                  fontWeight: activeType === "all" ? 600 : 500,
                  border: "none",
                  backgroundColor: activeType === "all" ? "var(--color-primary)" : "transparent",
                  color: activeType === "all" ? "#ffffff" : "var(--color-fg-2)",
                  cursor: "pointer",
                }}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveType("income")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: "var(--text-xs)",
                  fontWeight: activeType === "income" ? 600 : 500,
                  border: "none",
                  backgroundColor: activeType === "income" ? "#10b981" : "transparent",
                  color: activeType === "income" ? "#ffffff" : "var(--color-fg-2)",
                  cursor: "pointer",
                }}
              >
                Khoản thu (+)
              </button>
              <button
                type="button"
                onClick={() => setActiveType("expense")}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: "var(--text-xs)",
                  fontWeight: activeType === "expense" ? 600 : 500,
                  border: "none",
                  backgroundColor: activeType === "expense" ? "#ef4444" : "transparent",
                  color: activeType === "expense" ? "#ffffff" : "var(--color-fg-2)",
                  cursor: "pointer",
                }}
              >
                Khoản chi (-)
              </button>
            </div>
          </div>

          {/* Search box */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-fg-3)",
                display: "flex",
                pointerEvents: "none",
              }}
            >
              <MagnifyingGlass size={15} />
            </span>
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: 32, fontSize: "var(--text-sm)" }}
              placeholder="Tìm theo phòng, cơ sở, nội dung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Transactions Table / List */}
        {loading ? (
          <div className="card skeleton" style={{ height: 320, borderRadius: 12 }} />
        ) : filteredTransactions.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "48px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CreditCard size={28} />
            </div>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, margin: 0 }}>
              Chưa có dữ liệu giao dịch trong kỳ
            </h3>
            <p className="text-muted text-sm" style={{ maxWidth: 440, margin: 0 }}>
              Giao dịch thu sẽ tự động xuất hiện khi khách thuê thanh toán hóa đơn. Giao dịch chi được ghi nhận khi có chi phí sửa chữa, bảo trì hoàn tất.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Loại</th>
                    <th>Nhà trọ & Phòng</th>
                    <th>Nội dung / Danh mục</th>
                    <th>Hình thức</th>
                    <th style={{ textAlign: "right" }}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === "income";
                    const txDate = new Date(tx.date);
                    const formattedDate = txDate.toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", whiteSpace: "nowrap" }}>
                          {formattedDate}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              backgroundColor: isIncome ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                              color: isIncome ? "#059669" : "#dc2626",
                            }}
                          >
                            {isIncome ? <ArrowDownLeft size={12} weight="bold" /> : <ArrowUpRight size={12} weight="bold" />}
                            {isIncome ? "Thu" : "Chi"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                            {tx.propertyName}
                          </div>
                          {tx.roomNumber && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                              Phòng {tx.roomNumber}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: "var(--text-sm)" }}>
                            {tx.category}
                          </div>
                          {tx.note && (
                            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                              {tx.note}
                            </div>
                          )}
                          {tx.reference && (
                            <div style={{ fontSize: 11, color: "var(--color-fg-3)", fontStyle: "italic" }}>
                              Ref: {tx.reference}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "var(--text-xs)" }}>
                          {tx.method}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: "var(--text-base)",
                            color: isIncome ? "#059669" : "#dc2626",
                            whiteSpace: "nowrap",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {isIncome ? "+" : "-"}
                          {tx.amount.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
