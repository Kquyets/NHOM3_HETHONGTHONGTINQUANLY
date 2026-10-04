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
  Printer,
  Users,
  UserPlus,
  UserMinus,
  DownloadSimple,
  WarningCircle,
  Phone,
  IdentificationBadge,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { PrintableContractModal } from "../../components/contracts/printable-contract-modal";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import type { ContractRow, ContractStatus, ContractTenantInfo } from "../../modules/contracts/contract.service";
import type { PropertyRow } from "../../modules/properties/property.service";
import type { RoomRow } from "../../modules/rooms/room.service";
import type { TenantRow } from "../../modules/tenants/tenant.service";

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
    transition: { duration: 0.35, delay: i * 0.04, ease: "easeOut" as const },
  }),
};

const STATUS_CONFIG: Record<ContractStatus, { label: string; cls: string; Icon: React.ElementType }> = {
  draft:     { label: "Nháp",          cls: "badge",              Icon: Clock },
  active:    { label: "Đang hiệu lực", cls: "badge ready",        Icon: CheckCircle },
  ended:     { label: "Đã kết thúc",   cls: "badge maintenance",  Icon: ArrowCounterClockwise },
  cancelled: { label: "Đã hủy",        cls: "badge",              Icon: XCircle },
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

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

/* ── Create Contract Form ────────────────────────────────────────── */
function CreateContractForm({
  submitting,
  properties,
  allTenants,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  properties: PropertyRow[];
  allTenants: TenantRow[];
  onSubmit: (data: {
    roomId: string;
    startDate: string;
    endDate: string;
    monthlyRentSnapshot: string;
    depositSnapshot: string;
    tenantIds: string[];
  }) => void;
  onCancel: () => void;
}) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [propertyRooms, setPropertyRooms] = useState<RoomRow[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [tenantSearch, setTenantSearch] = useState("");

  // Load rooms when property changes
  useEffect(() => {
    if (!selectedPropertyId) return;
    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await apiClient<{ rooms: RoomRow[] }>(`/api/properties/${selectedPropertyId}/rooms`);
        setPropertyRooms(res.rooms);
        if (res.rooms.length > 0) {
          setRoomId(res.rooms[0].id);
          setMonthlyRent(String(res.rooms[0].monthlyRent || ""));
          setDeposit(String(res.rooms[0].monthlyRent || ""));
        } else {
          setRoomId("");
        }
      } catch {
        setPropertyRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    void fetchRooms();
  }, [selectedPropertyId]);

  // When room is manually selected, prefill monthlyRent
  const handleRoomChange = (rId: string) => {
    setRoomId(rId);
    const found = propertyRooms.find((r) => r.id === rId);
    if (found) {
      setMonthlyRent(String(found.monthlyRent));
      if (!deposit) setDeposit(String(found.monthlyRent));
    }
  };

  const handleToggleTenant = (tId: string) => {
    setSelectedTenantIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      roomId,
      startDate,
      endDate,
      monthlyRentSnapshot: monthlyRent,
      depositSnapshot: deposit,
      tenantIds: selectedTenantIds,
    });
  };

  const filteredTenants = allTenants.filter(
    (t) =>
      t.fullName.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      (t.phone && t.phone.includes(tenantSearch))
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {/* Select Property */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-prop">Nhà trọ / Tòa nhà *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <Buildings size={15} />
            </span>
            <select
              id="c-prop"
              className="form-control"
              style={{ paddingLeft: 34 }}
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Select Room */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-room">Phòng thuê *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <Door size={15} />
            </span>
            <select
              id="c-room"
              className="form-control"
              style={{ paddingLeft: 34 }}
              value={roomId}
              onChange={(e) => handleRoomChange(e.target.value)}
              disabled={loadingRooms || propertyRooms.length === 0}
              required
            >
              {propertyRooms.length === 0 ? (
                <option value="">(Không có phòng nào trong nhà trọ này)</option>
              ) : (
                propertyRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Phòng {r.roomNumber} — {money.format(r.monthlyRent)}/tháng ({r.status === "ready" ? "Sẵn sàng" : "Bảo trì"})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-start">Ngày bắt đầu *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CalendarBlank size={15} />
            </span>
            <input
              id="c-start"
              type="date"
              className="form-control"
              style={{ paddingLeft: 34 }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* End Date */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-end">Ngày kết thúc (tùy chọn)</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CalendarBlank size={15} />
            </span>
            <input
              id="c-end"
              type="date"
              className="form-control"
              style={{ paddingLeft: 34 }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Monthly Rent */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-rent">Tiền thuê / tháng (VND) *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CurrencyDollar size={15} />
            </span>
            <input
              id="c-rent"
              type="number"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: 3000000"
              min="0"
              step="50000"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Deposit */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label htmlFor="c-deposit">Tiền đặt cọc (VND) *</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
              <CurrencyDollar size={15} />
            </span>
            <input
              id="c-deposit"
              type="number"
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="VD: 3000000"
              min="0"
              step="50000"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      {/* Select Tenants for the contract */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg)", margin: 0, textTransform: "uppercase" }}>
            Khách thuê phòng ({selectedTenantIds.length} người được chọn)
          </label>
          <input
            type="search"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
            className="form-control"
            style={{ width: 220, height: 32, fontSize: 12 }}
          />
        </div>

        {allTenants.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-fg-3)", padding: "10px 0" }}>
            Chưa có hồ sơ khách thuê nào trong danh bạ. Bạn vẫn có thể tạo hợp đồng trước và gán khách sau.
          </div>
        ) : (
          <div
            style={{
              maxHeight: 160,
              overflowY: "auto",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: 8,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 8,
            }}
          >
            {filteredTenants.map((t) => {
              const isSelected = selectedTenantIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTenant(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    background: isSelected ? "var(--color-primary-light)" : "var(--color-surface-2)",
                    border: isSelected ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                    cursor: "pointer",
                    fontSize: 12.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {t.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>
                      {t.phone || "Chưa có SĐT"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Hủy
        </button>
        <motion.button
          type="submit"
          className="btn-primary"
          disabled={submitting || !roomId || !startDate}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          {submitting ? "Đang lưu..." : "Lập hợp đồng"}
        </motion.button>
      </div>
    </form>
  );
}

/* ── Manage Occupants Modal ──────────────────────────────────────── */
function ManageOccupantsModal({
  contract,
  allTenants,
  onClose,
  onRefresh,
}: {
  contract: ContractRow;
  allTenants: TenantRow[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [submittingRemoveId, setSubmittingRemoveId] = useState<string | null>(null);

  const assignedTenantIds = contract.tenants?.map((t) => t.id) || [];
  const availableTenants = allTenants.filter((t) => !assignedTenantIds.includes(t.id));

  const handleAddTenant = async () => {
    if (!selectedTenantId) return;
    try {
      setSubmittingAdd(true);
      await apiClient(`/api/contracts/${contract.id}/tenants`, {
        method: "POST",
        body: JSON.stringify({ tenantId: selectedTenantId }),
      });
      setSelectedTenantId("");
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Thêm người thuê thất bại.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRemoveTenant = async (tenantId: string, tenantName: string) => {
    if (!window.confirm(`Xác nhận xóa khách thuê "${tenantName}" khỏi hợp đồng phòng này?`)) return;
    try {
      setSubmittingRemoveId(tenantId);
      await apiClient(`/api/contracts/${contract.id}/tenants?tenantId=${tenantId}`, {
        method: "DELETE",
      });
      await onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa người thuê thất bại.");
    } finally {
      setSubmittingRemoveId(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
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
        style={{ width: "100%", maxWidth: 540, padding: 24 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0 }}>
              Quản lý người ở — Phòng {contract.roomNumber}
            </h3>
            <p className="text-muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              {contract.propertyName} • Hợp đồng {contract.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Existing Occupants List */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-fg-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Danh sách người đang thuê ({contract.tenants?.length || 0})
          </div>

          {contract.tenants && contract.tenants.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {contract.tenants.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {t.fullName} {idx === 0 && <span className="badge ready" style={{ fontSize: 10, marginLeft: 6 }}>Người đứng tên chính</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--color-fg-3)" }}>
                      {t.phone} {t.citizenId && `• CCCD: ${t.citizenId}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ color: "var(--color-danger, #ef4444)", padding: "4px 8px", fontSize: 12 }}
                    onClick={() => handleRemoveTenant(t.id, t.fullName)}
                    disabled={submittingRemoveId === t.id}
                  >
                    <UserMinus size={14} /> Xóa
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--color-fg-3)", fontStyle: "italic", padding: "8px 0" }}>
              Hợp đồng này chưa có khách thuê nào được gán.
            </div>
          )}
        </div>

        {/* Add Occupant Control */}
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-fg-3)", textTransform: "uppercase", marginBottom: 8 }}>
            Thêm người thuê vào phòng
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="form-control"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">-- Chọn khách thuê từ danh bạ --</option>
              {availableTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} ({t.phone})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              onClick={handleAddTenant}
              disabled={submittingAdd || !selectedTenantId}
              style={{ whiteSpace: "nowrap" }}
            >
              <UserPlus size={15} /> Thêm vào phòng
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Xong
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main Page Component ─────────────────────────────────────────── */
export default function ContractsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [allTenants, setAllTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContractStatus | "all">("all");

  const [showAdd, setShowAdd] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Printable contract modal state
  const [printContract, setPrintContract] = useState<ContractRow | null>(null);

  // Manage occupants modal state
  const [managingOccupantsContract, setManagingOccupantsContract] = useState<ContractRow | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractsRes, propsRes, tenantsRes] = await Promise.all([
        apiClient<{ contracts: ContractRow[] }>("/api/contracts"),
        apiClient<{ properties: PropertyRow[] }>("/api/properties"),
        apiClient<{ tenants: TenantRow[] }>("/api/tenants"),
      ]);
      setContracts(contractsRes.contracts);
      setProperties(propsRes.properties);
      setAllTenants(tenantsRes.tenants);
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
    void loadInitialData();
  }, [user, authLoading, router, loadInitialData]);

  const handleCreate = async (data: {
    roomId: string;
    startDate: string;
    endDate: string;
    monthlyRentSnapshot: string;
    depositSnapshot: string;
    tenantIds: string[];
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
          tenantIds: data.tenantIds,
        }),
      });
      setShowAdd(false);
      await loadInitialData();
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
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái.");
    }
  };

  const handleDelete = async (contract: ContractRow) => {
    if (!window.confirm(`Xóa hợp đồng Phòng ${contract.roomNumber} (${contract.propertyName})?`)) return;
    try {
      await apiClient(`/api/contracts/${contract.id}`, { method: "DELETE" });
      await loadInitialData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa hợp đồng.");
    }
  };

  const exportCSV = () => {
    if (contracts.length === 0) return;
    const headers = ["Mã HĐ", "Phòng", "Tòa nhà", "Khách thuê chính", "Số điện thoại", "Ngày bắt đầu", "Ngày kết thúc", "Tiền thuê (VND)", "Tiền cọc (VND)", "Trạng thái"];
    const rows = filtered.map((c) => [
      c.id,
      `P${c.roomNumber}`,
      `"${c.propertyName.replace(/"/g, '""')}"`,
      `"${(c.tenants?.[0]?.fullName || "").replace(/"/g, '""')}"`,
      c.tenants?.[0]?.phone || "",
      c.startDate,
      c.endDate || "",
      c.monthlyRentSnapshot,
      c.depositSnapshot,
      STATUS_CONFIG[c.status].label,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Danh_sach_hop_dong_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = contracts.filter((c) => {
    const matchesFilter = filterStatus === "all" || c.status === filterStatus;
    const tenantText = c.tenants?.map((t) => `${t.fullName} ${t.phone}`).join(" ") || "";
    const matchesSearch =
      c.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.propertyName.toLowerCase().includes(search.toLowerCase()) ||
      tenantText.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusCounts = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="main-container">
        {/* Header */}
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Hợp đồng thuê phòng</h1>
            <p className="page-desc">
              Quản lý hợp đồng thuê, bàn giao phòng và liên kết khách cư dân vào hệ thống.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {contracts.length > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={exportCSV}
                title="Tải bảng hợp đồng dạng file CSV"
              >
                <DownloadSimple size={15} />
                <span>Xuất CSV</span>
              </button>
            )}
            <motion.button
              type="button"
              className="btn-primary"
              onClick={() => setShowAdd((v) => !v)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Plus size={14} weight="bold" />
              <span>Lập hợp đồng mới</span>
            </motion.button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error" role="alert" style={{ marginBottom: "var(--space-2)" }}>
            {error}
          </div>
        )}

        {/* Create Panel */}
        <AnimatePresence>
          {showAdd && (
            <SlidePanel title="Lập hợp đồng thuê phòng mới" onClose={() => setShowAdd(false)}>
              <CreateContractForm
                submitting={submittingAdd}
                properties={properties}
                allTenants={allTenants}
                onSubmit={(data) => void handleCreate(data)}
                onCancel={() => setShowAdd(false)}
              />
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Filters */}
        {contracts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-2)" }}
          >
            {(["all", "draft", "active", "ended", "cancelled"] as const).map((s) => {
              const count = s === "all" ? contracts.length : (statusCounts[s] ?? 0);
              const isActive = filterStatus === s;
              return (
                <button
                  key={s}
                  type="button"
                  className={isActive ? "btn-primary" : "btn-ghost"}
                  style={{ padding: "5px 14px", fontSize: "var(--text-sm)" }}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all" ? "Tất cả" : STATUS_CONFIG[s].label} ({count})
                </button>
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
              style={{ paddingLeft: 34, maxWidth: 380 }}
              placeholder="Tìm theo phòng, nhà trọ, tên hoặc SĐT khách..."
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
              <p className="text-muted" style={{ margin: "0 0 14px" }}>Chưa có hợp đồng nào. Tạo hợp đồng để bắt đầu bàn giao phòng cho khách.</p>
              <button type="button" className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={14} weight="bold" /> Lập hợp đồng ngay
              </button>
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon"><MagnifyingGlass size={24} /></div>
              <p className="text-muted" style={{ margin: 0 }}>Không tìm thấy hợp đồng phù hợp với từ khóa.</p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Phòng / Nhà trọ</th>
                    <th>Khách thuê phòng</th>
                    <th>Thời hạn thuê</th>
                    <th>Tiền thuê / tháng</th>
                    <th>Tiền đặt cọc</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contract, i) => {
                    const cfg = STATUS_CONFIG[contract.status];
                    const primaryTenant = contract.tenants?.[0];
                    const roommateCount = (contract.tenants?.length || 1) - 1;

                    return (
                      <motion.tr key={contract.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                        {/* Room & Property */}
                        <td style={{ fontWeight: 600 }}>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Door size={13} style={{ color: "var(--color-primary)" }} />
                              Phòng {contract.roomNumber}
                            </span>
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                              <Buildings size={11} />
                              {contract.propertyName}
                            </span>
                          </span>
                        </td>

                        {/* Tenants Column */}
                        <td>
                          {primaryTenant ? (
                            <div>
                              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                                <span>{primaryTenant.fullName}</span>
                                {roommateCount > 0 && (
                                  <span className="badge" style={{ fontSize: 10, padding: "1px 5px" }}>
                                    +{roommateCount} người
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Phone size={12} /> {primaryTenant.phone}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setManagingOccupantsContract(contract)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                color: "var(--color-warning)",
                                background: "var(--color-warning-bg)",
                                border: "1px solid var(--color-warning-border)",
                                padding: "2px 8px",
                                borderRadius: "var(--radius-full)",
                                cursor: "pointer",
                              }}
                            >
                              <WarningCircle size={12} /> Chưa gán khách thuê
                            </button>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="text-muted" style={{ fontSize: "var(--text-xs)" }}>
                          <div>Bắt đầu: {formatDate(contract.startDate)}</div>
                          <div>Kết thúc: {formatDate(contract.endDate)}</div>
                        </td>

                        {/* Rent */}
                        <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                          {money.format(contract.monthlyRentSnapshot)}
                        </td>

                        {/* Deposit */}
                        <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                          {money.format(contract.depositSnapshot)}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <cfg.Icon size={10} weight="fill" />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {/* Print Contract Button */}
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                              onClick={() => setPrintContract(contract)}
                              title="Xem và in hợp đồng mẫu chuẩn A4"
                            >
                              <Printer size={13} /> In HĐ
                            </button>

                            {/* Manage Occupants Button */}
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                              onClick={() => setManagingOccupantsContract(contract)}
                              title="Quản lý khách thuê và người ở cùng"
                            >
                              <Users size={13} /> Người ở
                            </button>

                            {contract.status === "draft" && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", color: "var(--color-success)" }}
                                onClick={() => void handleUpdateStatus(contract, "active")}
                              >
                                <CheckCircle size={13} /> Kích hoạt
                              </button>
                            )}

                            {contract.status === "active" && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                                onClick={() => void handleUpdateStatus(contract, "ended")}
                              >
                                <ArrowCounterClockwise size={13} /> Kết thúc
                              </button>
                            )}

                            {(contract.status === "draft" || contract.status === "cancelled") && user?.role === "owner" && (
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", color: "var(--color-danger)" }}
                                onClick={() => void handleDelete(contract)}
                              >
                                <Trash size={13} /> Xóa
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
          </div>
        )}
      </main>

      {/* Printable Contract Modal */}
      {printContract && (
        <PrintableContractModal
          contract={printContract}
          onClose={() => setPrintContract(null)}
        />
      )}

      {/* Manage Occupants Modal */}
      {managingOccupantsContract && (
        <ManageOccupantsModal
          contract={managingOccupantsContract}
          allTenants={allTenants}
          onClose={() => setManagingOccupantsContract(null)}
          onRefresh={loadInitialData}
        />
      )}
    </div>
  );
}
