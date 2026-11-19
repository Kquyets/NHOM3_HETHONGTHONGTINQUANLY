"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  X,
  Phone,
  ChatCircleDots,
  MapPin,
  CheckCircle,
  Lightning,
  Drop,
  Buildings,
  ArrowsOutSimple,
  ShieldCheck,
  ShareNetwork,
} from "@phosphor-icons/react";
import type { ExploreListingItem } from "../../modules/explore/explore.types";
import { POPULAR_AMENITIES } from "../../modules/explore/explore.types";
import { money, formatCurrency, formatPhoneNumber } from "../../utils/format";

export function RoomDetailModal({
  listing,
  onClose,
}: {
  listing: ExploreListingItem;
  onClose: () => void;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const images = listing.imageUrls?.length > 0 ? listing.imageUrls : [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
  ];

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const furnishingLabel =
    listing.furnishing === "full"
      ? "Đầy đủ nội thất cao cấp"
      : listing.furnishing === "basic"
      ? "Nội thất cơ bản"
      : "Nhà trống tự decor";

  return (
    <div
      className="modal-backdrop"
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
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 820,
          maxHeight: "92vh",
          backgroundColor: "var(--color-bg-panel, #ffffff)",
          borderRadius: "var(--radius-lg, 16px)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                padding: "4px 10px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} weight="fill" /> Tin đã xác thực
            </span>
            <span style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
              {listing.propertyName} • Phòng {listing.roomNumber}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "6px 12px", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
              onClick={handleCopyLink}
              title="Sao chép liên kết tin đăng"
            >
              <ShareNetwork size={15} />
              <span>{copiedLink ? "Đã chép!" : "Chia sẻ"}</span>
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "6px 8px", borderRadius: 8 }}
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Gallery */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 380,
                borderRadius: "var(--radius-md, 12px)",
                overflow: "hidden",
                backgroundColor: "#1e293b",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[activeImageIndex]}
                alt={listing.listingTitle}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transition: "opacity 0.2s ease-in-out",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  backgroundColor: "rgba(0, 0, 0, 0.65)",
                  color: "#fff",
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 20,
                  backdropFilter: "blur(4px)",
                }}
              >
                {activeImageIndex + 1} / {images.length} ảnh
              </div>
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: 72,
                      height: 52,
                      borderRadius: 8,
                      overflow: "hidden",
                      border: idx === activeImageIndex ? "2px solid #f97316" : "2px solid transparent",
                      opacity: idx === activeImageIndex ? 1 : 0.6,
                      cursor: "pointer",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`thumb-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Price Header */}
          <div>
            <h1
              style={{
                fontSize: "var(--text-xl, 20px)",
                fontWeight: 700,
                color: "var(--color-fg-1)",
                lineHeight: 1.4,
                marginBottom: 8,
              }}
            >
              {listing.listingTitle}
            </h1>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#dc2626",
                    fontFamily: "var(--font-mono, monospace)",
                  }}
                >
                  {money.format(listing.monthlyRent)}
                </span>
                <span style={{ fontSize: 14, color: "var(--color-fg-3)" }}>/ tháng</span>
              </div>

              {listing.areaM2 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--color-fg-2)",
                    backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.04))",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  <ArrowsOutSimple size={16} />
                  <span>{listing.areaM2} m²</span>
                </div>
              )}

              {listing.floor && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 14,
                    color: "var(--color-fg-2)",
                    backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.04))",
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  <Buildings size={16} />
                  <span>Tầng {listing.floor}</span>
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                color: "var(--color-fg-2)",
              }}
            >
              <MapPin size={17} style={{ color: "#f97316", flexShrink: 0 }} />
              <span>{listing.address}</span>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: 0 }} />

          {/* Quick Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 4 }}>Tình trạng nội thất</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-1)" }}>{furnishingLabel}</div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 4 }}>Tiền điện</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-1)", display: "flex", alignItems: "center", gap: 4 }}>
                <Lightning size={14} style={{ color: "#eab308" }} />
                <span>{listing.electricityRate ? `${formatCurrency(listing.electricityRate)}/kWh` : "3.500đ/kWh"}</span>
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--color-fg-3)", marginBottom: 4 }}>Tiền nước</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--color-fg-1)", display: "flex", alignItems: "center", gap: 4 }}>
                <Drop size={14} style={{ color: "#3b82f6" }} />
                <span>{listing.waterRate ? `${formatCurrency(listing.waterRate)}/m³` : "25.000đ/m³"}</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--color-fg-1)" }}>
              Mô tả chi tiết
            </h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: "var(--color-fg-2)",
                whiteSpace: "pre-line",
              }}
            >
              {listing.listingDescription}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "var(--color-fg-1)" }}>
              Tiện ích căn phòng
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {POPULAR_AMENITIES.map((amenity) => {
                const isAvailable = listing.amenities?.includes(amenity.id);
                return (
                  <div
                    key={amenity.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      backgroundColor: isAvailable ? "rgba(16, 185, 129, 0.08)" : "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                      color: isAvailable ? "var(--color-fg-1)" : "var(--color-fg-3)",
                      opacity: isAvailable ? 1 : 0.5,
                      border: isAvailable ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--color-border)",
                    }}
                  >
                    <CheckCircle
                      size={15}
                      weight={isAvailable ? "fill" : "regular"}
                      style={{ color: isAvailable ? "#10b981" : "var(--color-fg-3)", flexShrink: 0 }}
                    />
                    <span>{amenity.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Contact Action Bar */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-panel, #ffffff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                backgroundColor: "#f97316",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              NT
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Chủ nhà / Quản lý</div>
              <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
                Số điện thoại: {formatPhoneNumber(listing.contactPhone)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a
              href={`https://zalo.me/${listing.contactZalo.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                color: "#0284c7",
                borderColor: "#bae6fd",
                backgroundColor: "#f0f9ff",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <ChatCircleDots size={18} weight="fill" />
              <span>Nhắn Zalo</span>
            </a>

            <a
              href={`tel:${listing.contactPhone}`}
              className="btn-primary"
              style={{
                padding: "10px 22px",
                fontSize: 14,
                fontWeight: 700,
                backgroundColor: "#dc2626",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                boxShadow: "0 2px 10px rgba(220, 38, 38, 0.3)",
              }}
            >
              <Phone size={18} weight="fill" />
              <span>Gọi ngay: {formatPhoneNumber(listing.contactPhone)}</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
