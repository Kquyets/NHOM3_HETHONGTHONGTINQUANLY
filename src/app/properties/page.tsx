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
  ShieldCheck,
  Megaphone,
  Archive,
  UsersThree,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { PropertyMembersModal } from "../../components/properties/property-members-modal";
import { RoomListingModal } from "../../components/properties/room-listing-modal";
import { RoomEditModal, COMMON_FURNITURE_ITEMS } from "../../components/properties/room-edit-modal";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { validatePositiveNumber } from "../../utils/form-validation";
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

  const [managingMembersProp, setManagingMembersProp] = useState<PropertyRow | null>(null);
  const [editingListingRoom, setEditingListingRoom] = useState<{ room: RoomRow; property: PropertyWithRooms } | null>(null);

  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomRent, setRoomRent] = useState("");
  const [roomArea, setRoomArea] = useState("");
  const [roomFloor, setRoomFloor] = useState("1");
  const [roomMaxOccupants, setRoomMaxOccupants] = useState("2");
  const [selectedFurniture, setSelectedFurniture] = useState<string[]>([
    "Điều hòa",
    "Bình nóng lạnh",
    "Giường ngủ",
    "Tủ quần áo",
  ]);
  const [editingRoom, setEditingRoom] = useState<{ room: RoomRow; property: PropertyWithRooms } | null>(null);
  const [floorFilterByProp, setFloorFilterByProp] = useState<Record<string, string>>({});
  const [showArchivedByProp, setShowArchivedByProp] = useState<Record<string, boolean>>({});
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

    const rentErr = validatePositiveNumber(roomRent, "Tiền thuê phòng");
    if (rentErr) {
      setError(rentErr);
      return;
    }
    if (roomArea) {
      const areaErr = validatePositiveNumber(roomArea, "Diện tích phòng");
      if (areaErr) {
        setError(areaErr);
        return;
      }
    }

    try {
      setSubmittingRoom(true);
      setError(null);
      await apiClient(`/api/properties/${selectedPropId}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          monthlyRent: Number(roomRent),
          areaM2: roomArea ? Number(roomArea) : null,
          floor: roomFloor ? Number(roomFloor) : 1,
          maxOccupants: roomMaxOccupants ? Number(roomMaxOccupants) : 2,
          furnitureList: selectedFurniture,
        }),
      });
      setRoomNumber("");
      setRoomRent("");
      setRoomArea("");
      setRoomFloor("1");
      setRoomMaxOccupants("2");
      setSelectedFurniture(["Điều hòa", "Bình nóng lạnh", "Giường ngủ", "Tủ quần áo"]);
      setSelectedPropId(null);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm phòng thất bại.");
    } finally {
      setSubmittingRoom(false);
    }
  };

  const handleToggleArchiveRoom = async (room: RoomRow) => {
    try {
      await apiClient(`/api/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isArchived: !room.isArchived }),
      });
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thay đổi lưu trữ phòng.");
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="room-floor">Tầng / Lầu</label>
                    <input
                      id="room-floor"
                      type="number"
                      className="form-control"
                      placeholder="1"
                      min="0"
                      max="100"
                      value={roomFloor}
                      onChange={(e) => setRoomFloor(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="room-occupants">Số người ở tối đa</label>
                    <input
                      id="room-occupants"
                      type="number"
                      className="form-control"
                      placeholder="2"
                      min="1"
                      max="30"
                      value={roomMaxOccupants}
                      onChange={(e) => setRoomMaxOccupants(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Furniture Checklist */}
                <div style={{ marginTop: "var(--space-2)" }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-2)", display: "block", marginBottom: 6 }}>
                    Kiểm kê tiện nghi / nội thất ban đầu
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {COMMON_FURNITURE_ITEMS.slice(0, 10).map((item) => {
                      const active = selectedFurniture.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setSelectedFurniture((prev) =>
                              prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
                            );
                          }}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 16,
                            fontSize: "var(--text-xs)",
                            border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                            backgroundColor: active ? "rgba(37, 99, 235, 0.08)" : "var(--color-bg-subtle)",
                            color: active ? "var(--color-primary)" : "var(--color-fg-3)",
                            cursor: "pointer",
                            fontWeight: active ? 600 : 400,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {active ? "✓ " : "+ "}{item}
                        </button>
                      );
                    })}
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
                        onClick={() => setManagingMembersProp(prop)}
                        title="Ban quản lý & Phân quyền quản lý nhà trọ"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <ShieldCheck size={14} />
                        <span>Ban quản lý</span>
                      </motion.button>
                    )}

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

                {/* Spatial hierarchy (Floors) & Archive filter bar */}
                {prop.rooms.length > 0 && (() => {
                  const currentFloor = floorFilterByProp[prop.id] || "all";
                  const showArchived = showArchivedByProp[prop.id] || false;
                  const distinctFloors = Array.from(
                    new Set(prop.rooms.map((r) => (r.floor != null ? r.floor : 1))),
                  ).sort((a, b) => a - b);

                  return (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px var(--space-3)",
                      backgroundColor: "var(--color-bg-subtle)",
                      borderBottom: "1px solid var(--color-border)",
                      flexWrap: "wrap",
                      gap: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", fontWeight: 600 }}>
                          Tầng:
                        </span>
                        <button
                          type="button"
                          onClick={() => setFloorFilterByProp((prev) => ({ ...prev, [prop.id]: "all" }))}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 14,
                            fontSize: "var(--text-xs)",
                            border: "none",
                            backgroundColor: currentFloor === "all" ? "var(--color-primary)" : "transparent",
                            color: currentFloor === "all" ? "#fff" : "var(--color-fg-2)",
                            fontWeight: currentFloor === "all" ? 600 : 400,
                            cursor: "pointer",
                          }}
                        >
                          Tất cả ({prop.rooms.filter((r) => showArchived || !r.isArchived).length})
                        </button>
                        {distinctFloors.map((fl) => {
                          const count = prop.rooms.filter((r) => (r.floor != null ? r.floor : 1) === fl && (showArchived || !r.isArchived)).length;
                          return (
                            <button
                              key={fl}
                              type="button"
                              onClick={() => setFloorFilterByProp((prev) => ({ ...prev, [prop.id]: String(fl) }))}
                              style={{
                                padding: "3px 10px",
                                borderRadius: 14,
                                fontSize: "var(--text-xs)",
                                border: "none",
                                backgroundColor: currentFloor === String(fl) ? "var(--color-primary)" : "transparent",
                                color: currentFloor === String(fl) ? "#fff" : "var(--color-fg-2)",
                                fontWeight: currentFloor === String(fl) ? 600 : 400,
                                cursor: "pointer",
                              }}
                            >
                              Tầng {fl} ({count})
                            </button>
                          );
                        })}
                      </div>

                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--color-fg-3)", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={showArchived}
                          onChange={(e) => setShowArchivedByProp((prev) => ({ ...prev, [prop.id]: e.target.checked }))}
                        />
                        <span>Hiện phòng đã lưu trữ</span>
                      </label>
                    </div>
                  );
                })()}

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
                  ) : (() => {
                    const currentFloor = floorFilterByProp[prop.id] || "all";
                    const showArchived = showArchivedByProp[prop.id] || false;
                    const displayRooms = prop.rooms.filter((r) => {
                      if (!showArchived && r.isArchived) return false;
                      if (currentFloor !== "all" && String(r.floor != null ? r.floor : 1) !== currentFloor) return false;
                      return true;
                    });

                    if (displayRooms.length === 0) {
                      return (
                        <p style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--color-fg-3)", fontSize: "var(--text-sm)" }}>
                          Không có phòng nào phù hợp bộ lọc tầng hoặc lưu trữ.
                        </p>
                      );
                    }

                    return (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Phòng / Tầng</th>
                            <th>Diện tích</th>
                            <th>Giá thuê</th>
                            <th>Trạng thái</th>
                            <th>Tiện nghi / Nội thất</th>
                            <th>Sàn Nhà Tốt</th>
                            <th style={{ textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayRooms.map((room) => (
                            <tr key={room.id} style={{ opacity: room.isArchived ? 0.65 : 1 }}>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                                    <Door size={14} style={{ color: "var(--color-fg-3)" }} />
                                    Phòng {room.roomNumber}
                                    {room.isArchived && (
                                      <span className="badge warning" style={{ fontSize: "10px", padding: "1px 5px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                        <Archive size={10} /> Đã lưu trữ
                                      </span>
                                    )}
                                  </span>
                                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    <span className="badge neutral" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                      Tầng {room.floor != null ? room.floor : 1}
                                    </span>
                                    <span className="badge neutral" style={{ fontSize: "10px", padding: "1px 6px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <UsersThree size={10} /> {room.maxOccupants ?? 2} ng
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="text-muted">
                                {room.areaM2 ? `${room.areaM2} m²` : "—"}
                              </td>
                              <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 500 }}>
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
                              <td>
                                {room.furnitureList && room.furnitureList.length > 0 ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 220 }}>
                                    {room.furnitureList.slice(0, 3).map((item) => (
                                      <span
                                        key={item}
                                        style={{
                                          fontSize: "10px",
                                          padding: "1px 6px",
                                          borderRadius: 4,
                                          backgroundColor: "var(--color-bg-subtle)",
                                          border: "1px solid var(--color-border)",
                                          color: "var(--color-fg-2)",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {item}
                                      </span>
                                    ))}
                                    {room.furnitureList.length > 3 && (
                                      <span style={{ fontSize: "10px", color: "var(--color-fg-3)", alignSelf: "center" }}>
                                        +{room.furnitureList.length - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                                    Chưa kiểm kê
                                  </span>
                                )}
                              </td>
                              <td>
                                <motion.button
                                  type="button"
                                  className={`badge ${room.isPublicListed ? "ready" : "neutral"}`}
                                  style={{
                                    border: "none",
                                    cursor: "pointer",
                                    fontFamily: "var(--font-body)",
                                    backgroundColor: room.isPublicListed ? "#fff7ed" : "var(--color-bg-subtle)",
                                    color: room.isPublicListed ? "#ea580c" : "var(--color-fg-3)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: "var(--text-xs)",
                                    fontWeight: 600,
                                  }}
                                  onClick={() => setEditingListingRoom({ room, property: prop })}
                                  title="Cài đặt đăng tin lên Sàn Nhà Tốt"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Megaphone size={12} weight={room.isPublicListed ? "fill" : "regular"} />
                                  <span>{room.isPublicListed ? "Đang đăng" : "Đăng tin"}</span>
                                </motion.button>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                                  <motion.button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ padding: "4px 8px", fontSize: "var(--text-xs)", gap: 4 }}
                                    onClick={() => setEditingRoom({ room, property: prop })}
                                    title="Sửa phòng & Kiểm kê nội thất"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <PencilSimple size={12} />
                                    <span>Kiểm kê</span>
                                  </motion.button>

                                  <motion.button
                                    type="button"
                                    className="btn-ghost"
                                    style={{ padding: "4px 6px", fontSize: "var(--text-xs)", color: room.isArchived ? "var(--color-primary)" : "var(--color-fg-3)" }}
                                    onClick={() => void handleToggleArchiveRoom(room)}
                                    title={room.isArchived ? "Khôi phục phòng" : "Lưu trữ phòng (tạm ngưng)"}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <Archive size={13} weight={room.isArchived ? "fill" : "regular"} />
                                  </motion.button>

                                  {user?.role === "owner" && (
                                    <motion.button
                                      type="button"
                                      className="btn-ghost"
                                      style={{ padding: "4px 6px", fontSize: "var(--text-xs)", color: "var(--color-danger)" }}
                                      onClick={() => void handleDeleteRoom(prop.id, room.id, room.roomNumber)}
                                      title="Xóa phòng"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Trash size={13} />
                                    </motion.button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
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

      {/* Property Members / Management Modal */}
      {managingMembersProp && (
        <PropertyMembersModal
          property={managingMembersProp}
          onClose={() => setManagingMembersProp(null)}
        />
      )}

      {/* Room Public Listing Modal (Sàn Nhà Tốt) */}
      {editingListingRoom && (
        <RoomListingModal
          room={editingListingRoom.room}
          propertyName={editingListingRoom.property.name}
          defaultAddress={editingListingRoom.property.address}
          onClose={() => setEditingListingRoom(null)}
          onUpdated={(updated) => {
            setProperties((prev) =>
              prev.map((p) =>
                p.id === editingListingRoom.property.id
                  ? { ...p, rooms: p.rooms.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) }
                  : p,
              ),
            );
          }}
        />
      )}

      {/* Room Edit & Furniture Inventory Modal */}
      {editingRoom && (
        <RoomEditModal
          room={editingRoom.room}
          propertyName={editingRoom.property.name}
          onClose={() => setEditingRoom(null)}
          onUpdated={(updated) => {
            setProperties((prev) =>
              prev.map((p) =>
                p.id === editingRoom.property.id
                  ? { ...p, rooms: p.rooms.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)) }
                  : p,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
