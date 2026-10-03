"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  Buildings,
  Users,
  FileText,
  Lightning,
  Receipt,
  SignOut,
  Sun,
  Moon,
} from "@phosphor-icons/react";

import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";

const navItems = [
  { href: "/",           label: "Tổng quan",      Icon: House,     match: (p: string) => p === "/" },
  { href: "/properties", label: "Nhà & Phòng",    Icon: Buildings, match: (p: string) => p.startsWith("/properties") },
  { href: "/tenants",    label: "Khách thuê",     Icon: Users,     match: (p: string) => p.startsWith("/tenants") },
  { href: "/contracts",  label: "Hợp đồng",       Icon: FileText,  match: (p: string) => p.startsWith("/contracts") },
  { href: "/meters",     label: "Điện & Nước",    Icon: Lightning, match: (p: string) => p.startsWith("/meters") },
  { href: "/invoices",   label: "Hóa đơn",        Icon: Receipt,   match: (p: string) => p.startsWith("/invoices") },
];

function BrandLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L2 8.5V20a1 1 0 001 1h5v-6h8v6h5a1 1 0 001-1V8.5L12 2z" />
    </svg>
  );
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  const roleText =
    user?.role === "owner" ? "Chủ nhà" :
    user?.role === "manager" ? "Quản lý" : "Khách thuê";

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Link href="/" className="brand">
            <div className="brand-icon">
              <BrandLogo />
            </div>
            <span>Nhà Trọ Thông Minh</span>
          </Link>
        </motion.div>

        {/* Nav */}
        <nav aria-label="Điều hướng chính">
          <ul className="nav-links">
            {navItems.map(({ href, label, Icon, match }, i) => {
              const isActive = match(pathname);
              return (
                <motion.li
                  key={href}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04, ease: "easeOut" }}
                >
                  <Link href={href} aria-current={isActive ? "page" : undefined}>
                    <Icon size={15} weight={isActive ? "fill" : "regular"} />
                    {label}
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        </nav>

        {/* User controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Theme Toggle */}
          <motion.button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9, rotate: 15 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex" }}
                >
                  <Sun size={16} weight="fill" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -45, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex" }}
                >
                  <Moon size={16} weight="fill" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="user"
                className="user-controls"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className="user-badge">
                  <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.email}
                  </span>
                  <span className={`role-tag ${user.role}`}>{roleText}</span>
                </div>
                <motion.button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void logout()}
                  aria-label="Đăng xuất khỏi hệ thống"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <SignOut size={14} />
                  Đăng xuất
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="guest"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Link href="/login" className="btn-primary" style={{ padding: "6px 16px" }}>
                  Đăng nhập
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
