"use client";

import { useEffect, useState } from "react";

import {
  fetchDashboardOverview,
  getDemoViewData,
  type DashboardViewData,
} from "./overview-data";

const statusLabels = {
  vacant: "Còn trống",
  occupied: "Đang thuê",
  maintenance: "Bảo trì",
} as const;

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function Home() {
  const [data, setData] = useState<DashboardViewData>(() => getDemoViewData());
  const [loading, setLoading] = useState<boolean>(() => Boolean(process.env.NEXT_PUBLIC_API_URL));
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      return;
    }

    let active = true;

    async function loadData() {
      try {
        const result = await fetchDashboardOverview(window.fetch.bind(window), {
          apiUrl,
          token: process.env.NEXT_PUBLIC_API_TOKEN,
        });
        if (active) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Không thể tải dữ liệu từ API.");
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [retryKey]);

  const counts = data.counts;

  return (
    <main className="dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">TỔNG QUAN</p>
          <h1>Quản lý nhà trọ</h1>
          <p className="subtitle">Theo dõi tình trạng nhà và phòng trong hệ thống.</p>
        </div>
        <span className={`demo-badge ${data.source === "api" ? "live" : ""}`}>
          {data.source === "api" ? "Dữ liệu API" : "Dữ liệu demo"}
        </span>
      </header>

      {loading && (
        <section className="state-card loading" role="status">
          <p className="state-title">Đang kết nối API...</p>
          <p className="state-message">Đang lấy dữ liệu tổng quan nhà trọ từ máy chủ.</p>
        </section>
      )}

      {error && (
        <section className="state-card error" role="alert">
          <div>
            <p className="state-title">Lỗi kết nối máy chủ</p>
            <p className="state-message">{error}</p>
          </div>
          <div className="state-actions">
            <button
              type="button"
              className="btn-retry"
              onClick={() => {
                setError(null);
                setLoading(true);
                setRetryKey((prev) => prev + 1);
              }}
            >
              Thử lại
            </button>
            <button
              type="button"
              className="btn-fallback"
              onClick={() => {
                setError(null);
                setLoading(false);
                setData(getDemoViewData());
              }}
            >
              Xem dữ liệu demo
            </button>
          </div>
        </section>
      )}

      <section className="summary-grid" aria-label="Tổng quan hệ thống">
        <article className="summary-card">
          <span className="summary-label">Nhà trọ</span>
          <strong>{data.propertyCount}</strong>
          <span className="summary-detail">địa điểm đang quản lý</span>
        </article>
        <article className="summary-card">
          <span className="summary-label">Tổng số phòng</span>
          <strong>{counts.total}</strong>
          <span className="summary-detail">trên tất cả nhà trọ</span>
        </article>
        <article className="summary-card accent-vacant">
          <span className="summary-label">Còn trống</span>
          <strong>{counts.vacant}</strong>
          <span className="summary-detail">sẵn sàng cho thuê</span>
        </article>
        <article className="summary-card accent-occupied">
          <span className="summary-label">Đang thuê</span>
          <strong>{counts.occupied}</strong>
          <span className="summary-detail">phòng có người ở</span>
        </article>
        <article className="summary-card accent-maintenance">
          <span className="summary-label">Bảo trì</span>
          <strong>{counts.maintenance}</strong>
          <span className="summary-detail">chưa sẵn sàng cho thuê</span>
        </article>
      </section>

      <section className="properties-section" aria-labelledby="properties-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DANH SÁCH</p>
            <h2 id="properties-heading">Nhà trọ và phòng</h2>
          </div>
          <div className="status-legend" aria-label="Chú giải trạng thái">
            {Object.entries(statusLabels).map(([status, label]) => (
              <span className="legend-item" key={status}>
                <i className={`status-dot ${status}`} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {!loading && data.properties.length === 0 && (
          <div className="state-card empty" role="status">
            <p className="state-title">Chưa có nhà trọ nào</p>
            <p className="state-message">Hiện chưa có dữ liệu nhà trọ nào trong hệ thống.</p>
          </div>
        )}

        {data.properties.map(({ property, rooms, roomCount }) => (
          <article className="property-card" key={property.id}>
            <div className="property-heading">
              <div>
                <h3>{property.name}</h3>
                <p>{property.address}</p>
              </div>
              <span className="room-count">{roomCount} phòng</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Phòng</th>
                    <th scope="col">Giá thuê / tháng</th>
                    <th scope="col">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => (
                    <tr key={room.id}>
                      <th scope="row">Phòng {room.roomNumber}</th>
                      <td>{money.format(room.monthlyRent)}</td>
                      <td>
                        <span className={`status-pill ${room.status}`}>
                          <i className={`status-dot ${room.status}`} aria-hidden="true" />
                          {statusLabels[room.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
