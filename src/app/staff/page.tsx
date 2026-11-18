"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Plus,
  X,
  Trash,
  Buildings,
  Phone,
  EnvelopeSimple,
  ShieldCheck,
  CheckCircle,
  MagnifyingGlass,
  UserPlus,
  Sparkle,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { useAuth } from "../../lib/auth-context";
import { apiClient } from "../../lib/api-client";

type PropertyAssignment = {
  memberId: string;
  propertyId: string;
  propertyName: string;
  status: string;
  createdAt: string;
};

type StaffMember = {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  assignments: PropertyAssignment[];
};

type PropertyOption = {
  id: string;
  name: string;
};

export default function StaffPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Assign property to existing staff state
  const [assigningStaff, setAssigningStaff] = useState<StaffMember | null>(null);
  const [addPropertyId, setAddPropertyId] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [staffRes, propRes] = await Promise.all([
        apiClient<{ staff: StaffMember[] }>("/api/staff"),
        apiClient<{ properties: PropertyOption[] }>("/api/properties"),
      ]);

      setStaffList(staffRes.staff || []);
      setProperties(propRes.properties || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách nhân viên";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "owner") {
      router.replace("/");
      return;
    }
    void loadData();
  }, [user, authLoading, router, loadData]);

  const handleAddStaff = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || selectedPropertyIds.length === 0) {
      setError("Vui lòng nhập email/SĐT và chọn ít nhất một nhà trọ phân công.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim(),
          propertyIds: selectedPropertyIds,
        }),
      });

      setSuccessMsg("Đã phân quyền nhân viên thành công!");
      setShowAddModal(false);
      setEmailOrPhone("");
      setSelectedPropertyIds([]);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi phân quyền nhân viên.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAssignment = async (e: FormEvent) => {
    e.preventDefault();
    if (!assigningStaff || !addPropertyId) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiClient("/api/staff", {
        method: "POST",
        body: JSON.stringify({
          emailOrPhone: assigningStaff.email,
          propertyIds: [addPropertyId],
        }),
      });

      setSuccessMsg(`Đã phân công cơ sở cho ${assigningStaff.fullName || assigningStaff.email}!`);
      setAssigningStaff(null);
      setAddPropertyId("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi phân công cơ sở.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (propertyId: string, memberId: string, propName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi quyền quản lý nhà trọ "${propName}" của nhân viên này?`)) {
      return;
    }

    try {
      setError(null);
      await apiClient(`/api/staff?propertyId=${encodeURIComponent(propertyId)}&memberId=${encodeURIComponent(memberId)}`, {
        method: "DELETE",
      });

      setSuccessMsg(`Đã thu hồi quyền quản lý tại "${propName}".`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi thu hồi quyền.";
      setError(msg);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = s.fullName?.toLowerCase().includes(q);
    const matchEmail = s.email.toLowerCase().includes(q);
    const matchPhone = s.phone?.toLowerCase().includes(q);
    const matchProp = s.assignments.some((a) => a.propertyName.toLowerCase().includes(q));
    return matchName || matchEmail || matchPhone || matchProp;
  });

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
            <h1 className="page-title">Quản lý Nhân viên</h1>
            <p className="page-desc">
              Phân quyền ban quản lý, giao phụ trách các cơ sở nhà trọ và giám sát nhân sự vận hành.
            </p>
          </div>

          <motion.button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowAddModal(true);
              setError(null);
              setSuccessMsg(null);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <UserPlus size={16} weight="bold" />
            <span>Thêm nhân viên</span>
          </motion.button>
        </motion.div>

        {/* Notifications */}
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
          {successMsg && (
            <motion.div
              style={{
                padding: "10px 16px",
                borderRadius: "var(--radius-md, 8px)",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: "#059669",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "var(--space-3)",
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <CheckCircle size={18} weight="fill" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Bar: KPI summary & Search */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="badge ready" style={{ fontSize: "12px", padding: "4px 10px" }}>
              👥 Tổng nhân viên: <strong>{staffList.length}</strong>
            </span>
            <span className="badge neutral" style={{ fontSize: "12px", padding: "4px 10px" }}>
              🏢 Tổng lượt phân công:{" "}
              <strong>{staffList.reduce((acc, s) => acc + s.assignments.length, 0)}</strong>
            </span>
          </div>

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
              placeholder="Tìm theo tên, email, sđt, cơ sở..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card skeleton" style={{ height: 180, borderRadius: 12 }} />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "40px 20px",
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
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: "var(--text-base)", fontWeight: 600, margin: 0 }}>
              {searchQuery ? "Không tìm thấy nhân viên phù hợp" : "Chưa có nhân viên nào trong ban quản lý"}
            </h3>
            <p className="text-muted text-sm" style={{ maxWidth: 440, margin: 0 }}>
              {searchQuery
                ? "Hãy thử tìm kiếm với từ khóa khác như email, số điện thoại hoặc tên nhà trọ."
                : "Thêm nhân viên hoặc quản lý viên bằng email/SĐT để chia sẻ công việc ghi điện nước, lập hóa đơn và quản lý cơ sở."}
            </p>
            {!searchQuery && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
                style={{ marginTop: 8 }}
              >
                <Plus size={14} weight="bold" />
                <span>Thêm nhân viên ngay</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {filteredStaff.map((staff) => {
              const assignedPropIds = new Set(staff.assignments.map((a) => a.propertyId));
              const availableProperties = properties.filter((p) => !assignedPropIds.has(p.id));

              return (
                <motion.div
                  key={staff.userId}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                  }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                >
                  <div>
                    {/* Top: Avatar & Name */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
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
                          fontWeight: 700,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : staff.email.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>
                            {staff.fullName || "Chưa đặt tên"}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: "rgba(59, 130, 246, 0.12)",
                              color: "var(--color-primary)",
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            Quản lý viên
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--color-fg-3)",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 4,
                          }}
                        >
                          <EnvelopeSimple size={13} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {staff.email}
                          </span>
                        </div>

                        {staff.phone && (
                          <div
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--color-fg-3)",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              marginTop: 2,
                            }}
                          >
                            <Phone size={13} />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Properties */}
                    <div style={{ marginTop: 12, borderTop: "1px dashed var(--color-border)", paddingTop: 10 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-fg-3)",
                          textTransform: "uppercase",
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Buildings size={13} />
                        <span>Cơ sở phụ trách ({staff.assignments.length}):</span>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {staff.assignments.map((a) => (
                          <span
                            key={a.memberId}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 8px",
                              borderRadius: 6,
                              backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.03))",
                              border: "1px solid var(--color-border)",
                              fontSize: "var(--text-xs)",
                              fontWeight: 500,
                            }}
                          >
                            <span>🏠 {a.propertyName}</span>
                            <button
                              type="button"
                              onClick={() => void handleRemoveAssignment(a.propertyId, a.memberId, a.propertyName)}
                              title="Thu hồi quyền quản lý tại cơ sở này"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: "var(--color-danger, #ef4444)",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <X size={12} weight="bold" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: "1px solid var(--color-border-soft, rgba(0,0,0,0.06))",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    {availableProperties.length > 0 ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "var(--text-xs)", gap: 4 }}
                        onClick={() => {
                          setAssigningStaff(staff);
                          setAddPropertyId(availableProperties[0]?.id || "");
                        }}
                      >
                        <Plus size={12} weight="bold" />
                        <span>Phân công thêm cơ sở</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--color-fg-3)", fontStyle: "italic" }}>
                        Đã quản lý tất cả cơ sở
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal: Add New Staff Member */}
        <AnimatePresence>
          {showAddModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddModal(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.45)",
                  backdropFilter: "blur(4px)",
                  zIndex: 9998,
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "90%",
                  maxWidth: 480,
                  backgroundColor: "var(--color-bg-panel, #ffffff)",
                  borderRadius: 14,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck size={20} color="var(--color-primary)" weight="fill" />
                    Thêm nhân viên vào Ban quản lý
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-fg-3)" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddStaff} style={{ padding: "20px" }}>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label htmlFor="staff-account" style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                      Email hoặc Số điện thoại tài khoản nhân viên *
                    </label>
                    <input
                      id="staff-account"
                      type="text"
                      className="form-control"
                      placeholder="VD: nhanvien@example.com hoặc 0912345678"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                      Lưu ý: Nhân viên cần đã tạo tài khoản trên hệ thống HManagers trước khi được phân quyền.
                    </p>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontWeight: 600, fontSize: "var(--text-sm)", display: "block", marginBottom: 8 }}>
                      Chọn nhà trọ phân công quản lý *
                    </label>
                    {properties.length === 0 ? (
                      <p className="text-muted text-sm">Chưa có nhà trọ nào để phân công.</p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          maxHeight: 180,
                          overflowY: "auto",
                          padding: 8,
                          borderRadius: 8,
                          border: "1px solid var(--color-border)",
                          backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                        }}
                      >
                        {properties.map((p) => {
                          const isChecked = selectedPropertyIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: "var(--text-sm)",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPropertyIds([...selectedPropertyIds, p.id]);
                                  } else {
                                    setSelectedPropertyIds(selectedPropertyIds.filter((id) => id !== p.id));
                                  }
                                }}
                              />
                              <span>🏠 {p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowAddModal(false)}
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !emailOrPhone.trim() || selectedPropertyIds.length === 0}
                    >
                      {submitting ? "Đang phân quyền..." : "Xác nhận phân quyền"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Modal: Quick Assign Property to Existing Staff */}
        <AnimatePresence>
          {assigningStaff && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAssigningStaff(null)}
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.45)",
                  backdropFilter: "blur(4px)",
                  zIndex: 9998,
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "90%",
                  maxWidth: 420,
                  backgroundColor: "var(--color-bg-panel, #ffffff)",
                  borderRadius: 14,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                  border: "1px solid var(--color-border)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                    Phân công cơ sở mới
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAssigningStaff(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-fg-3)" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddAssignment} style={{ padding: "20px" }}>
                  <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
                    Giao thêm quyền quản lý nhà trọ cho nhân viên{" "}
                    <strong>{assigningStaff.fullName || assigningStaff.email}</strong>:
                  </p>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label htmlFor="assign-prop" style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                      Chọn nhà trọ phân công *
                    </label>
                    <select
                      id="assign-prop"
                      className="form-control"
                      value={addPropertyId}
                      onChange={(e) => setAddPropertyId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn nhà trọ --</option>
                      {properties
                        .filter((p) => !assigningStaff.assignments.some((a) => a.propertyId === p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            🏠 {p.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setAssigningStaff(null)}
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submitting || !addPropertyId}
                    >
                      {submitting ? "Đang lưu..." : "Phân công"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
