"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "../../lib/auth-context";

/* Inline SVG icons — no emoji, no external icon library needed */
const Icons = {
  Home: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Building: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  FileText: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Zap: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Receipt: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  BrandLogo: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 8.5V20a1 1 0 001 1h5v-6h8v6h5a1 1 0 001-1V8.5L12 2z"/>
    </svg>
  ),
};

const navItems = [
  { href: "/",           label: "Tổng quan",      Icon: Icons.Home,     match: (p: string) => p === "/" },
  { href: "/properties", label: "Nhà trọ & Phòng", Icon: Icons.Building, match: (p: string) => p.startsWith("/properties") },
  { href: "/tenants",    label: "Khách thuê",      Icon: Icons.Users,    match: (p: string) => p.startsWith("/tenants") },
  { href: "/contracts",  label: "Hợp đồng",        Icon: Icons.FileText, match: (p: string) => p.startsWith("/contracts") },
  { href: "/meters",     label: "Điện & Nước",     Icon: Icons.Zap,      match: (p: string) => p.startsWith("/meters") },
  { href: "/invoices",   label: "Hóa đơn",         Icon: Icons.Receipt,  match: (p: string) => p.startsWith("/invoices") },
];

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
          <div className="brand-icon">
            <Icons.BrandLogo />
          </div>
          <span>Nhà Trọ Thông Minh</span>
        </Link>

        <nav aria-label="Điều hướng chính">
          <ul className="nav-links">
            {navItems.map(({ href, label, Icon, match }) => (
              <li key={href} className={`nav-item ${match(pathname) ? "active" : ""}`}>
                <Link href={href} aria-current={match(pathname) ? "page" : undefined}>
                  <Icon />
                  {label}
                </Link>
              </li>
            ))}
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
                aria-label="Đăng xuất khỏi hệ thống"
              >
                <Icons.LogOut />
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="btn-primary" style={{ padding: "6px 16px" }}>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
