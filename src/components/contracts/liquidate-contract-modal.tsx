"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, CheckCircle, Warning, Coins, Wrench, Drop } from "@phosphor-icons/react";
import { apiClient } from "../../lib/api-client";
import { money } from "../../utils/format";
import type { ContractRow } from "../../modules/contracts/contract.service";

export function LiquidateContractModal({
  contract,
  onClose,
  onLiquidated,
}: {
  contract: ContractRow;
  onClose: () => void;
  onLiquidated: () => Promise<void>;
}) {
  const initialDeposit = contract.depositSnapshot || 0;
  const [damageDeduction, setDamageDeduction] = useState("0");
  const [utilityDeduction, setUtilityDeduction] = useState("0");
  const [liquidationNotes, setLiquidationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const damageNum = Math.max(0, parseInt(damageDeduction, 10) || 0);
  const utilityNum = Math.max(0, parseInt(utilityDeduction, 10) || 0);
  const totalDeduction = damageNum + utilityNum;
  const refundAmount = Math.max(0, initialDeposit - totalDeduction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Xác nhận thanh lý hợp đồng Phòng ${contract.roomNumber} và hoàn trả ${money.format(refundAmount)} cho khách thuê?`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "liquidate",
          damageDeduction: damageNum,
          utilityDeduction: utilityNum,
          liquidationNotes: liquidationNotes.trim() || null,
        }),
      });
      await onLiquidated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thanh lý hợp đồng thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Thanh lý hợp đồng và hoàn cọc"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3)",
          maxWidth: 580,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.35)",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: "var(--text-md)", fontWeight: 700, margin: 0, color: "var(--color-fg)" }}>
              Quy trình Thanh lý hợp đồng & Hoàn cọc
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
              Phòng {contract.roomNumber} — {contract.propertyName} (Khách đại diện: {contract.tenants?.[0]?.fullName || "Chưa có"})
            </p>
          </div>
          <button type="button" className="btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: "var(--color-danger, #ef4444)", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: 6, fontSize: "var(--text-xs)", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Summary Banner */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: 14,
            borderRadius: 8,
            backgroundColor: "var(--color-bg-subtle)",
            border: "1px solid var(--color-border)",
          }}>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Tiền đặt cọc ban đầu:</span>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-primary)", marginTop: 2 }}>
                {money.format(initialDeposit)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Chu kỳ thanh toán:</span>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)", marginTop: 2 }}>
                {contract.paymentCycleMonths || 1} tháng / lần
              </div>
            </div>
          </div>

          {/* Deductions inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="damage-deduction" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Wrench size={13} style={{ color: "var(--color-warning)" }} />
                <span>Khấu trừ hư hại tài sản (VND)</span>
              </label>
              <input
                id="damage-deduction"
                type="number"
                className="form-control"
                placeholder="0"
                min="0"
                max={initialDeposit}
                step="10000"
                value={damageDeduction}
                onChange={(e) => setDamageDeduction(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="utility-deduction" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Drop size={13} style={{ color: "var(--color-primary)" }} />
                <span>Trừ điện nước kỳ cuối (VND)</span>
              </label>
              <input
                id="utility-deduction"
                type="number"
                className="form-control"
                placeholder="0"
                min="0"
                max={initialDeposit}
                step="10000"
                value={utilityDeduction}
                onChange={(e) => setUtilityDeduction(e.target.value)}
              />
            </div>
          </div>

          {/* Real-time deposit refund calculation */}
          <div style={{
            padding: "12px 16px",
            borderRadius: 8,
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Coins size={22} weight="fill" style={{ color: "var(--color-success)" }} />
              <div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-2)", fontWeight: 500 }}>
                  Số tiền cọc thực tế hoàn trả cho khách:
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-fg-3)", marginTop: 1 }}>
                  {money.format(initialDeposit)} - {money.format(totalDeduction)} = {money.format(refundAmount)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-success)", fontFamily: "var(--font-mono)" }}>
              {money.format(refundAmount)}
            </div>
          </div>

          {/* Liquidation notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="liq-notes">Ghi chú thanh lý & biên bản kiểm tra phòng</label>
            <textarea
              id="liq-notes"
              className="form-control"
              rows={3}
              placeholder="VD: Khách trả phòng đúng hạn, kiểm kê đồ đạc đầy đủ, tường xước nhẹ trừ 100k sơn lại, số điện cuối kỳ 234kWh..."
              value={liquidationNotes}
              onChange={(e) => setLiquidationNotes(e.target.value)}
            />
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 6,
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            fontSize: "var(--text-xs)",
            color: "var(--color-warning)",
          }}>
            <Warning size={15} style={{ flexShrink: 0 }} />
            <span>Sau khi thanh lý, hợp đồng sẽ chuyển sang trạng thái <strong>Đã kết thúc</strong> và phòng được giải phóng.</span>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
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
                <><span className="spinner" aria-hidden="true" />Đang xử lý...</>
              ) : (
                <><CheckCircle size={14} weight="bold" />Xác nhận thanh lý & Hoàn cọc</>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
