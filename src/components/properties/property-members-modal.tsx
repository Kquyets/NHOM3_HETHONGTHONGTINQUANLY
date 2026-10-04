"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  UserPlus,
  Trash,
  ShieldCheck,
  EnvelopeSimple,
  Phone,
  UserCircle,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";
import { apiClient } from "../../lib/api-client";
import type { PropertyRow, PropertyMemberRow } from "../../modules/properties/property.service";

export type PropertyMembersModalProps = {
  property: PropertyRow;
  onClose: () => void;
};

export function PropertyMembersModal({ property, onClose }: PropertyMembersModalProps) {
  const [members, setMembers] = useState<PropertyMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingRemoveId, setSubmittingRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient<{ members: PropertyMemberRow[] }>(
        `/api/properties/${property.id}/members`,
      );
      setMembers(res.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách ban quản lý.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [property.id]);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;

    try {
      setSubmittingAdd(true);
      setError(null);
      setSuccess(null);
      await apiClient(`/api/properties/${property.id}/members`, {
        method: "POST",
        body: JSON.stringify({ emailOrPhone: emailOrPhone.trim() }),
      });
      setEmailOrPhone("");
      setSuccess("Đã thêm người quản lý thành công!");
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm người quản lý thất bại.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Bạn có chắc muốn gỡ quyền quản lý của "${memberName}" khỏi nhà trọ này?`)) {
      return;
    }

    try {
      setSubmittingRemoveId(memberId);
      setError(null);
      setSuccess(null);
      await apiClient(`/api/properties/${property.id}/members?memberId=${memberId}`, {
        method: "DELETE",
      });
      setSuccess("Đã gỡ quyền quản lý thành công.");
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gỡ quyền quản lý thất bại.");
    } finally {
      setSubmittingRemoveId(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(5px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <motion.div
        className="card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: "100%",
          maxWidth: 580,
          padding: 24,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={20} weight="fill" />
              </div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0 }}>
                Ban quản lý &amp; Phân quyền
              </h3>
            </div>
            <p className="text-muted" style={{ fontSize: 13, margin: "4px 0 0", paddingLeft: 40 }}>
              Nhà trọ: <strong>{property.name}</strong>
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="alert-error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
            >
              <WarningCircle size={16} weight="fill" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              className="badge ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <CheckCircle size={16} weight="fill" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Manager Form */}
        <form
          onSubmit={handleAddMember}
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label
            htmlFor="member-input"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-fg)", margin: 0 }}
          >
            Thêm người quản lý mới vào nhà trọ
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="member-input"
              type="text"
              className="form-control"
              placeholder="Nhập Email hoặc Số điện thoại tài khoản..."
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              disabled={submittingAdd}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={submittingAdd || !emailOrPhone.trim()}
              style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
            >
              {submittingAdd ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <UserPlus size={15} weight="bold" />
              )}
              {submittingAdd ? "Đang thêm..." : "Thêm quản lý"}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--color-fg-3)", lineHeight: 1.4 }}>
            * Người được thêm phải có tài khoản đã đăng ký trong hệ thống. Người quản lý sẽ có quyền xem
            thông tin phòng, hợp đồng, chỉ số đồng hồ và tiếp nhận yêu cầu bảo trì của nhà trọ này.
          </p>
        </form>

        {/* Members List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-fg-3)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Danh sách người quản lý ({members.length})
          </div>

          {loading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--color-fg-3)", fontSize: 13 }}>
              <span className="spinner" style={{ marginRight: 8 }} />
              Đang tải danh sách...
            </div>
          ) : members.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border)",
              }}
            >
              <UserCircle size={32} style={{ color: "var(--color-fg-3)", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-fg-2)" }}>
                Chưa có người quản lý phụ tá nào
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginTop: 4 }}>
                Hiện tại chỉ có tài khoản Chủ nhà quản lý toàn bộ nhà trọ này.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--color-surface-3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        fontSize: 14,
                      }}
                    >
                      {m.fullName ? m.fullName.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5 }}>
                          {m.fullName || "Quản lý (chưa cập nhật tên)"}
                        </span>
                        <span className="badge" style={{ fontSize: 10, padding: "1px 6px" }}>
                          Quản lý
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: 11.5,
                          color: "var(--color-fg-3)",
                          marginTop: 3,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <EnvelopeSimple size={12} /> {m.email}
                        </span>
                        {m.phone && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={12} /> {m.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "var(--color-danger)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onClick={() => void handleRemoveMember(m.id, m.fullName || m.email)}
                    disabled={submittingRemoveId === m.id}
                    title="Gỡ quyền quản lý"
                  >
                    {submittingRemoveId === m.id ? (
                      <span className="spinner" style={{ width: 12, height: 12 }} />
                    ) : (
                      <Trash size={13} />
                    )}
                    <span>Gỡ</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: "6px 16px" }}>
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}
