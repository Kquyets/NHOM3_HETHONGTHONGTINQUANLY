"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  PencilSimple,
} from "@phosphor-icons/react";
import { apiClient } from "../../lib/api-client";
import type { RoomRow } from "../../modules/rooms/room.service";

export const COMMON_FURNITURE_ITEMS = [
  "Điều hòa",
  "Bình nóng lạnh",
  "Giường ngủ",
  "Đệm lò xo/cao su",
  "Tủ quần áo",
  "Gác lửng",
  "Kệ bếp nấu ăn",
  "Bếp từ / hồng ngoại",
  "Tủ lạnh",
  "Máy giặt riêng",
  "Bàn ghế làm việc",
  "Quạt trần",
  "Rèm cửa chắn sáng",
  "Khóa cửa vân tay",
  "Gương soi toàn thân",
];

const SAMPLE_ROOM_PHOTOS = [
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
];

export function RoomEditModal({
  room,
  propertyName,
  onClose,
  onUpdated,
}: {
  room: RoomRow;
  propertyName: string;
  onClose: () => void;
  onUpdated: (updated: RoomRow) => void;
}) {
  const [roomNumber, setRoomNumber] = useState(room.roomNumber);
  const [monthlyRent, setMonthlyRent] = useState(String(room.monthlyRent));
  const [areaM2, setAreaM2] = useState(room.areaM2 ? String(room.areaM2) : "");
  const [floor, setFloor] = useState(room.floor ? String(room.floor) : "1");
  const [maxOccupants, setMaxOccupants] = useState(room.maxOccupants ? String(room.maxOccupants) : "2");
  const [isArchived, setIsArchived] = useState<boolean>(room.isArchived ?? false);
  const [status, setStatus] = useState<"ready" | "maintenance">(room.status);

  // Furniture inventory
  const [furniture, setFurniture] = useState<string[]>(room.furnitureList ?? []);
  const [customFurniture, setCustomFurniture] = useState("");

  // Photos
  const [images, setImages] = useState<string[]>(room.imageUrls ?? []);
  const [customImage, setCustomImage] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleFurniture = (item: string) => {
    setFurniture((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const addCustomFurniture = () => {
    const trimmed = customFurniture.trim();
    if (trimmed && !furniture.includes(trimmed)) {
      setFurniture([...furniture, trimmed]);
      setCustomFurniture("");
    }
  };

  const addImage = (url: string) => {
    const trimmed = url.trim();
    if (trimmed && !images.includes(trimmed)) {
      setImages([...images, trimmed]);
      setCustomImage("");
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRent = parseInt(monthlyRent, 10);
    if (!roomNumber.trim() || !Number.isFinite(parsedRent) || parsedRent < 0) {
      setError("Vui lòng nhập số phòng và giá thuê hợp lệ.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        roomNumber: roomNumber.trim(),
        monthlyRent: parsedRent,
        areaM2: areaM2 ? parseFloat(areaM2) : null,
        floor: floor ? parseInt(floor, 10) : 1,
        maxOccupants: maxOccupants ? parseInt(maxOccupants, 10) : 2,
        isArchived,
        status,
        furnitureList: furniture,
        imageUrls: images,
      };

      const res = await apiClient<RoomRow>(`/api/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      onUpdated(res || { ...room, ...payload });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thông tin phòng thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Cập nhật thông tin phòng ${room.roomNumber}`}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="modal-dialog"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "92vh",
          backgroundColor: "var(--color-bg-panel, #ffffff)",
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PencilSimple size={18} weight="bold" />
            </span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-fg-1)" }}>
                Cập nhật thông tin phòng {room.roomNumber}
              </h2>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                {propertyName} • Phân cấp tầng &amp; kiểm kê trang thiết bị
              </span>
            </div>
          </div>

          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "#fee2e2", color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Basic Info: Number, Floor, Rent, Area */}
          <div className="form-grid-4" style={{ gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Số phòng *</label>
              <input
                type="text"
                className="form-control"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tầng / Lầu *</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-control"
                placeholder="VD: 1, 2, 3..."
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Giá thuê (VND) *</label>
              <input
                type="number"
                min="0"
                step="50000"
                className="form-control"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Diện tích (m²)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                className="form-control"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
              />
            </div>
          </div>

          {/* Occupants & Status */}
          <div className="form-grid-3" style={{ gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Số người tối đa</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-control"
                placeholder="VD: 2"
                value={maxOccupants}
                onChange={(e) => setMaxOccupants(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Trạng thái phòng</label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value as "ready" | "maintenance")}
              >
                <option value="ready">Sẵn sàng đón khách</option>
                <option value="maintenance">Đang bảo trì / sửa chữa</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Lưu trữ / Tạm dừng</label>
              <select
                className="form-control"
                value={isArchived ? "archived" : "active"}
                onChange={(e) => setIsArchived(e.target.value === "archived")}
              >
                <option value="active">🟢 Đang sử dụng</option>
                <option value="archived">📦 Đã lưu trữ (Tạm ngưng)</option>
              </select>
            </div>
          </div>

          {/* Furniture / Asset Inventory Checklist */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                Kiểm kê trang thiết bị &amp; Đồ đạc đi kèm ({furniture.length} món)
              </label>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                Dùng đối chiếu bàn giao và hoàn cọc khi khách trả phòng
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 8,
                marginBottom: 10,
              }}
            >
              {COMMON_FURNITURE_ITEMS.map((item) => {
                const checked = furniture.includes(item);
                return (
                  <label
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      padding: "6px 10px",
                      borderRadius: 8,
                      backgroundColor: checked ? "rgba(37, 99, 235, 0.08)" : "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                      border: checked ? "1px solid #3b82f6" : "1px solid var(--color-border)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFurniture(item)}
                    />
                    <span>{item}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom furniture item input */}
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Thêm đồ đạc khác (VD: Bàn ủi, Cây nước nóng lạnh...)"
                value={customFurniture}
                onChange={(e) => setCustomFurniture(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomFurniture();
                  }
                }}
                style={{ fontSize: 13 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={addCustomFurniture}
                style={{ whiteSpace: "nowrap", padding: "0 12px" }}
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* Room Photos */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Ảnh chụp thực tế của phòng ({images.length} ảnh)
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    width: 80,
                    height: 60,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="room" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 18,
                      height: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    aria-label="Xóa ảnh"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>Chọn ảnh mẫu:</span>
              {SAMPLE_ROOM_PHOTOS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() => addImage(sample)}
                >
                  + Mẫu {idx + 1}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                className="form-control"
                placeholder="Dán link ảnh chụp phòng (https://...)"
                value={customImage}
                onChange={(e) => setCustomImage(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => addImage(customImage)}
                style={{ whiteSpace: "nowrap", padding: "0 12px" }}
              >
                Thêm ảnh
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              paddingTop: 10,
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ padding: "8px 20px", fontWeight: 600 }}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
