"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Wrench,
  Plus,
  X,
  CheckCircle,
  Clock,
  WarningCircle,
  Lightning,
  Drop,
  WifiHigh,
  Door,
  Buildings,
  ArrowsClockwise,
  Check,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRow,
  MaintenanceStatus,
} from "../../modules/maintenance/maintenance.service";
import type { PropertyRow } from "../../modules/properties/property.service";
import type { RoomRow } from "../../modules/rooms/room.service";

const CATEGORY_CONFIG: Record<MaintenanceCategory, { label: string; Icon: React.ElementType; color: string }> = {
  electrical: { label: "Điện sinh hoạt", Icon: Lightning,   color: "#eab308" },
  plumbing:   { label: "Nước & Vệ sinh", Icon: Drop,        color: "#06b6d4" },
  appliance:  { label: "Thiết bị điện tử",Icon: Wrench,     color: "#f97316" },
  internet:   { label: "Mạng WiFi",      Icon: WifiHigh,    color: "#8b5cf6" },
  structural: { label: "Cửa, tường, nhà",Icon: Door,        color: "#64748b" },
  other:      { label: "Khác",           Icon: Wrench,      color: "#94a3b8" },
};

const PRIORITY_CONFIG: Record<MaintenancePriority, { label: string; badgeCls: string }> = {
  urgent: { label: "Khẩn cấp",  badgeCls: "badge" },
  high:   { label: "Ưu tiên cao",badgeCls: "badge maintenance" },
  medium: { label: "Trung bình", badgeCls: "badge" },
  low:    { label: "Thấp",       badgeCls: "badge" },
};

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  pending:     { label: "Chờ tiếp nhận", cls: "badge maintenance", Icon: Clock },
  in_progress: { label: "Đang xử lý",    cls: "badge",             Icon: ArrowsClockwise },
  resolved:    { label: "Đã giải quyết", cls: "badge ready",       Icon: CheckCircle },
  cancelled:   { label: "Đã hủy",        cls: "badge",             Icon: WarningCircle },
};

export default function MaintenancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<MaintenanceRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | MaintenanceStatus>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create request state
  const [showCreate, setShowCreate] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [cPropertyId, setCPropertyId] = useState("");
  const [cRoomId, setCRoomId] = useState("");
  const [cTitle, setCTitle] = useState("");
  const [cCategory, setCCategory] = useState<MaintenanceCategory>("plumbing");
  const [cPriority, setCPriority] = useState<MaintenancePriority>("medium");
  const [cDescription, setCDescription] = useState("");

  // Resolve modal state
  const [resolvingRequest, setResolvingRequest] = useState<MaintenanceRow | null>(null);
  const [resNotes, setResNotes] = useState("");
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        selectedPropertyId !== "all"
          ? `/api/maintenance?propertyId=${selectedPropertyId}`
          : "/api/maintenance";
      const res = await apiClient<{ requests: MaintenanceRow[] }>(url);
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách sự cố.");
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  const loadProperties = useCallback(async () => {
    try {
      const res = await apiClient<{ properties: PropertyRow[] }>("/api/properties");
      setProperties(res.properties);
    } catch {
      // ignore
    }
  }, []);

  const loadRoomsForProperty = useCallback(async (propertyId: string) => {
    if (!propertyId) {
      setRooms([]);
      return;
    }
    try {
      const res = await apiClient<{ rooms: RoomRow[] }>(`/api/properties/${propertyId}/rooms`);
      setRooms(res.rooms);
    } catch {
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadProperties();
    void loadRequests();
  }, [user, authLoading, router, loadProperties, loadRequests]);

  const handleCreateRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!cRoomId) return;

    try {
      setSubmittingCreate(true);
      await apiClient("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          roomId: cRoomId,
          title: cTitle.trim(),
          category: cCategory,
          priority: cPriority,
          description: cDescription.trim(),
        }),
      });

      setShowCreate(false);
      setCTitle("");
      setCDescription("");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo yêu cầu sửa chữa thất bại.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: MaintenanceStatus, notes?: string) => {
    try {
      await apiClient(`/api/maintenance/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          resolutionNotes: notes ?? null,
        }),
      });
      await loadRequests();
      setResolvingRequest(null);
      setResNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái sự cố thất bại.");
    }
  };

  const filteredRequests = requests.filter((r) => {
    return filterStatus === "all" || r.status === filterStatus;
  });

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {/* Page Title Row */}
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Quản lý Sự cố &amp; Sửa chữa</h1>
            <p className="page-desc">Theo dõi báo hỏng hóc, sửa chữa điện nước, thiết bị từ khách thuê.</p>
          </div>
          <button
            type="button"
            className={showCreate ? "btn-secondary" : "btn-primary"}
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? <X size={14} /> : <Plus size={14} weight="bold" />}
            {showCreate ? "Đóng" : "Báo sự cố mới"}
          </button>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div className="alert-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: "var(--space-2)" }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Issue Panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              className="panel"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>Tạo phiếu yêu cầu sửa chữa</h2>
                <button type="button" className="btn-ghost" style={{ padding: "5px 10px" }} onClick={() => setShowCreate(false)}>
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateRequest}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="mnt-prop">Nhà trọ *</label>
                    <select
                      id="mnt-prop"
                      className="form-control"
                      value={cPropertyId}
                      onChange={(e) => {
                        setCPropertyId(e.target.value);
                        void loadRoomsForProperty(e.target.value);
                      }}
                      required
                    >
                      <option value="">-- Chọn nhà trọ --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="mnt-room">Phòng xảy ra sự cố *</label>
                    <select
                      id="mnt-room"
                      className="form-control"
                      value={cRoomId}
                      onChange={(e) => setCRoomId(e.target.value)}
                      required
                      disabled={!cPropertyId}
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="mnt-title">Tiêu đề sự cố *</label>
                    <input
                      id="mnt-title"
                      type="text"
                      className="form-control"
                      placeholder="VD: Rò rỉ vòi sen, Hỏng aptomat..."
                      value={cTitle}
                      onChange={(e) => setCTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="mnt-cat">Phân loại</label>
                    <select
                      id="mnt-cat"
                      className="form-control"
                      value={cCategory}
                      onChange={(e) => setCCategory(e.target.value as MaintenanceCategory)}
                    >
                      <option value="plumbing">Nước &amp; Vệ sinh</option>
                      <option value="electrical">Điện sinh hoạt</option>
                      <option value="appliance">Thiết bị gia dụng</option>
                      <option value="internet">Mạng WiFi</option>
                      <option value="structural">Cửa / Tường / Nhà</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="mnt-prio">Mức ưu tiên</label>
                    <select
                      id="mnt-prio"
                      className="form-control"
                      value={cPriority}
                      onChange={(e) => setCPriority(e.target.value as MaintenancePriority)}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Ưu tiên cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "var(--space-2)" }}>
                  <label htmlFor="mnt-desc">Mô tả chi tiết sự cố *</label>
                  <textarea
                    id="mnt-desc"
                    className="form-control"
                    rows={3}
                    placeholder="Mô tả cụ thể vị trí, hiện tượng hỏng hóc..."
                    value={cDescription}
                    onChange={(e) => setCDescription(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Hủy</button>
                  <button type="submit" className="btn-primary" disabled={submittingCreate}>
                    {submittingCreate ? "Đang gửi..." : "Tạo yêu cầu"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          {properties.length > 0 && (
            <select
              className="form-control"
              style={{ width: "auto", minWidth: 180 }}
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
            >
              <option value="all">Tất cả nhà trọ</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["all", "pending", "in_progress", "resolved", "cancelled"] as const).map((s) => (
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

        {/* Requests Table */}
        {loading ? (
          <div className="card" style={{ padding: "var(--space-3)" }}>
            <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 40 }} />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><Wrench size={28} /></div>
              <p className="text-muted" style={{ margin: 0 }}>Không có sự cố nào cần xử lý.</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sự cố</th>
                    <th>Phòng / Nhà</th>
                    <th>Người báo</th>
                    <th>Mức độ</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const cat = CATEGORY_CONFIG[req.category];
                    const prio = PRIORITY_CONFIG[req.priority];
                    const st = STATUS_CONFIG[req.status];

                    return (
                      <tr key={req.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ color: cat.color, marginTop: 2 }}>
                              <cat.Icon size={16} weight="fill" />
                            </div>
                            <div>
                              <strong style={{ fontSize: "var(--text-sm)" }}>{req.title}</strong>
                              <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {req.description}
                              </p>
                              {req.resolutionNotes && (
                                <p style={{ margin: "3px 0 0", fontSize: "11px", color: "var(--color-success)" }}>
                                  ✓ Xử lý: {req.resolutionNotes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong>Phòng {req.roomNumber}</strong>
                            <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>{req.propertyName}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", fontSize: "var(--text-xs)" }}>
                            <span>{req.tenantName || "Chủ trọ tạo"}</span>
                            {req.tenantPhone && <span className="text-muted">{req.tenantPhone}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={prio.badgeCls} style={{ fontSize: "11px" }}>{prio.label}</span>
                        </td>
                        <td>
                          <span className={st.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px" }}>
                            <st.Icon size={11} weight="fill" />
                            {st.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            {req.status === "pending" && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                                onClick={() => void handleUpdateStatus(req.id, "in_progress")}
                              >
                                Tiếp nhận
                              </button>
                            )}

                            {(req.status === "pending" || req.status === "in_progress") && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => {
                                  setResolvingRequest(req);
                                  setResNotes("");
                                }}
                              >
                                <Check size={12} weight="bold" /> Xong
                              </button>
                            )}

                            {req.status !== "cancelled" && req.status !== "resolved" && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 6px", fontSize: "var(--text-xs)", color: "var(--color-danger)" }}
                                onClick={() => void handleUpdateStatus(req.id, "cancelled")}
                                title="Hủy bỏ sự cố"
                              >
                                Hủy
                              </button>
                            )}
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

        {/* Resolve Modal */}
        <AnimatePresence>
          {resolvingRequest && (
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
              onClick={() => setResolvingRequest(null)}
            >
              <motion.div
                className="card"
                style={{ maxWidth: 460, width: "100%" }}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: 6 }}>
                  Xác nhận hoàn thành xử lý sự cố
                </h2>
                <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2)" }}>
                  Sự cố: <strong>{resolvingRequest.title}</strong> (Phòng {resolvingRequest.roomNumber})
                </p>

                <div className="form-group" style={{ marginBottom: "var(--space-2)" }}>
                  <label htmlFor="res-note">Ghi chú giải quyết (sẽ hiển thị cho khách thuê)</label>
                  <textarea
                    id="res-note"
                    className="form-control"
                    rows={3}
                    placeholder="VD: Đã thay phao bồn nước mới, đã kiểm tra hoạt động ổn định..."
                    value={resNotes}
                    onChange={(e) => setResNotes(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" className="btn-ghost" onClick={() => setResolvingRequest(null)}>
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={submittingResolve}
                    onClick={async () => {
                      setSubmittingResolve(true);
                      await handleUpdateStatus(resolvingRequest.id, "resolved", resNotes);
                      setSubmittingResolve(false);
                    }}
                  >
                    {submittingResolve ? "Đang lưu..." : "Xác nhận đã sửa xong"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
