"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Warning, CheckCircle, X } from "@phosphor-icons/react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Accessible Glassmorphism confirmation dialog replacing blocking browser window.confirm().
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => {
            if (!loading) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.16 }}
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: "var(--color-bg-panel)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg, 12px)",
              boxShadow: "var(--shadow-lg)",
              padding: "20px 24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: variant === "danger" ? "var(--color-danger-bg)" : "var(--color-primary-light)",
                    color: variant === "danger" ? "var(--color-danger)" : "var(--color-primary)",
                    border: `1px solid ${variant === "danger" ? "var(--color-danger-border)" : "var(--color-border)"}`,
                    flexShrink: 0,
                  }}
                >
                  {variant === "danger" ? <Warning size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}
                </span>
                <h3
                  id="confirm-dialog-title"
                  style={{ margin: 0, fontSize: "var(--text-md, 16px)", fontWeight: 700, color: "var(--color-fg)" }}
                >
                  {title}
                </h3>
              </div>

              <button
                type="button"
                className="btn-ghost"
                onClick={onCancel}
                disabled={loading}
                aria-label="Đóng hộp thoại"
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <p
              id="confirm-dialog-desc"
              style={{
                margin: "0 0 20px",
                fontSize: "var(--text-sm, 14px)",
                lineHeight: 1.55,
                color: "var(--color-fg-2)",
              }}
            >
              {message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={onCancel}
                disabled={loading}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={onConfirm}
                disabled={loading}
                style={
                  variant === "danger"
                    ? { backgroundColor: "var(--color-danger)", borderColor: "var(--color-danger)", color: "#ffffff" }
                    : undefined
                }
              >
                {loading ? "Đang xử lý..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
