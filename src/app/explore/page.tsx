"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  MapPin,
  SlidersHorizontal,
  Plus,
  ArrowsDownUp,
  X,
  Buildings,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { RoomCard } from "../../components/explore/room-card";
import { RoomDetailModal } from "../../components/explore/room-detail-modal";
import { useAuth } from "../../lib/auth-context";
import { apiClient } from "../../lib/api-client";
import type {
  ExploreFilter,
  ExploreListingItem,
  ExploreSearchResult,
  FurnishingType,
} from "../../modules/explore/explore.types";
import { POPULAR_AMENITIES, VIETNAM_CITIES } from "../../modules/explore/explore.types";
import { DEMO_EXPLORE_LISTINGS } from "../../modules/explore/explore-demo-data";
import { filterInMemoryListings } from "../../modules/explore/explore-filter";

const PRICE_CHIPS = [
  { id: "all", label: "Tất cả giá" },
  { id: "<1m", label: "Dưới 1 triệu" },
  { id: "1-2m", label: "1 - 2 triệu" },
  { id: "2-3m", label: "2 - 3 triệu" },
  { id: "3-5m", label: "3 - 5 triệu" },
  { id: "5-7m", label: "5 - 7 triệu" },
  { id: ">7m", label: "Trên 7 triệu" },
] as const;

const AREA_OPTIONS = [
  { id: "all", label: "Tất cả diện tích" },
  { id: "<20", label: "Dưới 20 m²" },
  { id: "20-30", label: "20 - 30 m²" },
  { id: "30-50", label: "30 - 50 m²" },
  { id: ">50", label: "Trên 50 m²" },
] as const;

export default function ExplorePage() {
  const { user } = useAuth();
  const [, startTransition] = useTransition();

  // Filters state
  const [city, setCity] = useState<string>("Hà Nội");
  const [district, setDistrict] = useState<string>("all");
  const [priceBand, setPriceBand] = useState<string>("all");
  const [areaBand, setAreaBand] = useState<string>("all");
  const [furnishing, setFurnishing] = useState<FurnishingType | "all">("all");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<ExploreFilter["sortBy"]>("newest");
  const [page, setPage] = useState<number>(1);

  // Data & Modal state
  const [results, setResults] = useState<ExploreSearchResult>(() =>
    filterInMemoryListings(DEMO_EXPLORE_LISTINGS, { city: "Hà Nội" }),
  );
  const [loading, setLoading] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ExploreListingItem | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Available districts for current city
  const availableDistricts = city && city !== "all" && VIETNAM_CITIES[city] ? VIETNAM_CITIES[city] : [];

  // Fetch or filter listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (city && city !== "all") params.set("city", city);
      if (district && district !== "all") params.set("district", district);
      if (priceBand && priceBand !== "all") params.set("priceBand", priceBand);
      if (areaBand && areaBand !== "all") params.set("areaBand", areaBand);
      if (furnishing && furnishing !== "all") params.set("furnishing", furnishing);
      if (selectedAmenities.length > 0) params.set("amenities", selectedAmenities.join(","));
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (sortBy) params.set("sortBy", sortBy);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await apiClient<ExploreSearchResult>(`/api/explore?${params.toString()}`);
      if (res && res.items) {
        setResults(res);
      } else {
        // Fallback in-memory
        setResults(
          filterInMemoryListings(DEMO_EXPLORE_LISTINGS, {
            city: city !== "all" ? city : undefined,
            district: district !== "all" ? district : undefined,
            priceBand: priceBand !== "all" ? (priceBand as ExploreFilter["priceBand"]) : undefined,
            areaBand: areaBand !== "all" ? (areaBand as ExploreFilter["areaBand"]) : undefined,
            furnishing: furnishing !== "all" ? furnishing : undefined,
            amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
            search: searchTerm,
            sortBy,
            page,
            limit: 12,
          }),
        );
      }
    } catch {
      // Fallback
      setResults(
        filterInMemoryListings(DEMO_EXPLORE_LISTINGS, {
          city: city !== "all" ? city : undefined,
          district: district !== "all" ? district : undefined,
          priceBand: priceBand !== "all" ? (priceBand as ExploreFilter["priceBand"]) : undefined,
          areaBand: areaBand !== "all" ? (areaBand as ExploreFilter["areaBand"]) : undefined,
          furnishing: furnishing !== "all" ? furnishing : undefined,
          amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
          search: searchTerm,
          sortBy,
          page,
          limit: 12,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [city, district, priceBand, areaBand, furnishing, selectedAmenities, searchTerm, sortBy, page]);

  useEffect(() => {
    startTransition(() => {
      void fetchListings();
    });
  }, [fetchListings]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    setDistrict("all");
    setPage(1);
  };

  const handleToggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId],
    );
    setPage(1);
  };

  const handleResetFilters = () => {
    setDistrict("all");
    setPriceBand("all");
    setAreaBand("all");
    setFurnishing("all");
    setSelectedAmenities([]);
    setSearchTerm("");
    setSortBy("newest");
    setPage(1);
  };

  const hasActiveFilters =
    district !== "all" ||
    priceBand !== "all" ||
    areaBand !== "all" ||
    furnishing !== "all" ||
    selectedAmenities.length > 0 ||
    searchTerm.trim().length > 0;

  return (
    <div className="app-shell" style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-base)" }}>
      <AppHeader />

      <main className="main-container" style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px" }}>
        {/* ── Top Hero & Search Bar Header ─────────────────────── */}
        <section
          style={{
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(234, 88, 12, 0.02) 100%)",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "24px 20px",
            marginBottom: 20,
            border: "1px solid rgba(249, 115, 22, 0.2)",
          }}
        >
          {/* City Tabs & Post button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {["Hà Nội", "TP. Hồ Chí Minh", "all"].map((c) => {
                const label = c === "all" ? "Toàn quốc" : c;
                const isSelected = city === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCityChange(c)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 99,
                      fontSize: 14,
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? "#ea580c" : "var(--color-bg-panel, #ffffff)",
                      color: isSelected ? "#ffffff" : "var(--color-fg-1)",
                      border: isSelected ? "1px solid #ea580c" : "1px solid var(--color-border)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: isSelected ? "0 2px 8px rgba(234, 88, 12, 0.25)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <MapPin size={15} weight={isSelected ? "fill" : "regular"} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* + Đăng tin CTA */}
            <Link
              href={user ? "/properties" : "/login?redirect=/properties"}
              style={{
                padding: "8px 18px",
                borderRadius: 99,
                fontSize: 14,
                fontWeight: 700,
                backgroundColor: "#ea580c",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
                boxShadow: "0 3px 12px rgba(234, 88, 12, 0.35)",
              }}
            >
              <Plus size={16} weight="bold" />
              <span>ĐĂNG TIN PHÒNG TRỌ</span>
            </Link>
          </div>

          {/* Search Box & District Selector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: availableDistricts.length > 0 ? "1fr 220px auto" : "1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-fg-3)",
                  pointerEvents: "none",
                  display: "flex",
                }}
              >
                <MagnifyingGlass size={18} />
              </span>
              <input
                type="text"
                className="form-control"
                style={{
                  paddingLeft: 42,
                  paddingRight: searchTerm ? 36 : 14,
                  height: 44,
                  fontSize: 14,
                  backgroundColor: "var(--color-bg-panel, #ffffff)",
                  borderRadius: 10,
                }}
                placeholder="Tìm theo đường, phường, quận, tên tòa nhà (VD: Dịch Vọng Hậu, Chùa Láng...)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--color-fg-3)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  aria-label="Xóa từ khóa"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* District Dropdown */}
            {availableDistricts.length > 0 && (
              <select
                className="form-control"
                style={{
                  height: 44,
                  fontSize: 14,
                  backgroundColor: "var(--color-bg-panel, #ffffff)",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả Quận / Huyện</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              className={`btn-secondary ${showAdvancedFilters ? "active" : ""}`}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 14,
              }}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <SlidersHorizontal size={17} />
              <span>Bộ lọc nâng cao</span>
              {hasActiveFilters && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#ea580c",
                  }}
                />
              )}
            </button>
          </div>

          {/* Quick Price Filter Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingTop: 14,
              marginTop: 10,
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-3)", whiteSpace: "nowrap" }}>
              Khoảng giá:
            </span>
            {PRICE_CHIPS.map((chip) => {
              const isActive = priceBand === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setPriceBand(chip.id);
                    setPage(1);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? "#fee2e2" : "var(--color-bg-panel, #ffffff)",
                    color: isActive ? "#dc2626" : "var(--color-fg-2)",
                    border: isActive ? "1px solid #f87171" : "1px solid var(--color-border)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Advanced Filter Collapse Bar ─────────────────────── */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                backgroundColor: "var(--color-bg-panel, #ffffff)",
                borderRadius: "var(--radius-md, 12px)",
                border: "1px solid var(--color-border)",
                padding: "20px",
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
                {/* Area filter */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-2)", display: "block", marginBottom: 6 }}>
                    Diện tích phòng
                  </label>
                  <select
                    className="form-control"
                    value={areaBand}
                    onChange={(e) => {
                      setAreaBand(e.target.value);
                      setPage(1);
                    }}
                  >
                    {AREA_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Furnishing filter */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-2)", display: "block", marginBottom: 6 }}>
                    Tình trạng nội thất
                  </label>
                  <select
                    className="form-control"
                    value={furnishing}
                    onChange={(e) => {
                      setFurnishing(e.target.value as FurnishingType | "all");
                      setPage(1);
                    }}
                  >
                    <option value="all">Tất cả nội thất</option>
                    <option value="full">Đầy đủ nội thất</option>
                    <option value="basic">Nội thất cơ bản</option>
                    <option value="empty">Nhà trống</option>
                  </select>
                </div>

                {/* Sorting option */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-2)", display: "block", marginBottom: 6 }}>
                    Sắp xếp theo
                  </label>
                  <select
                    className="form-control"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ExploreFilter["sortBy"])}
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="price_asc">Giá thấp đến cao</option>
                    <option value="price_desc">Giá cao đến thấp</option>
                    <option value="area_desc">Diện tích lớn nhất</option>
                  </select>
                </div>
              </div>

              {/* Amenities checkboxes */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-fg-2)", display: "block", marginBottom: 8 }}>
                  Tiện ích nổi bật (chọn để lọc)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {POPULAR_AMENITIES.map((amenity) => {
                    const isSelected = selectedAmenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => handleToggleAmenity(amenity.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          backgroundColor: isSelected ? "rgba(16, 185, 129, 0.15)" : "var(--color-bg-subtle, rgba(0,0,0,0.03))",
                          color: isSelected ? "#059669" : "var(--color-fg-2)",
                          border: isSelected ? "1px solid #10b981" : "1px solid var(--color-border)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span>{amenity.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset button */}
              {hasActiveFilters && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={handleResetFilters}
                  >
                    <X size={14} />
                    <span>Xóa toàn bộ bộ lọc</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Section Title & Count ─────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "var(--text-lg, 18px)",
                fontWeight: 700,
                color: "var(--color-fg-1)",
                margin: 0,
              }}
            >
              Cho thuê phòng trọ {city !== "all" ? city : "toàn quốc"}
              {district !== "all" ? `, Quận ${district}` : ""}
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-fg-3)", margin: "4px 0 0 0" }}>
              Hiện có <strong style={{ color: "var(--color-fg-1)" }}>{results.total}</strong> phòng trọ phù hợp tiêu chí
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
              <ArrowsDownUp size={14} /> Sắp xếp:
            </span>
            <select
              className="form-control"
              style={{ height: 34, fontSize: 13, width: "auto" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ExploreFilter["sortBy"])}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="area_desc">Diện tích lớn nhất</option>
            </select>
          </div>
        </div>

        {/* ── Results Feed Grid ─────────────────────────────────── */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: 340,
                  borderRadius: "var(--radius-md, 12px)",
                }}
              />
            ))}
          </div>
        ) : results.items.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              backgroundColor: "var(--color-bg-panel, #ffffff)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px dashed var(--color-border)",
            }}
          >
            <Buildings size={48} style={{ color: "var(--color-fg-3)", margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Không tìm thấy phòng trọ nào phù hợp
            </h3>
            <p style={{ fontSize: 14, color: "var(--color-fg-3)", maxWidth: 440, margin: "0 auto 16px" }}>
              Hãy thử bỏ bớt một số điều kiện lọc (khoảng giá, diện tích hoặc tiện ích) để xem nhiều kết quả hơn.
            </p>
            <button type="button" className="btn-primary" onClick={handleResetFilters}>
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {results.items.map((listing) => (
              <RoomCard
                key={listing.id}
                listing={listing}
                onSelect={() => setSelectedListing(listing)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {results.totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginTop: 32,
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ padding: "6px 14px", fontSize: 13 }}
            >
              Trang trước
            </button>

            <span style={{ fontSize: 13, color: "var(--color-fg-2)", padding: "0 8px" }}>
              Trang <strong>{page}</strong> / {results.totalPages}
            </span>

            <button
              type="button"
              className="btn-secondary"
              disabled={page >= results.totalPages}
              onClick={() => {
                setPage((p) => Math.min(results.totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{ padding: "6px 14px", fontSize: 13 }}
            >
              Trang sau
            </button>
          </div>
        )}
      </main>

      {/* ── Room Detail Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedListing && (
          <RoomDetailModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
