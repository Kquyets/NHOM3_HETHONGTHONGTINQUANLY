"use client";

import { motion } from "motion/react";
import {
  MapPin,
  ArrowsOutSimple,
  Phone,
  ChatCircleDots,
  ShieldCheck,
  Image as ImageIcon,
} from "@phosphor-icons/react";
import type { ExploreListingItem } from "../../modules/explore/explore.types";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function RoomCard({
  listing,
  onSelect,
}: {
  listing: ExploreListingItem;
  onSelect: () => void;
}) {
  const images = listing.imageUrls?.length > 0 ? listing.imageUrls : [
    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
  ];
  const coverImage = images[0];

  const amenityHighlights = listing.amenities?.slice(0, 3).map((a) => {
    switch (a) {
      case "ve_sinh_khep_kin":
        return "Khép kín";
      case "khong_chung_chu":
        return "Không chung chủ";
      case "gac_lung":
        return "Gác lửng";
      case "dieu_hoa":
        return "Điều hòa";
      case "nong_lanh":
        return "Nóng lạnh";
      case "thang_may":
        return "Thang máy";
      case "may_giat":
        return "Máy giặt";
      case "cho_nuoi_pet":
        return "Nuôi pet";
      case "gio_tu_do":
        return "Giờ tự do";
      case "ban_cong":
        return "Ban công";
      default:
        return null;
    }
  }).filter(Boolean);

  return (
    <motion.article
      className="room-card"
      whileHover={{ y: -4, boxShadow: "0 12px 24px -6px rgba(0,0,0,0.12)" }}
      transition={{ duration: 0.2 }}
      style={{
        borderRadius: "var(--radius-md, 12px)",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-panel, #ffffff)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={onSelect}
    >
      {/* Cover Image Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "62%", // 16:10 aspect ratio
          backgroundColor: "#1e293b",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={listing.listingTitle}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
          }}
        />

        {/* Image count pill */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 4,
            backdropFilter: "blur(4px)",
          }}
        >
          <ImageIcon size={12} />
          <span>{images.length}</span>
        </div>

        {/* Verified Ribbon */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "rgba(16, 185, 129, 0.9)",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
            backdropFilter: "blur(4px)",
          }}
        >
          <ShieldCheck size={13} weight="fill" />
          <span>Xác thực</span>
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
        {/* Price & Area Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#dc2626",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {money.format(listing.monthlyRent)}
            </span>
            <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>/tháng</span>
          </div>

          {listing.areaM2 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-fg-2)",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <ArrowsOutSimple size={13} />
              {listing.areaM2} m²
            </span>
          )}
        </div>

        {/* Title (2 lines clamp) */}
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.4,
            color: "var(--color-fg-1)",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            height: 39,
          }}
          title={listing.listingTitle}
        >
          {listing.listingTitle}
        </h3>

        {/* District & City Address */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            color: "var(--color-fg-3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <MapPin size={14} style={{ color: "#f97316", flexShrink: 0 }} />
          <span>
            {listing.district}, {listing.city}
          </span>
        </div>

        {/* Amenity Pills */}
        {amenityHighlights && amenityHighlights.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
            {amenityHighlights.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 4,
                  backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.03))",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-fg-2)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom Contact Buttons */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 10,
            borderTop: "1px solid var(--color-border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={`tel:${listing.contactPhone}`}
            className="btn-primary"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textDecoration: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
            }}
            title={`Gọi cho chủ nhà: ${listing.contactPhone}`}
          >
            <Phone size={13} weight="fill" />
            <span>Gọi ngay</span>
          </a>

          <a
            href={`https://zalo.me/${listing.contactZalo.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              textDecoration: "none",
              color: "#0284c7",
              borderColor: "#bae6fd",
              backgroundColor: "#f0f9ff",
              borderRadius: 6,
            }}
            title="Nhắn tin Zalo"
          >
            <ChatCircleDots size={14} weight="fill" />
            <span>Nhắn Zalo</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}
