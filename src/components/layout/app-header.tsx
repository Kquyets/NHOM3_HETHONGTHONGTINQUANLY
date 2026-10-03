"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "../../lib/auth-context";

export function AppHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const roleText =
    user?.role === "owner"
      ? "Chủ nhà"
      : user?.role === "manager"
        ? "Quản lý"
        : "Khách thuê";

  return (
    <header className="app-header">
      <div className="header-container">
        <Link href="/" className="brand">
          <div className="brand-icon">🏠</div>
          <span>Nhà Trọ Thông Minh</span>
        </Link>

        <nav>
          <ul className="nav-links">
            <li className={`nav-item ${pathname === "/" ? "active" : ""}`}>
              <Link href="/">📊 Tổng quan</Link>
            </li>
            <li className={`nav-item ${pathname.startsWith("/properties") ? "active" : ""}`}>
              <Link href="/properties">🏠 Nhà trọ & Phòng</Link>
            </li>
            <li className={`nav-item ${pathname.startsWith("/tenants") ? "active" : ""}`}>
              <Link href="/tenants">👥 Khách thuê</Link>
            </li>
            <li className={`nav-item ${pathname.startsWith("/contracts") ? "active" : ""}`}>
              <Link href="/contracts">📄 Hợp đồng</Link>
            </li>
            <li className={`nav-item ${pathname.startsWith("/meters") ? "active" : ""}`}>
              <Link href="/meters">⚡ Điện & Nước</Link>
            </li>
            <li className={`nav-item ${pathname.startsWith("/invoices") ? "active" : ""}`}>
              <Link href="/invoices">🧾 Hóa đơn</Link>
            </li>
          </ul>
        </nav>

        <div className="user-controls">
          {user ? (
            <>
              <div className="user-badge">
                <span>{user.email}</span>
                <span className={`role-tag ${user.role}`}>{roleText}</span>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={() => void logout()}
                title="Đăng xuất khỏi hệ thống"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary" style={{ width: "auto", padding: "6px 16px" }}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
