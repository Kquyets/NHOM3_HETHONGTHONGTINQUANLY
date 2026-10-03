"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AppHeader } from "../components/layout/app-header";
import { apiClient } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { PropertyRow } from "../modules/properties/property.service";
import type { RoomRow } from "../modules/rooms/room.service";

type PropertyWithRooms = PropertyRow & {
  rooms: RoomRow[];
};

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/* ── Inline SVG icons ─────────────────────────────────────────────── */
function IconBuilding() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm-1.5 14.5l-4-4 1.41-1.41L10.5 13.67l5.59-5.59L17.5 9.5l-7 7z"/>
    </svg>
  );
}

function IconTool() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
    </svg>
  );
}

function IconLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 8.5V20a1 1 0 001 1h5v-6h8v6h5a1 1 0 001-1V8.5L12 2z"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [properties, setProperties] = useState<PropertyWithRooms[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let isMounted = true;

    async function loadData() {
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
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const allRooms = properties.flatMap((p) => p.rooms);
  const totalRooms = allRooms.length;
  const readyRooms = allRooms.filter((r) => r.status === "ready").length;
  const maintenanceRooms = allRooms.filter((r) => r.status === "maintenance").length;

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {!user && !authLoading ? (
          /* ── Hero / Welcome ─────────────────────────────────── */
          <section className="card" style={{ margin: "var(--space-6) auto", maxWidth: "680px" }}>
            <div className="hero-section">
              <div style={{
                width: 64,
                height: 64,
                background: "var(--color-primary)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-3)",
                boxShadow: "0 8px 24px rgba(15, 118, 110, 0.25)",
                color: "white",
              }}>
                <IconLogo />
              </div>

              <h1>Nhà Trọ Thông Minh</h1>
              <p>
                Giải pháp toàn diện giúp chủ nhà và quản lý theo dõi phòng trọ,
                khách thuê, chỉ số điện nước và hóa đơn tự động.
              </p>

              <div className="hero-actions">
                <Link href="/login" className="btn-primary">
                  Đăng nhập ngay
                </Link>
                <Link href="/register" className="btn-secondary">
                  Tạo tài khoản miễn phí
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ── Dashboard Header ─────────────────────────── */}
            <div className="page-title-row">
              <div>
                <h1 className="page-title">Tổng quan hệ thống</h1>
                <p className="page-desc">Theo dõi tình trạng các nhà trọ và phòng đang quản lý.</p>
              </div>
              <Link
                href="/properties"
                className="btn-primary"
                style={{ padding: "8px 16px" }}
              >
                <IconPlus />
                Quản lý nhà &amp; phòng
              </Link>
            </div>

            {error && (
              <div className="alert-error" role="alert">{error}</div>
            )}

            {loading ? (
              <div className="loading-indicator">
                <span className="spinner" role="status" aria-label="Đang tải" />
                Đang tải dữ liệu tổng quan...
              </div>
            ) : (
              <>
                {/* ── Stat Cards ─────────────────────────── */}
                <section className="stats-grid" aria-label="Thống kê tổng quan">
                  <article className="stat-card">
                    <span className="stat-label">Nhà trọ</span>
                    <div className="stat-value" aria-live="polite" aria-atomic="true">
                      {properties.length}
                    </div>
                    <span className="stat-sub">địa điểm đang quản lý</span>
                  </article>

                  <article className="stat-card">
                    <span className="stat-label">Tổng số phòng</span>
                    <div className="stat-value" aria-live="polite" aria-atomic="true">
                      {totalRooms}
                    </div>
                    <span className="stat-sub">trên toàn bộ hệ thống</span>
                  </article>

                  <article className="stat-card vacant">
                    <span className="stat-label">Sẵn sàng đón khách</span>
                    <div className="stat-value" aria-live="polite" aria-atomic="true">
                      {readyRooms}
                    </div>
                    <span className="stat-sub">phòng đạt tiêu chuẩn</span>
                  </article>

                  <article className="stat-card maintenance">
                    <span className="stat-label">Đang bảo trì</span>
                    <div className="stat-value" aria-live="polite" aria-atomic="true">
                      {maintenanceRooms}
                    </div>
                    <span className="stat-sub">chưa thể cho thuê</span>
                  </article>
                </section>

                {/* ── Property List ──────────────────────── */}
                {properties.length === 0 ? (
                  <div className="card">
                    <div className="card-body" style={{ textAlign: "center", padding: "var(--space-6) var(--space-3)" }}>
                      <div style={{ color: "var(--color-border)", marginBottom: "var(--space-2)" }}>
                        <IconBuilding />
                      </div>
                      <p style={{ color: "var(--color-muted-fg)", marginBottom: "var(--space-2)" }}>
                        Bạn chưa có nhà trọ nào trong hệ thống.
                      </p>
                      <Link
                        href="/properties"
                        className="btn-primary"
                        style={{ display: "inline-flex" }}
                      >
                        <IconPlus />
                        Tạo nhà trọ đầu tiên
                      </Link>
                    </div>
                  </div>
                ) : (
                  properties.map((prop) => (
                    <article className="card" key={prop.id}>
                      <header className="card-header">
                        <div>
                          <h2 className="card-title">{prop.name}</h2>
                          <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                            {prop.address ?? "Chưa cập nhật địa chỉ"}
                          </p>
                        </div>
                        <span
                          className="badge ready"
                          role="status"
                          aria-label={`${prop.rooms.length} phòng`}
                        >
                          <IconCheckCircle />
                          {prop.rooms.length} phòng
                        </span>
                      </header>

                      <div className="table-responsive">
                        {prop.rooms.length === 0 ? (
                          <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--color-muted-fg)", fontSize: "var(--text-sm)" }}>
                            Chưa có phòng nào trong nhà trọ này.
                          </div>
                        ) : (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th scope="col">Số phòng</th>
                                <th scope="col">Diện tích</th>
                                <th scope="col">Giá thuê / tháng</th>
                                <th scope="col">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prop.rooms.map((room) => (
                                <tr key={room.id}>
                                  <td style={{ fontWeight: 600 }}>Phòng {room.roomNumber}</td>
                                  <td className="text-muted">{room.areaM2 ? `${room.areaM2} m²` : "—"}</td>
                                  <td style={{ fontVariantNumeric: "tabular-nums" }}>
                                    {money.format(room.monthlyRent)}
                                  </td>
                                  <td>
                                    <span className={`badge ${room.status === "ready" ? "ready" : "maintenance"}`}>
                                      {room.status === "ready" ? (
                                        <><IconCheckCircle /> Sẵn sàng</>
                                      ) : (
                                        <><IconTool /> Bảo trì</>
                                      )}
                                    </span>
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
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
