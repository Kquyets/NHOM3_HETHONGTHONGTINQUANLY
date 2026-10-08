"use client";

import Link from "next/link";
import {
  House,
  Check,
  ShieldCheck,
  Lightning,
  Receipt,
  Users,
} from "@phosphor-icons/react";

export function AuthShowcase() {
  return (
    <aside className="auth-showcase-side" aria-label="Giới thiệu hệ thống">
      <div className="auth-showcase-glow" />

      {/* Top Brand */}
      <div className="auth-showcase-brand">
        <Link
          href="/"
          className="auth-showcase-brand-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              background: "var(--color-primary)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-on-primary)",
              boxShadow: "0 2px 8px var(--color-primary-glow)",
            }}
          >
            <House size={18} weight="fill" />
          </div>
          <div>
            <div
              className="auth-showcase-brand-title"
              style={{
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "-0.01em",
                color: "var(--color-fg, #0f172a)",
              }}
            >
              Nhà Trọ Thông Minh
            </div>
            <div
              className="auth-showcase-brand-sub"
              style={{
                fontSize: 11.5,
                color: "var(--color-fg-3, #475569)",
              }}
            >
              Giải pháp quản lý phòng trọ 4.0
            </div>
          </div>
        </Link>
      </div>

      {/* Main Showcase Content */}
      <div className="auth-showcase-content">
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#60a5fa",
            marginBottom: 8,
          }}
        >
          Nền tảng quản lý số 1
        </span>

        <h2 className="auth-showcase-title">
          Tối ưu 90% thời gian vận hành nhà trọ &amp; căn hộ cho thuê
        </h2>

        <p className="auth-showcase-desc">
          Tự động hóa toàn diện từ ghi nhận chỉ số điện nước, quản lý khách thuê, hợp đồng số
          cho đến lập hóa đơn và theo dõi dòng tiền hàng tháng.
        </p>

        <ul className="auth-showcase-checklist">
          <li>
            <div className="auth-check-icon">
              <Lightning size={14} weight="bold" />
            </div>
            <span>Tự động tính tiền điện nước, đối chiếu chỉ số cũ — mới chuẩn xác</span>
          </li>
          <li>
            <div className="auth-check-icon">
              <Users size={14} weight="bold" />
            </div>
            <span>Quản lý hồ sơ khách thuê, CCCD và nhắc hạn hợp đồng trước 30 ngày</span>
          </li>
          <li>
            <div className="auth-check-icon">
              <Receipt size={14} weight="bold" />
            </div>
            <span>Xuất hóa đơn 1 chạm kèm mã QR chuyển khoản nhanh ngân hàng</span>
          </li>
          <li>
            <div className="auth-check-icon">
              <ShieldCheck size={14} weight="bold" />
            </div>
            <span>Bảo mật dữ liệu đám mây, đồng bộ tức thì trên mọi thiết bị</span>
          </li>
        </ul>
      </div>

      {/* Footer / Social Proof */}
      <div className="auth-showcase-footer">
        <div>
          <div style={{ color: "#facc15", fontSize: 12, marginBottom: 2 }}>★★★★★</div>
          <div>Được tin cậy bởi 10.000+ chủ nhà &amp; ban quản lý</div>
        </div>
        <Link
          href="/"
          style={{
            color: "#60a5fa",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Về trang chủ →
        </Link>
      </div>
    </aside>
  );
}
