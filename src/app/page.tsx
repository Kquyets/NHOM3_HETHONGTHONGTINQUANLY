"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Buildings,
  Door,
  CheckCircle,
  Wrench,
  Plus,
  ArrowRight,
  ChartBar,
  Lightning,
  FileText,
} from "@phosphor-icons/react";

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

/* ── Fade-in-up animation variant ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

/* ── Stat Card ──────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconClass,
  valueClass,
  index,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  iconClass: string;
  valueClass?: string;
  index: number;
}) {
  return (
    <motion.article
      className="stat-card"
      custom={index}
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className={`stat-icon ${iconClass}`}>
        <Icon size={20} weight="fill" />
      </div>
      <span className="stat-label">{label}</span>
      <div className={`stat-value ${valueClass ?? ""}`} aria-live="polite" aria-atomic="true">
        {value}
      </div>
      <span className="stat-sub">{sub}</span>
    </motion.article>
  );
}

/* ── Component ───────────────────────────────────────────────────── */
export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();

  const [properties, setProperties] = useState<PropertyWithRooms[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;

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

        if (isMounted) setProperties(withRooms);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => { isMounted = false; };
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
          /* ── Hero / Welcome ─────────────────────── */
          <motion.section
            className="card"
            style={{ margin: "var(--space-6) auto", maxWidth: 700 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-section">
              {/* Badge */}
              <motion.div
                className="hero-badge"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <Lightning size={12} weight="fill" />
                Quản lý thông minh
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                Nhà Trọ Thông Minh
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28, duration: 0.4 }}
              >
                Giải pháp toàn diện giúp chủ nhà theo dõi phòng trọ,
                khách thuê, chỉ số điện nước và hóa đơn tự động.
              </motion.p>

              <motion.div
                className="hero-actions"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/login" className="btn-primary">
                    Đăng nhập ngay
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/register" className="btn-secondary">
                    Tạo tài khoản
                  </Link>
                </motion.div>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                className="feature-pills"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                {["Quản lý phòng", "Theo dõi điện nước", "Hóa đơn tự động", "Hợp đồng số"].map((f) => (
                  <span key={f} className="feature-pill">
                    <CheckCircle size={10} weight="fill" style={{ color: "var(--color-primary)" }} />
                    {f}
                  </span>
                ))}
              </motion.div>
            </div>
          </motion.section>
        ) : (
          <>
            {/* ── Dashboard Header ─────────────────────── */}
            <motion.div
              className="page-title-row"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div>
                <h1 className="page-title">Tổng quan hệ thống</h1>
                <p className="page-desc">Theo dõi tình trạng các nhà trọ và phòng đang quản lý.</p>
              </div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link href="/properties" className="btn-primary" style={{ padding: "9px 18px" }}>
                  <Plus size={14} weight="bold" />
                  Quản lý nhà &amp; phòng
                </Link>
              </motion.div>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div
                className="alert-error"
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.div>
            )}

            {loading ? (
              /* Skeleton loader */
              <div className="stats-grid" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="stat-card" style={{ minHeight: 130 }}>
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", marginBottom: 12 }} />
                    <div className="skeleton" style={{ width: "60%", height: 11, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: "40%", height: 34, marginBottom: 6 }} />
                    <div className="skeleton" style={{ width: "70%", height: 11 }} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* ── Stat Cards ─────────────────────────── */}
                <section className="stats-grid" aria-label="Thống kê tổng quan">
                  <StatCard label="Nhà trọ" value={properties.length} sub="địa điểm đang quản lý" icon={Buildings} iconClass="teal" index={0} />
                  <StatCard label="Tổng số phòng" value={totalRooms} sub="trên toàn bộ hệ thống" icon={Door} iconClass="teal" index={1} />
                  <StatCard label="Sẵn sàng đón khách" value={readyRooms} sub="phòng đạt tiêu chuẩn" icon={CheckCircle} iconClass="emerald" valueClass="vacant" index={2} />
                  <StatCard label="Đang bảo trì" value={maintenanceRooms} sub="chưa thể cho thuê" icon={Wrench} iconClass="amber" valueClass="maintenance" index={3} />
                </section>

                {/* Quick actions strip */}
                <motion.div
                  style={{ display: "flex", gap: 10, marginBottom: "var(--space-4)", flexWrap: "wrap" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {[
                    { href: "/properties", label: "Quản lý phòng", Icon: Buildings },
                    { href: "/meters", label: "Điện & Nước", Icon: Lightning },
                    { href: "/invoices", label: "Hóa đơn", Icon: FileText },
                    { href: "/", label: "Báo cáo", Icon: ChartBar },
                  ].map(({ href, label, Icon }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.06 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <Link
                        href={href}
                        className="btn-secondary"
                        style={{ fontSize: "var(--text-xs)", padding: "6px 14px", gap: 6 }}
                      >
                        <Icon size={13} />
                        {label}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>

                {/* ── Property List ──────────────────────── */}
                {properties.length === 0 ? (
                  <motion.div
                    className="card"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="empty-state">
                      <div className="empty-icon">
                        <Buildings size={28} />
                      </div>
                      <p className="text-muted" style={{ margin: 0 }}>
                        Bạn chưa có nhà trọ nào trong hệ thống.
                      </p>
                      <Link href="/properties" className="btn-primary">
                        <Plus size={14} weight="bold" />
                        Tạo nhà trọ đầu tiên
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {properties.map((prop, pi) => (
                      <motion.article
                        className="card"
                        key={prop.id}
                        custom={pi}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                      >
                        <header className="card-header">
                          <div>
                            <h2 className="card-title">{prop.name}</h2>
                            <p className="text-muted text-sm" style={{ marginTop: 3 }}>
                              {prop.address ?? "Chưa cập nhật địa chỉ"}
                            </p>
                          </div>
                          <span className="badge ready">
                            <CheckCircle size={11} weight="fill" />
                            {prop.rooms.length} phòng
                          </span>
                        </header>

                        <div className="table-responsive">
                          {prop.rooms.length === 0 ? (
                            <p style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--color-fg-3)", fontSize: "var(--text-sm)" }}>
                              Chưa có phòng nào trong nhà trọ này.
                            </p>
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
                                    <td style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                                      {money.format(room.monthlyRent)}
                                    </td>
                                    <td>
                                      <span className={`badge ${room.status === "ready" ? "ready" : "maintenance"}`}>
                                        {room.status === "ready" ? (
                                          <><CheckCircle size={10} weight="fill" /> Sẵn sàng</>
                                        ) : (
                                          <><Wrench size={10} weight="fill" /> Bảo trì</>
                                        )}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
