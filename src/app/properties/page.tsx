"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "../../components/layout/app-header";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
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

export default function PropertiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyWithRooms[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states: New Property
  const [showAddProp, setShowAddProp] = useState(false);
  const [propName, setPropName] = useState("");
  const [propAddress, setPropAddress] = useState("");
  const [submittingProp, setSubmittingProp] = useState(false);

  // Form states: New Room
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
      const propList = propRes.properties;

      const withRooms: PropertyWithRooms[] = await Promise.all(
        propList.map(async (prop) => {
          try {
            const roomRes = await apiClient<{ rooms: RoomRow[] }>(
              `/api/properties/${prop.id}/rooms`,
            );
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
    if (!user) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const propRes = await apiClient<{ properties: PropertyRow[] }>("/api/properties");
        const propList = propRes.properties;

        const withRooms: PropertyWithRooms[] = await Promise.all(
          propList.map(async (prop) => {
            try {
              const roomRes = await apiClient<{ rooms: RoomRow[] }>(
                `/api/properties/${prop.id}/rooms`,
              );
              return { ...prop, rooms: roomRes.rooms };
            } catch {
              return { ...prop, rooms: [] };
            }
          }),
        );

        if (isMounted) {
          setProperties(withRooms);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Không thể tải danh sách nhà trọ.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, router]);

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
        }),
      });
      setPropName("");
      setPropAddress("");
      setShowAddProp(false);
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo nhà trọ thất bại.");
    } finally {
      setSubmittingProp(false);
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
      await apiClient(`/api/properties/${propertyId}/rooms/${roomId}`, {
        method: "DELETE",
      });
      await loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phòng.");
    }
  };

  const handleDeleteProperty = async (propertyId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhà trọ "${name}" và toàn bộ phòng thuộc nhà này?`)) {
      return;
    }

    try {
      await apiClient(`/api/properties/${propertyId}`, {
        method: "DELETE",
      });
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
          <div className="loading-indicator">Đang xác thực thông tin...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Quản lý Nhà trọ & Phòng</h1>
            <p className="page-desc">Tạo và cấu hình các nhà trọ, danh sách phòng và bảng giá.</p>
          </div>
          {user?.role === "owner" && (
            <button
              type="button"
              className="btn-primary"
              style={{ width: "auto", padding: "8px 18px", fontSize: "14px" }}
              onClick={() => setShowAddProp(!showAddProp)}
            >
              {showAddProp ? "Đóng biểu mẫu" : "+ Thêm nhà trọ"}
            </button>
          )}
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Modal / Collapse: Add Property */}
        {showAddProp && (
          <div className="card card-body" style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "16px" }}>Thêm nhà trọ mới</h2>
            <form onSubmit={handleCreateProperty}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label htmlFor="prop-name">Tên nhà trọ *</label>
                  <input
                    id="prop-name"
                    type="text"
                    className="form-control"
                    placeholder="VD: Nhà trọ Xanh, Khu trọ Bách Khoa..."
                    value={propName}
                    onChange={(e) => setPropName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prop-address">Địa chỉ</label>
                  <input
                    id="prop-address"
                    type="text"
                    className="form-control"
                    placeholder="VD: 123 Đường Cầu Giấy, Hà Nội"
                    value={propAddress}
                    onChange={(e) => setPropAddress(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={() => setShowAddProp(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: "auto" }}
                  disabled={submittingProp}
                >
                  {submittingProp ? "Đang lưu..." : "Lưu nhà trọ"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal / Collapse: Add Room */}
        {selectedPropId && (
          <div className="card card-body" style={{ marginBottom: "28px", border: "2px solid var(--primary)" }}>
            <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "16px" }}>
              Thêm phòng cho nhà: {properties.find((p) => p.id === selectedPropId)?.name}
            </h2>
            <form onSubmit={handleCreateRoom}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label htmlFor="room-num">Số phòng *</label>
                  <input
                    id="room-num"
                    type="text"
                    className="form-control"
                    placeholder="VD: 101, P.202..."
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
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
                <div className="form-group">
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
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={() => setSelectedPropId(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: "auto" }}
                  disabled={submittingRoom}
                >
                  {submittingRoom ? "Đang thêm..." : "Thêm phòng"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-indicator">Đang tải danh sách nhà và phòng...</div>
        ) : properties.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
              Bạn chưa có nhà trọ nào. Hãy thêm nhà trọ để bắt đầu quản lý.
            </p>
            {user?.role === "owner" && (
              <button
                type="button"
                className="btn-primary"
                style={{ width: "auto", display: "inline-block", padding: "8px 20px" }}
                onClick={() => setShowAddProp(true)}
              >
                + Thêm nhà trọ ngay
              </button>
            )}
          </div>
        ) : (
          properties.map((prop) => (
            <article className="card" key={prop.id}>
              <header className="card-header">
                <div>
                  <h2 className="card-title">{prop.name}</h2>
                  <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                    📍 {prop.address ?? "Chưa cập nhật địa chỉ"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "auto", padding: "6px 14px", fontSize: "13px" }}
                    onClick={() => {
                      setSelectedPropId(prop.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    + Thêm phòng
                  </button>
                  {user?.role === "owner" && (
                    <button
                      type="button"
                      className="btn-logout"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => void handleDeleteProperty(prop.id, prop.name)}
                      title="Xóa nhà trọ"
                    >
                      Xóa nhà
                    </button>
                  )}
                </div>
              </header>

              <div className="table-responsive">
                {prop.rooms.length === 0 ? (
                  <div style={{ padding: "28px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
                    Nhà này chưa có phòng nào. Nhấn <strong>+ Thêm phòng</strong> ở góc phải để tạo phòng mới.
                  </div>
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
                          <td style={{ fontWeight: 600 }}>Phòng {room.roomNumber}</td>
                          <td>{room.areaM2 ? `${room.areaM2} m²` : "—"}</td>
                          <td>{money.format(room.monthlyRent)}</td>
                          <td>
                            <button
                              type="button"
                              className={`badge ${
                                room.status === "ready" ? "ready" : "maintenance"
                              }`}
                              style={{ border: "none", cursor: "pointer" }}
                              onClick={() => void handleToggleRoomStatus(prop.id, room.id, room.status)}
                              title="Bấm để đổi trạng thái Sẵn sàng / Bảo trì"
                            >
                              {room.status === "ready" ? "● Sẵn sàng" : "▲ Bảo trì"}
                            </button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {user?.role === "owner" && (
                              <button
                                type="button"
                                className="btn-logout"
                                style={{ padding: "4px 8px", fontSize: "12px" }}
                                onClick={() => void handleDeleteRoom(prop.id, room.id, room.roomNumber)}
                              >
                                Xóa
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
