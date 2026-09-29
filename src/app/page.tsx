import { demoProperties, demoRooms, getRoomCounts } from "./demo-data";

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
  const counts = getRoomCounts(demoRooms);

  return (
    <main className="dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">TỔNG QUAN</p>
          <h1>Quản lý nhà trọ</h1>
          <p className="subtitle">Theo dõi tình trạng nhà và phòng trong hệ thống.</p>
        </div>
        <span className="demo-badge">Dữ liệu demo</span>
      </header>

      <section className="summary-grid" aria-label="Tổng quan hệ thống">
        <article className="summary-card">
          <span className="summary-label">Nhà trọ</span>
          <strong>{demoProperties.length}</strong>
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

        {demoProperties.map((property) => {
          const rooms = demoRooms.filter((room) => room.propertyId === property.id);
          const propertyCounts = getRoomCounts(rooms);

          return (
            <article className="property-card" key={property.id}>
              <div className="property-heading">
                <div>
                  <h3>{property.name}</h3>
                  <p>{property.address}</p>
                </div>
                <span className="room-count">{propertyCounts.total} phòng</span>
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
          );
        })}
      </section>
    </main>
  );
}
