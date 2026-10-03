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

        // Fetch rooms for each property in parallel
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

  // Compute overall room counts
  const allRooms = properties.flatMap((p) => p.rooms);
  const totalRooms = allRooms.length;
  const readyRooms = allRooms.filter((r) => r.status === "ready").length;
  const maintenanceRooms = allRooms.filter((r) => r.status === "maintenance").length;

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {!user && !authLoading ? (
          <section className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
            <div className="brand-icon" style={{ margin: "0 auto 16px", width: "48px", height: "48px", fontSize: "24px" }}>
              🏠
            </div>
            <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
              Chào mừng bạn đến với Nhà Trọ Thông Minh
            </h1>
            <p style={{ color: "var(--muted)", maxWidth: "560px", margin: "0 auto 24px", fontSize: "16px" }}>
              Giải pháp toàn diện giúp chủ nhà và quản lý theo dõi phòng trọ, khách thuê,
              chỉ số điện nước và hóa đơn tự động.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link href="/login" className="btn-primary" style={{ width: "auto", padding: "10px 24px" }}>
                Đăng nhập ngay
              </Link>
              <Link
                href="/register"
                className="btn-logout"
                style={{ width: "auto", padding: "10px 24px", background: "white" }}
              >
                Đăng ký tài khoản
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="page-title-row">
              <div>
                <h1 className="page-title">Tổng quan hệ thống</h1>
                <p className="page-desc">Theo dõi tình trạng các nhà trọ và phòng đang quản lý.</p>
              </div>
              <Link
                href="/properties"
                className="btn-primary"
                style={{ width: "auto", padding: "8px 18px", fontSize: "14px" }}
              >
                + Quản lý nhà & phòng
              </Link>
            </div>

            {error && <div className="alert-error">{error}</div>}

            {loading ? (
              <div className="loading-indicator">Đang tải dữ liệu tổng quan...</div>
            ) : (
              <>
                <section className="stats-grid">
                  <article className="stat-card">
                    <span className="stat-label">Nhà trọ</span>
                    <div className="stat-value">{properties.length}</div>
                    <span className="stat-sub">địa điểm đang quản lý</span>
                  </article>
                  <article className="stat-card">
                    <span className="stat-label">Tổng số phòng</span>
                    <div className="stat-value">{totalRooms}</div>
                    <span className="stat-sub">trên toàn bộ hệ thống</span>
                  </article>
                  <article className="stat-card vacant">
                    <span className="stat-label">Sẵn sàng đón khách</span>
                    <div className="stat-value">{readyRooms}</div>
                    <span className="stat-sub">phòng đạt tiêu chuẩn</span>
                  </article>
                  <article className="stat-card maintenance">
                    <span className="stat-label">Đang bảo trì</span>
                    <div className="stat-value">{maintenanceRooms}</div>
                    <span className="stat-sub">chưa thể cho thuê</span>
                  </article>
                </section>

                {properties.length === 0 ? (
                  <div className="card card-body" style={{ textAlign: "center", padding: "48px 24px" }}>
                    <p style={{ color: "var(--muted)", margin: "0 0 16px" }}>
                      Bạn chưa có nhà trọ nào trong hệ thống.
                    </p>
                    <Link
                      href="/properties"
                      className="btn-primary"
                      style={{ width: "auto", display: "inline-block", padding: "8px 20px" }}
                    >
                      Tạo nhà trọ đầu tiên
                    </Link>
                  </div>
                ) : (
                  properties.map((prop) => (
                    <article className="card" key={prop.id}>
                      <header className="card-header">
                        <div>
                          <h2 className="card-title">{prop.name}</h2>
                          <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                            {prop.address ?? "Chưa cập nhật địa chỉ"}
                          </p>
                        </div>
                        <span className="badge ready">{prop.rooms.length} phòng</span>
                      </header>

                      <div className="table-responsive">
                        {prop.rooms.length === 0 ? (
                          <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
                            Chưa có phòng nào trong nhà trọ này.
                          </div>
                        ) : (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Số phòng</th>
                                <th>Diện tích</th>
                                <th>Giá thuê / tháng</th>
                                <th>Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {prop.rooms.map((room) => (
                                <tr key={room.id}>
                                  <td style={{ fontWeight: 600 }}>Phòng {room.roomNumber}</td>
                                  <td>{room.areaM2 ? `${room.areaM2} m²` : "—"}</td>
                                  <td>{money.format(room.monthlyRent)}</td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        room.status === "ready" ? "ready" : "maintenance"
                                      }`}
                                    >
                                      {room.status === "ready" ? "Sẵn sàng" : "Bảo trì"}
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
