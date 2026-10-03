"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Buildings,
  Door,
  MapPin,
  Plus,
  X,
  CheckCircle,
  Wrench,
  Trash,
  PencilSimple,
  CreditCard,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { VIETNAMESE_BANKS } from "../../utils/vietqr";
import type { PropertyRow } from "../../modules/properties/property.service";
import type { RoomRow } from "../../modules/rooms/room.service";

type PropertyWithRooms = PropertyRow & {
  rooms: RoomRow[];
};

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
    transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" as const },
  }),
};

/* ── Form Panel component ───────────────────────────────────────── */
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
        <motion.button
          type="button"
          className="btn-ghost"
          style={{ padding: "5px 10px" }}
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Đóng"
        >
          <X size={14} />
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

export default function PropertiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyWithRooms[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddProp, setShowAddProp] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [propBankCode, setPropBankCode] = useState("");
  const [propBankAccount, setPropBankAccount] = useState("");
  const [propAccountHolder, setPropAccountHolder] = useState("");
  const [submittingProp, setSubmittingProp] = useState(false);

  // Bank edit state
  const [editingBankProp, setEditingBankProp] = useState<PropertyRow | null>(null);
  const [editBankCode, setEditBankCode] = useState("");
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editAccountHolder, setEditAccountHolder] = useState("");
  const [submittingBank, setSubmittingBank] = useState(false);

  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomRent, setRoomRent] = useState("");
  const [roomArea, setRoomArea] = useState("");
  const [submittingRoom, setSubmittingRoom] = useState(false);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const propRes = await apiClient<{ properties: PropertyRow[] }>("/api/properties");
      const withRooms: PropertyWithRooms[] = await Promise.all(
        propRes.properties.map(async (prop) => {
          try {
            const roomRes = await apiClient<{ rooms: RoomRow[] }>(`/api/properties/${prop.id}/rooms`);
            return { ...prop, rooms: roomRes.rooms };
          } catch {
            return { ...prop, rooms: [] };
          }
        }),
      );
      setProperties(withRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhà trọ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    void loadProperties();
  }, [user, authLoading, router, loadProperties]);

  const handleCreateProperty = async (e: FormEvent) => {
    e.preventDefault();
    if (!propName.trim()) return;
    try {
      setSubmittingProp(true);
      await apiClient("/api/properties", {
        method: "POST",
        body: JSON.stringify({
          name: propName.trim(),
          address: propAddress.trim() || null,
          bankCode: propBankCode || null,
          bankAccount: propBankAccount.trim() || null,
          accountHolder: propAccountHolder.trim() || null,
        }),
      });
      setPropName("");
      setPropAddress("");
      setPropBankCode("");
      setPropBankAccount("");
      setPropAccountHolder("");
      setShowAddProp(false);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo nhà trọ thất bại.");
    } finally {
      setSubmittingProp(false);
    }
  };

  const startEditBank = (prop: PropertyRow) => {
    setEditingBankProp(prop);
    setEditBankCode(prop.bankCode ?? "");
    setEditBankAccount(prop.bankAccount ?? "");
    setEditAccountHolder(prop.accountHolder ?? "");
    setShowAddProp(false);
    setSelectedPropId(null);
  };

  const handleSaveBank = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingBankProp) return;
    try {
      setSubmittingBank(true);
      await apiClient(`/api/properties/${editingBankProp.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          bankCode: editBankCode || null,
          bankAccount: editBankAccount.trim() || null,
          accountHolder: editAccountHolder.trim() || null,
        }),
      });
      setEditingBankProp(null);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật tài khoản ngân hàng thất bại.");
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPropId || !roomNumber.trim() || !roomRent) return;
    try {
      setSubmittingRoom(true);
      await apiClient(`/api/properties/${selectedPropId}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          monthlyRent: Number(roomRent),
          areaM2: roomArea ? Number(roomArea) : null,
        }),
      });
      setRoomNumber("");
      setRoomRent("");
      setRoomArea("");
      setSelectedPropId(null);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm phòng thất bại.");
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleToggleRoomStatus = async (
    propertyId: string,
    roomId: string,
    currentStatus: "ready" | "maintenance",
  ) => {
    const nextStatus = currentStatus === "ready" ? "maintenance" : "ready";
    try {
      await apiClient(`/api/properties/${propertyId}/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật trạng thái phòng.");
    }
  };

  const handleDeleteRoom = async (propertyId: string, roomId: string, roomNum: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa phòng ${roomNum}?`)) return;
    try {
      await apiClient(`/api/properties/${propertyId}/rooms/${roomId}`, { method: "DELETE" });
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phòng.");
    }
  };

  const handleDeleteProperty = async (propertyId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhà trọ "${name}" và toàn bộ phòng thuộc nhà này?`)) return;
    try {
      await apiClient(`/api/properties/${propertyId}`, { method: "DELETE" });
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa nhà trọ.");
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

  const selectedPropName = properties.find((p) => p.id === selectedPropId)?.name;

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
            <h1 className="page-title">Nhà trọ &amp; Phòng</h1>
            <p className="page-desc">Tạo và cấu hình nhà trọ, danh sách phòng và bảng giá.</p>
          </div>
          {user?.role === "owner" && (
            <motion.button
              type="button"
              className={showAddProp ? "btn-secondary" : "btn-primary"}
              onClick={() => { setShowAddProp(!showAddProp); setSelectedPropId(null); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {showAddProp ? <X size={14} /> : <Plus size={14} weight="bold" />}
              {showAddProp ? "Đóng" : "Thêm nhà trọ"}
            </motion.button>
          )}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="alert-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ marginBottom: "var(--space-2)" }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Property Panel */}
        <AnimatePresence>
          {showAddProp && (
            <SlidePanel title="Thêm nhà trọ mới" onClose={() => setShowAddProp(false)}>
              <form onSubmit={handleCreateProperty}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="prop-name">Tên nhà trọ *</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
                        <Buildings size={15} />
                      </span>
                      <input
                        id="prop-name"
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: 34 }}
                        placeholder="VD: Nhà trọ Xanh, Khu trọ Bách Khoa..."
                        value={propName}
                        onChange={(e) => setPropName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="prop-address">Địa chỉ</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
                        <MapPin size={15} />
                      </span>
                      <input
                        id="prop-address"
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: 34 }}
                        placeholder="VD: 123 Đường Cầu Giấy, Hà Nội"
                        value={propAddress}
                        onChange={(e) => setPropAddress(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account Settings */}
                <div style={{ marginTop: "var(--space-2)", borderTop: "1px dashed var(--color-border)", paddingTop: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <CreditCard size={14} /> Tài khoản nhận tiền (Tự động sinh mã VietQR trên hóa đơn)
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="prop-bank-code">Ngân hàng</label>
                      <select
                        id="prop-bank-code"
                        className="form-control"
                        value={propBankCode}
                        onChange={(e) => setPropBankCode(e.target.value)}
                      >
                        <option value="">-- Chọn ngân hàng --</option>
                        {VIETNAMESE_BANKS.map((b) => (
                          <option key={b.code} value={b.code}>
                            {b.shortName} ({b.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="prop-bank-account">Số tài khoản</label>
                      <input
                        id="prop-bank-account"
                        type="text"
                        className="form-control"
                        placeholder="VD: 0987654321"
                        value={propBankAccount}
                        onChange={(e) => setPropBankAccount(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="prop-account-holder">Tên chủ tài khoản</label>
                      <input
                        id="prop-account-holder"
                        type="text"
                        className="form-control"
                        placeholder="VD: NGUYEN VAN A"
                        value={propAccountHolder}
                        onChange={(e) => setPropAccountHolder(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddProp(false)}>
                    Hủy
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingProp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submittingProp ? (
                      <><span className="spinner" aria-hidden="true" />Đang lưu...</>
                    ) : (
                      <><Plus size={13} weight="bold" />Lưu nhà trọ</>
                    )}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Bank Settings Panel */}
        <AnimatePresence>
          {editingBankProp && (
            <SlidePanel
              title={`Cài đặt tài khoản nhận tiền — ${editingBankProp.name}`}
              onClose={() => setEditingBankProp(null)}
            >
              <form onSubmit={handleSaveBank}>
                <p className="text-muted" style={{ fontSize: "var(--text-xs)", marginBottom: "var(--space-2)" }}>
                  Tài khoản ngân hàng dùng để tự động tạo mã VietQR chuẩn NAPAS 247 khi xuất hóa đơn thu tiền cho khách thuê.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="edit-bank-code">Ngân hàng</label>
                    <select
                      id="edit-bank-code"
                      className="form-control"
                      value={editBankCode}
                      onChange={(e) => setEditBankCode(e.target.value)}
                    >
                      <option value="">-- Chọn ngân hàng --</option>
                      {VIETNAMESE_BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.shortName} ({b.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="edit-bank-account">Số tài khoản</label>
                    <input
                      id="edit-bank-account"
                      type="text"
                      className="form-control"
                      placeholder="VD: 0987654321"
                      value={editBankAccount}
                      onChange={(e) => setEditBankAccount(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="edit-account-holder">Tên chủ tài khoản</label>
                    <input
                      id="edit-account-holder"
                      type="text"
                      className="form-control"
                      placeholder="VD: NGUYEN VAN A"
                      value={editAccountHolder}
                      onChange={(e) => setEditAccountHolder(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setEditingBankProp(null)}>
                    Hủy
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingBank}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submittingBank ? "Đang lưu..." : "Lưu tài khoản"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Add Room Panel */}
        <AnimatePresence>
          {selectedPropId && (
            <SlidePanel
              title={`Thêm phòng — ${selectedPropName ?? ""}`}
              onClose={() => setSelectedPropId(null)}
            >
              <form onSubmit={handleCreateRoom}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="room-num">Số phòng *</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)", display: "flex", pointerEvents: "none" }}>
                        <Door size={15} />
                      </span>
                      <input
                        id="room-num"
                        type="text"
                        className="form-control"
                        style={{ paddingLeft: 34 }}
                        placeholder="VD: 101, P.202..."
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="room-rent">Giá thuê / tháng (VND) *</label>
                    <input
                      id="room-rent"
                      type="number"
                      className="form-control"
                      placeholder="VD: 2500000"
                      min="0"
                      step="10000"
                      value={roomRent}
                      onChange={(e) => setRoomRent(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="room-area">Diện tích (m²)</label>
                    <input
                      id="room-area"
                      type="number"
                      className="form-control"
                      placeholder="VD: 25"
                      min="1"
                      step="0.5"
                      value={roomArea}
                      onChange={(e) => setRoomArea(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setSelectedPropId(null)}>
                    Hủy
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-primary"
                    disabled={submittingRoom}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {submittingRoom ? (
                      <><span className="spinner" aria-hidden="true" />Đang thêm...</>
                    ) : (
                      <><Plus size={13} weight="bold" />Thêm phòng</>
                    )}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[0, 1].map((i) => (
              <div key={i} className="card" style={{ padding: 0, minHeight: 200 }}>
                <div className="card-header" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div>
                    <div className="skeleton" style={{ width: 180, height: 20, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: 120, height: 13 }} />
                  </div>
                </div>
                <div style={{ padding: "var(--space-3)" }}>
                  {[0, 1, 2].map((j) => (
                    <div key={j} style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                      <div className="skeleton" style={{ flex: 1, height: 13 }} />
                      <div className="skeleton" style={{ flex: 1, height: 13 }} />
                      <div className="skeleton" style={{ flex: 1, height: 13 }} />
                      <div className="skeleton" style={{ width: 70, height: 13 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          /* Empty state */
          <motion.div
            className="card"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="empty-state">
              <div className="empty-icon">
                <Buildings size={28} />
              </div>
              <p className="text-muted" style={{ margin: 0 }}>
                Bạn chưa có nhà trọ nào. Hãy thêm nhà trọ để bắt đầu quản lý.
              </p>
              {user?.role === "owner" && (
                <motion.button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowAddProp(true)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Plus size={14} weight="bold" />
                  Thêm nhà trọ ngay
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Property cards */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {properties.map((prop, pi) => (
              <motion.article
                className="card"
                key={prop.id}
                custom={pi}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
              >
                <header className="card-header">
                  <div>
                    <h2 className="card-title">{prop.name}</h2>
                    <p className="text-muted text-sm" style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={12} />
                      {prop.address ?? "Chưa cập nhật địa chỉ"}
                    </p>
                    {prop.bankAccount ? (
                      <p style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 500 }}>
                        <CreditCard size={13} weight="fill" />
                        <span>STK: <strong>{prop.bankCode ? `${prop.bankCode} ` : ""}{prop.bankAccount}</strong> ({prop.accountHolder ?? "Chủ nhà"})</span>
                      </p>
                    ) : (
                      <p style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                        <CreditCard size={13} />
                        <span>Chưa thiết lập STK nhận tiền VietQR</span>
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {user?.role === "owner" && (
                      <motion.button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "var(--text-sm)", gap: 5 }}
                        onClick={() => startEditBank(prop)}
                        title="Cài đặt tài khoản ngân hàng nhận tiền"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <CreditCard size={13} />
                        <span>{prop.bankAccount ? "Sửa STK" : "Cài STK"}</span>
                      </motion.button>
                    )}

                    <motion.button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "6px 14px", fontSize: "var(--text-sm)" }}
                      onClick={() => {
                        setSelectedPropId(prop.id);
                        setShowAddProp(false);
                        setEditingBankProp(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Plus size={12} weight="bold" />
                      Thêm phòng
                    </motion.button>

                    {user?.role === "owner" && (
                      <motion.button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "6px 12px", fontSize: "var(--text-sm)" }}
                        onClick={() => void handleDeleteProperty(prop.id, prop.name)}
                        title="Xóa nhà trọ"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Trash size={13} />
                        Xóa
                      </motion.button>
                    )}
                  </div>
                </header>

                <div className="table-responsive">
                  {prop.rooms.length === 0 ? (
                    <p style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--color-fg-3)", fontSize: "var(--text-sm)" }}>
                      Nhà này chưa có phòng nào.{" "}
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontWeight: 600, fontSize: "inherit" }}
                        onClick={() => { setSelectedPropId(prop.id); setShowAddProp(false); }}
                      >
                        Thêm phòng ngay
                      </button>
                    </p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Phòng</th>
                          <th>Diện tích</th>
                          <th>Giá thuê</th>
                          <th>Trạng thái</th>
                          <th style={{ textAlign: "right" }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prop.rooms.map((room) => (
                          <tr key={room.id}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Door size={13} style={{ color: "var(--color-fg-3)" }} />
                                Phòng {room.roomNumber}
                              </span>
                            </td>
                            <td className="text-muted">
                              {room.areaM2 ? `${room.areaM2} m²` : "—"}
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                              {money.format(room.monthlyRent)}
                            </td>
                            <td>
                              <motion.button
                                type="button"
                                className={`badge ${room.status === "ready" ? "ready" : "maintenance"}`}
                                style={{ border: "none", cursor: "pointer", fontFamily: "var(--font-body)" }}
                                onClick={() => void handleToggleRoomStatus(prop.id, room.id, room.status)}
                                title="Bấm để đổi trạng thái"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                              >
                                {room.status === "ready" ? (
                                  <><CheckCircle size={10} weight="fill" /> Sẵn sàng</>
                                ) : (
                                  <><Wrench size={10} weight="fill" /> Bảo trì</>
                                )}
                              </motion.button>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {user?.role === "owner" && (
                                <motion.button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                                  onClick={() => void handleDeleteRoom(prop.id, room.id, room.roomNumber)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Trash size={11} />
                                  Xóa
                                </motion.button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Room count footer */}
                <div style={{
                  padding: "10px var(--space-3)",
                  borderTop: "1px solid var(--color-border)",
                  display: "flex",
                  gap: 16,
                  fontSize: "var(--text-xs)",
                  color: "var(--color-fg-3)",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <CheckCircle size={11} weight="fill" style={{ color: "var(--color-success)" }} />
                    {prop.rooms.filter((r) => r.status === "ready").length} sẵn sàng
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Wrench size={11} weight="fill" style={{ color: "var(--color-warning)" }} />
                    {prop.rooms.filter((r) => r.status === "maintenance").length} bảo trì
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <PencilSimple size={11} style={{ color: "var(--color-fg-3)" }} />
                    {prop.rooms.length} tổng số phòng
                  </span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
