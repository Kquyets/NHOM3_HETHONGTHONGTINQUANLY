"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Sparkle,
  ArrowRight,
  CheckCircle,
  XCircle,
  Buildings,
  Lightning,
  Users,
  Receipt,
  ShieldCheck,
  ChartLineUp,
  Clock,
  DeviceMobile,
  Check,
} from "@phosphor-icons/react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

export function LandingPage() {
  return (
    <div className="landing-wrapper">
      {/* ── Ambient Home Background Layer (Soft Blur) ─────────── */}
      <div className="landing-bg-layer" aria-hidden="true" />

      <div className="landing-content-layer">
        {/* ── 1. Hero Section ───────────────────────────────────── */}
        <section className="landing-hero">
          {/* Hero Vignette Backdrop with Soft Blur */}
          <div className="landing-hero-backdrop" aria-hidden="true" />

          {/* Pill Badge */}
          <motion.div
            className="landing-pill"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Sparkle size={14} weight="fill" />
          <span>Giải pháp số 1 cho chủ nhà trọ &amp; căn hộ cho thuê</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          className="landing-hero-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Quản lý nhà trọ thông minh,
          <br />
          tự động hóa &amp; tiết kiệm 90% thời gian
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          className="landing-hero-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Thay thế sổ sách và bảng tính Excel phức tạp. Tự động tính tiền điện nước,
          quản lý hợp đồng khách thuê và phát hành hóa đơn chuyên nghiệp chỉ với một chạm.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          className="landing-cta-group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="btn-primary"
              style={{ padding: "12px 28px", fontSize: 15 }}
            >
              Dùng thử miễn phí ngay
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/login"
              className="btn-secondary"
              style={{ padding: "12px 24px", fontSize: 15 }}
            >
              Đăng nhập hệ thống
            </Link>
          </motion.div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          className="landing-trust-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <span className="landing-trust-item">
            <CheckCircle size={15} weight="fill" style={{ color: "var(--color-primary)" }} />
            Không cần cài đặt
          </span>
          <span className="landing-trust-item">
            <CheckCircle size={15} weight="fill" style={{ color: "var(--color-primary)" }} />
            Tự động chốt điện nước
          </span>
          <span className="landing-trust-item">
            <CheckCircle size={15} weight="fill" style={{ color: "var(--color-primary)" }} />
            Hóa đơn &amp; QR chuẩn xác
          </span>
          <span className="landing-trust-item">
            <CheckCircle size={15} weight="fill" style={{ color: "var(--color-primary)" }} />
            Bảo mật đám mây 100%
          </span>
        </motion.div>

        {/* ── High-Fidelity App Preview Frame ─────────────────── */}
        <motion.div
          className="landing-preview-frame"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <div className="preview-window-header">
            <div className="preview-dot red" />
            <div className="preview-dot yellow" />
            <div className="preview-dot green" />
            <div className="preview-window-title">
              app.nhatrothongminh.vn — Bảng điều khiển quản lý nhà trọ
            </div>
          </div>

          <div className="preview-window-body">
            {/* Mock Top bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Dãy Trọ An Cư • Cơ sở Cầu Giấy</div>
                <div style={{ fontSize: 12.5, color: "var(--color-fg-3)" }}>
                  Tổng cộng: 16 phòng • Đang thuê: 15 phòng (94%)
                </div>
              </div>
              <span className="badge ready">Hệ thống đang hoạt động</span>
            </div>

            {/* Mock Stats */}
            <div className="preview-metrics-grid">
              <div className="preview-metric-box">
                <div className="label">Doanh thu tháng này</div>
                <div className="val" style={{ color: "var(--color-primary)" }}>48.500.000 ₫</div>
              </div>
              <div className="preview-metric-box">
                <div className="label">Tỷ lệ lấp đầy</div>
                <div className="val" style={{ color: "var(--color-success)" }}>93.8%</div>
              </div>
              <div className="preview-metric-box">
                <div className="label">Chỉ số điện &amp; nước</div>
                <div className="val">16/16 Đã chốt</div>
              </div>
              <div className="preview-metric-box">
                <div className="label">Hóa đơn đã thu</div>
                <div className="val" style={{ color: "var(--color-success)" }}>14/15 phòng</div>
              </div>
            </div>

            {/* Mock Rooms Grid */}
            <div className="preview-rooms-row">
              <div className="preview-room-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Phòng 101 (Tầng 1)</span>
                  <span className="badge ready" style={{ fontSize: 11 }}>Đã thanh toán</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-2)" }}>Nguyễn Văn An • 3.200.000 ₫</div>
                <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                  Điện: 142 kWh • Nước: 8 m³
                </div>
              </div>

              <div className="preview-room-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Phòng 102 (Tầng 1)</span>
                  <span className="badge ready" style={{ fontSize: 11 }}>Đã thanh toán</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-2)" }}>Trần Thị Mai • 3.500.000 ₫</div>
                <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                  Điện: 185 kWh • Nước: 10 m³
                </div>
              </div>

              <div className="preview-room-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Phòng 103 (Tầng 1)</span>
                  <span className="badge maintenance" style={{ fontSize: 11 }}>Chờ chuyển khoản</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-2)" }}>Lê Hoàng Nam • 3.200.000 ₫</div>
                <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                  Hạn đóng: Hôm nay • Đã gửi QR
                </div>
              </div>

              <div className="preview-room-item">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Phòng 201 (Tầng 2)</span>
                  <span className="badge occupied" style={{ fontSize: 11 }}>Phòng trống</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--color-fg-2)" }}>Giá niêm yết: 3.800.000 ₫</div>
                <div style={{ fontSize: 11.5, color: "var(--color-fg-3)", marginTop: 4 }}>
                  25 m² • Ban công riêng • Máy lạnh
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 2. Metric Counters Strip ──────────────────────────── */}
      <section className="landing-metrics-bar">
        <div className="landing-metric-item">
          <div className="landing-metric-stat">10.000+</div>
          <div className="landing-metric-label">Phòng trọ &amp; căn hộ đang quản lý</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-stat">90%</div>
          <div className="landing-metric-label">Thời gian quản lý được cắt giảm</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-stat">100%</div>
          <div className="landing-metric-label">Tự động hóa tính toán hóa đơn</div>
        </div>
        <div className="landing-metric-item">
          <div className="landing-metric-stat">99.8%</div>
          <div className="landing-metric-label">Khách thuê hài lòng &amp; minh bạch</div>
        </div>
      </section>

      {/* ── 3. Core Feature Modules ───────────────────────────── */}
      <section id="features" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Tính năng toàn diện</span>
          <h2 className="landing-section-title">
            Bộ công cụ số hóa hoàn chỉnh cho chủ nhà
          </h2>
          <p className="landing-section-desc">
            Được thiết kế tinh gọn, trực quan, phục vụ đầy đủ mọi nghiệp vụ vận hành thực tế
            từ lúc khách vào ở đến khi kết thúc hợp đồng.
          </p>
        </div>

        <div className="landing-features-grid">
          {/* Card 1: Quản lý Nhà & Phòng */}
          <motion.div
            className="landing-feature-card"
            custom={0}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="landing-feature-icon">
              <Buildings size={24} weight="fill" />
            </div>
            <h3 className="landing-feature-title">Quản lý Nhà &amp; Phòng Trọ</h3>
            <p className="landing-feature-text">
              Phân tầng tòa nhà khoa học, theo dõi trạng thái phòng trống, đang thuê hay bảo trì theo thời gian thực.
            </p>
            <ul className="landing-feature-bullets">
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Sơ đồ phòng trực quan, lọc nhanh</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Quản lý diện tích &amp; giá thuê từng phòng</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Kiểm kê tài sản và thiết bị bàn giao</li>
            </ul>
          </motion.div>

          {/* Card 2: Chốt Điện & Nước */}
          <motion.div
            className="landing-feature-card"
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="landing-feature-icon">
              <Lightning size={24} weight="fill" />
            </div>
            <h3 className="landing-feature-title">Chốt Chỉ Số Điện &amp; Nước</h3>
            <p className="landing-feature-text">
              Nhập chỉ số nhanh trên máy tính hoặc điện thoại. Hệ thống tự trừ số cũ và áp bảng giá chuẩn xác.
            </p>
            <ul className="landing-feature-bullets">
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Lưu lịch sử chỉ số từng tháng</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Cảnh báo khi có mức tiêu thụ bất thường</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Đơn giá điện nước tùy biến linh hoạt</li>
            </ul>
          </motion.div>

          {/* Card 3: Khách Thuê & Hợp Đồng */}
          <motion.div
            className="landing-feature-card"
            custom={2}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="landing-feature-icon">
              <Users size={24} weight="fill" />
            </div>
            <h3 className="landing-feature-title">Khách Thuê &amp; Hợp Đồng Số</h3>
            <p className="landing-feature-text">
              Lưu trữ hồ sơ cá nhân, CCCD, tiền đặt cọc. Tự động cảnh báo trước 30 ngày khi hợp đồng sắp đáo hạn.
            </p>
            <ul className="landing-feature-bullets">
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Quản lý hồ sơ cư dân bảo mật</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Quản lý tiền cọc và hạn hợp đồng</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Thông báo gia hạn &amp; thanh lý hợp đồng</li>
            </ul>
          </motion.div>

          {/* Card 4: Hóa Đơn & Thu Phí */}
          <motion.div
            className="landing-feature-card"
            custom={3}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="landing-feature-icon">
              <Receipt size={24} weight="fill" />
            </div>
            <h3 className="landing-feature-title">Xuất Hóa Đơn &amp; Thu Phí 1 Chạm</h3>
            <p className="landing-feature-text">
              Tự động tổng hợp tiền phòng, điện nước và dịch vụ thành phiếu thu chuyên nghiệp kèm mã QR ngân hàng.
            </p>
            <ul className="landing-feature-bullets">
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Tính toán tự động không lo sai số</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Theo dõi trạng thái đã thu / chưa thu</li>
              <li><Check size={14} weight="bold" color="var(--color-primary)" /> Báo cáo doanh thu &amp; công nợ tức thì</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* ── 4. Comparison Section (Sổ sách vs Số hóa) ─────────── */}
      <section id="comparison" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Hiệu quả đột phá</span>
          <h2 className="landing-section-title">
            So sánh phương pháp quản lý
          </h2>
          <p className="landing-section-desc">
            Xem sự khác biệt rõ rệt giữa phương pháp ghi chép thủ công truyền thống và
            nền tảng Nhà Trọ Thông Minh.
          </p>
        </div>

        <div className="landing-comparison-grid">
          {/* Traditional */}
          <div className="comparison-card traditional">
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-danger)", display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle size={22} weight="fill" />
              Sổ sách &amp; Excel thủ công
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--color-fg-3)", marginTop: 6 }}>
              Cách làm truyền thống tốn nhiều thời gian và dễ xảy ra rủi ro
            </p>

            <ul className="comparison-list">
              <li>
                <XCircle size={18} weight="fill" color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Mất 2-3 ngày cuối tháng để đi từng phòng chốt số và tính toán bằng tay.</span>
              </li>
              <li>
                <XCircle size={18} weight="fill" color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Dễ nhầm lẫn số điện nước, viết sai hóa đơn dẫn đến tranh cãi với khách thuê.</span>
              </li>
              <li>
                <XCircle size={18} weight="fill" color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Quên ngày thu tiền hoặc quên hạn hợp đồng, bị động khi khách đột ngột trả phòng.</span>
              </li>
              <li>
                <XCircle size={18} weight="fill" color="var(--color-danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Dữ liệu dễ thất lạc khi mất sổ, hỏng ổ cứng hoặc mất liên lạc.</span>
              </li>
            </ul>
          </div>

          {/* Modern Solution */}
          <div className="comparison-card modern">
            <span className="comparison-badge">Tối ưu 100%</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={22} weight="fill" />
              Nền tảng Nhà Trọ Thông Minh
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--color-fg-2)", marginTop: 6 }}>
              Giải pháp hiện đại hóa toàn diện cho chủ nhà chuyên nghiệp
            </p>

            <ul className="comparison-list">
              <li>
                <CheckCircle size={18} weight="fill" color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Chốt số trong 5 phút:</strong> Nhập số là hệ thống tự tính thành tiền tức thì.</span>
              </li>
              <li>
                <CheckCircle size={18} weight="fill" color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Minh bạch tuyệt đối:</strong> Hóa đơn điện tử rõ ràng chỉ số cũ - mới, tạo sự tin cậy.</span>
              </li>
              <li>
                <CheckCircle size={18} weight="fill" color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Cảnh báo thông minh:</strong> Tự động nhắc nhở hợp đồng sắp hết hạn và hóa đơn đến hạn.</span>
              </li>
              <li>
                <CheckCircle size={18} weight="fill" color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>Lưu trữ an toàn trên mây:</strong> Xem báo cáo doanh thu &amp; dòng tiền mọi lúc mọi nơi.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. Quick Steps to Get Started ─────────────────────── */}
      <section id="benefits" className="landing-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Bắt đầu dễ dàng</span>
          <h2 className="landing-section-title">
            Chỉ với 3 bước đơn giản
          </h2>
          <p className="landing-section-desc">
            Không cần cài đặt phức tạp, bạn có thể thiết lập và đưa dãy trọ vào vận hành trong vòng 5 phút.
          </p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <div className="landing-step-number">1</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Đăng ký tài khoản</h3>
            <p style={{ fontSize: 13.5, color: "var(--color-fg-2)", lineHeight: 1.6 }}>
              Tạo tài khoản miễn phí chỉ với Email trong 30 giây. Lựa chọn vai trò Chủ nhà hoặc Quản lý phòng.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">2</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Thêm Nhà &amp; Phòng Trọ</h3>
            <p style={{ fontSize: 13.5, color: "var(--color-fg-2)", lineHeight: 1.6 }}>
              Khai báo tên nhà trọ, danh sách phòng, giá thuê và thông tin khách thuê đang ở hiện tại.
            </p>
          </div>

          <div className="landing-step-card">
            <div className="landing-step-number">3</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Chốt Số &amp; Xuất Hóa Đơn</h3>
            <p style={{ fontSize: 13.5, color: "var(--color-fg-2)", lineHeight: 1.6 }}>
              Hàng tháng chỉ cần nhập chỉ số điện nước, hệ thống tự động xuất hóa đơn và theo dõi thu chi.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Call To Action Banner ──────────────────────────── */}
      <section className="landing-section">
        <div className="landing-cta-banner">
          <h2>Sẵn sàng số hóa quy trình quản lý nhà trọ của bạn?</h2>
          <p>
            Trải nghiệm nền tảng quản lý hiện đại ngay hôm nay. Hoàn toàn miễn phí khởi tạo,
            đầy đủ mọi tính năng cốt lõi.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/register"
                style={{
                  background: "#ffffff",
                  color: "#1d4ed8",
                  padding: "12px 28px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 700,
                  fontSize: 15,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Bắt đầu dùng thử miễn phí
                <ArrowRight size={16} weight="bold" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/login"
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  padding: "12px 24px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: 15,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Đăng nhập ngay
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 7. Landing Footer ─────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: "var(--color-primary)",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Buildings size={14} weight="fill" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Nhà Trọ Thông Minh</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-fg-3)" }}>
              Hệ Thống Thông Tin Quản Lý Nhà Trọ &amp; Căn Hộ Cho Thuê — Nhóm 3
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--color-fg-2)" }}>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register">Đăng ký tài khoản</Link>
            <a href="#features">Tính năng</a>
            <a href="#comparison">So sánh</a>
            <a href="#benefits">Lợi ích</a>
          </div>

          <div style={{ fontSize: 12, color: "var(--color-fg-3)" }}>
            &copy; {new Date().getFullYear()} Nhom 3. All rights reserved.
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
