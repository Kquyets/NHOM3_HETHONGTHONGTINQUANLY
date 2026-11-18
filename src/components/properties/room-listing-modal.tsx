"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  X,
  Megaphone,
} from "@phosphor-icons/react";
import { apiClient } from "../../lib/api-client";
import { POPULAR_AMENITIES, VIETNAM_CITIES } from "../../modules/explore/explore.types";
import type { RoomRow } from "../../modules/rooms/room.service";

const SAMPLE_ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
];

export function RoomListingModal({
  room,
  propertyName,
  defaultAddress,
  onClose,
  onUpdated,
}: {
  room: RoomRow;
  propertyName: string;
  defaultAddress?: string | null;
  onClose: () => void;
  onUpdated: (updatedRoom: RoomRow) => void;
}) {
  const [isPublicListed, setIsPublicListed] = useState<boolean>(room.isPublicListed ?? true);
  const [listingTitle, setListingTitle] = useState<string>(
    room.listingTitle || `Cho thuê phòng ${room.roomNumber} - ${propertyName}`,
  );
  const [listingDescription, setListingDescription] = useState<string>(
    room.listingDescription ||
      `Phòng trọ sạch sẽ, thoáng mát tại ${propertyName}. Vệ sinh khép kín, giờ giấc tự do, an ninh đảm bảo. Liên hệ ngay để xem phòng!`,
  );
  const [city, setCity] = useState<string>(room.city || "Hà Nội");
  const [district, setDistrict] = useState<string>(room.district || "Cầu Giấy");
  const [address, setAddress] = useState<string>(room.address || defaultAddress || "");
  const [floor, setFloor] = useState<string>(room.floor ? String(room.floor) : "2");
  const [furnishing, setFurnishing] = useState<string>(room.furnishing || "full");
  const [amenities, setAmenities] = useState<string[]>(
    room.amenities && room.amenities.length > 0
      ? room.amenities
      : ["ve_sinh_khep_kin", "khong_chung_chu", "dieu_hoa", "nong_lanh", "gio_tu_do"],
  );
  const [contactPhone, setContactPhone] = useState<string>(room.contactPhone || "0982345678");
  const [contactZalo, setContactZalo] = useState<string>(room.contactZalo || room.contactPhone || "0982345678");
  const [images, setImages] = useState<string[]>(
    room.imageUrls && room.imageUrls.length > 0 ? room.imageUrls : [SAMPLE_ROOM_IMAGES[0]],
  );
  const [customImageUrl, setCustomImageUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableDistricts = VIETNAM_CITIES[city] || VIETNAM_CITIES["Hà Nội"];

  const handleToggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleAddImage = (url: string) => {
    const trimmed = url.trim();
    if (trimmed && !images.includes(trimmed)) {
      setImages([...images, trimmed]);
      setCustomImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        isPublicListed,
        listingTitle: listingTitle.trim(),
        listingDescription: listingDescription.trim(),
        city,
        district,
        address: address.trim(),
        floor: floor ? parseInt(floor, 10) : null,
        furnishing,
        amenities,
        imageUrls: images,
        contactPhone: contactPhone.trim(),
        contactZalo: contactZalo.trim(),
      };

      const res = await apiClient<RoomRow>(`/api/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      onUpdated(res || { ...room, ...payload });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật tin đăng phòng.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
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
        {/* Modal Header */}
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
                backgroundColor: "#fff7ed",
                color: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Megaphone size={20} weight="fill" />
            </span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--color-fg-1)" }}>
                Đăng tin Sàn Nhà Tốt — Phòng {room.roomNumber}
              </h2>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                Tự động hiển thị công khai trên cổng tìm kiếm phòng trọ Hà Nội & TP.HCM
              </span>
            </div>
          </div>

          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* Toggle Public Listing */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              backgroundColor: isPublicListed ? "rgba(16, 185, 129, 0.08)" : "var(--color-bg-subtle, rgba(0,0,0,0.03))",
              border: isPublicListed ? "1px solid #10b981" : "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-1)" }}>
                Trạng thái tin đăng trên Sàn Nhà Tốt
              </div>
              <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                {isPublicListed ? "🟢 Đang bật công khai cho khách tìm kiếm" : "⚪ Đang tạm ẩn tin đăng"}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 8 }}>
              <input
                type="checkbox"
                checked={isPublicListed}
                onChange={(e) => setIsPublicListed(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{isPublicListed ? "Đang bật" : "Tắt"}</span>
            </label>
          </div>

          {/* Listing Title */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Tiêu đề tin đăng *</label>
            <input
              type="text"
              className="form-control"
              placeholder="VD: Studio gác lửng ban công ngập nắng ngõ Dịch Vọng Hậu - Giờ tự do"
              value={listingTitle}
              onChange={(e) => setListingTitle(e.target.value)}
              required
            />
          </div>

          {/* City & District */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tỉnh / Thành phố *</label>
              <select
                className="form-control"
                value={city}
                onChange={(e) => {
                  const newCity = e.target.value;
                  setCity(newCity);
                  const firstDist = (VIETNAM_CITIES[newCity] || [])[0] || "";
                  setDistrict(firstDist);
                }}
              >
                <option value="Hà Nội">Hà Nội</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Quận / Huyện *</label>
              <select
                className="form-control"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detail Address & Floor */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Địa chỉ chi tiết</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Số 68 ngõ Dịch Vọng Hậu"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Tầng số</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-control"
                placeholder="VD: 3"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
          </div>

          {/* Furnishing */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Tình trạng nội thất</label>
            <select
              className="form-control"
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
            >
              <option value="full">Đầy đủ nội thất (Giường, tủ, điều hòa, nóng lạnh, máy giặt...)</option>
              <option value="basic">Nội thất cơ bản (Nóng lạnh, điều hòa, kệ bếp)</option>
              <option value="empty">Nhà trống (Phòng trống tự decor)</option>
            </select>
          </div>

          {/* Amenities Checklist */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
              Tiện ích căn phòng
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {POPULAR_AMENITIES.map((item) => {
                const checked = amenities.includes(item.id);
                return (
                  <label
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      padding: "6px 10px",
                      borderRadius: 8,
                      backgroundColor: checked ? "rgba(16, 185, 129, 0.08)" : "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                      border: checked ? "1px solid #10b981" : "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleAmenity(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Contact Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Số điện thoại liên hệ *</label>
              <input
                type="tel"
                className="form-control"
                placeholder="VD: 0982345678"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Số Zalo</label>
              <input
                type="tel"
                className="form-control"
                placeholder="VD: 0982345678"
                value={contactZalo}
                onChange={(e) => setContactZalo(e.target.value)}
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Ảnh phòng ({images.length} ảnh)
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
                    onClick={() => handleRemoveImage(idx)}
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

            {/* Quick add sample photo chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>Chọn ảnh mẫu:</span>
              {SAMPLE_ROOM_IMAGES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "3px 8px", fontSize: 11 }}
                  onClick={() => handleAddImage(sample)}
                >
                  + Mẫu {idx + 1}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="url"
                className="form-control"
                placeholder="Dán link ảnh (https://...)"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleAddImage(customImageUrl)}
                style={{ whiteSpace: "nowrap", padding: "0 12px" }}
              >
                Thêm ảnh
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Mô tả chi tiết</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Mô tả ưu điểm, an ninh, giao thông xung quanh, các trường đại học lân cận..."
              value={listingDescription}
              onChange={(e) => setListingDescription(e.target.value)}
            />
          </div>

          {/* Footer Submit Bar */}
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
              style={{
                backgroundColor: "#ea580c",
                borderColor: "#ea580c",
                fontWeight: 700,
                padding: "8px 20px",
              }}
            >
              {saving ? "Đang lưu..." : "Lưu & Đăng tin"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
