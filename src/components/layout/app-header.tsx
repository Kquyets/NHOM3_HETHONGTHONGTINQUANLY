"use client";

import { useState, useRef, useEffect } from "react";
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
  Sparkle,
  CheckCircle,
  Wrench,
  UserGear,
  List,
  ShieldCheck,
  CreditCard,
  CaretDown,
  DotsThree,
} from "@phosphor-icons/react";

import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";
import { NotificationBell } from "./notification-bell";
import { MobileDrawer } from "./mobile-drawer";

const primaryNavItems = [
  { href: "/",           label: "Dashboard",      Icon: House,     match: (p: string) => p === "/" || p.startsWith("/dashboard") },
  { href: "/properties", label: "Nhà trọ & Phòng",Icon: Buildings, match: (p: string) => p.startsWith("/properties") },
  { href: "/tenants",    label: "Khách thuê",     Icon: Users,     match: (p: string) => p.startsWith("/tenants") },
  { href: "/contracts",  label: "Hợp đồng",       Icon: FileText,  match: (p: string) => p.startsWith("/contracts") },
  { href: "/meters",     label: "Điện & Nước",    Icon: Lightning, match: (p: string) => p.startsWith("/meters") },
  { href: "/invoices",   label: "Hoá đơn",        Icon: Receipt,   match: (p: string) => p.startsWith("/invoices") },
];

const secondaryNavItems = [
  { href: "/transactions",label: "Giao dịch",     Icon: CreditCard,match: (p: string) => p.startsWith("/transactions") },
  { href: "/maintenance",label: "Sự cố",          Icon: Wrench,    match: (p: string) => p.startsWith("/maintenance") },
  { href: "/staff",      label: "Nhân viên",      Icon: ShieldCheck,match: (p: string) => p.startsWith("/staff"), ownerOnly: true },
  { href: "/ai",         label: "Trợ lý AI",      Icon: Sparkle,   match: (p: string) => p.startsWith("/ai") },
];

const tenantNavItems = [
  { href: "/",           label: "Cổng thông tin", Icon: House,     match: (p: string) => p === "/" || p.startsWith("/dashboard") },
  { href: "/ai",         label: "Trợ lý AI",      Icon: Sparkle,   match: (p: string) => p.startsWith("/ai") },
  { href: "/profile",    label: "Cài đặt & Hồ sơ",Icon: UserGear,  match: (p: string) => p.startsWith("/profile") },
];

const guestNavItems = [
  { href: "/",           label: "Trang chủ",      Icon: House,       match: (p: string) => p === "/" },
  { href: "/#features",  label: "Tính năng",      Icon: Sparkle,     match: () => false },
  { href: "/#comparison",label: "So sánh giải pháp",Icon: CheckCircle,match: () => false },
  { href: "/#benefits",  label: "3 Bước bắt đầu", Icon: FileText,    match: () => false },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const roleText =
    user?.role === "owner" ? "Chủ nhà" :
    user?.role === "manager" ? "Quản lý" : "Khách thuê";

  const filteredSecondary = user
    ? secondaryNavItems.filter((item) => !item.ownerOnly || user.role === "owner")
    : [];
  const activeSecondary = filteredSecondary.find((item) => item.match(pathname));

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand & Mobile Hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu điều hướng"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-fg-1)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <List size={22} weight="bold" />
          </button>

          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Link href="/" className="brand">
              <div className="brand-icon">
                <BrandLogo />
              </div>
              <span>HManagers</span>
            </Link>
          </motion.div>
        </div>

        {/* Nav */}
        <nav className="header-nav" aria-label="Điều hướng chính">
          <ul className="nav-links">
            {!user ? (
              guestNavItems.map(({ href, label, Icon, match }, i) => {
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
                      <Icon size={14} weight={isActive ? "fill" : "regular"} />
                      <span>{label}</span>
                    </Link>
                  </motion.li>
                );
              })
            ) : user.role === "tenant" ? (
              tenantNavItems.map(({ href, label, Icon, match }, i) => {
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
                      <Icon size={14} weight={isActive ? "fill" : "regular"} />
                      <span>{label}</span>
                    </Link>
                  </motion.li>
                );
              })
            ) : (
              <>
                {primaryNavItems.map(({ href, label, Icon, match }, i) => {
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
                        <Icon size={14} weight={isActive ? "fill" : "regular"} />
                        <span>{label}</span>
                      </Link>
                    </motion.li>
                  );
                })}

                {/* Secondary / Overflow Menu */}
                {filteredSecondary.length > 0 && (
                  <li
                    ref={moreRef}
                    className={`nav-item nav-item-more ${activeSecondary ? "active" : ""}`}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      className={`nav-more-btn ${activeSecondary ? "active" : ""}`}
                      onClick={() => setMoreOpen((v) => !v)}
                      aria-expanded={moreOpen}
                      aria-haspopup="true"
                    >
                      {activeSecondary ? (
                        <>
                          <activeSecondary.Icon size={14} weight="fill" />
                          <span>{activeSecondary.label}</span>
                        </>
                      ) : (
                        <>
                          <DotsThree size={16} weight="bold" />
                          <span>Khác</span>
                        </>
                      )}
                      <CaretDown
                        size={11}
                        weight="bold"
                        style={{
                          transform: moreOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>

                    <AnimatePresence>
                      {moreOpen && (
                        <motion.div
                          className="nav-more-dropdown"
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                        >
                          {filteredSecondary.map((item) => {
                            const isActive = item.match(pathname);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-more-dropdown-item ${isActive ? "active" : ""}`}
                                onClick={() => setMoreOpen(false)}
                              >
                                <item.Icon size={15} weight={isActive ? "fill" : "regular"} />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* User controls */}
        <div className="user-controls">
          {/* Theme Toggle */}
          <motion.button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === "dark" ? (
                <motion.span
                  key="sun"
                  initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex" }}
                >
                  <Sun size={15} weight="fill" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: -45, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: "flex" }}
                >
                  <Moon size={15} weight="fill" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="user"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <NotificationBell />
                <Link
                  href="/profile"
                  className="user-badge"
                  style={{ textDecoration: "none", cursor: "pointer" }}
                  title="Cài đặt hồ sơ cá nhân"
                >
                  <span className="user-badge-email" title={user.email}>
                    {user.fullName || user.email}
                  </span>
                  <span className={`role-tag ${user.role}`}>{roleText}</span>
                </Link>
                <motion.button
                  type="button"
                  className="btn-ghost btn-logout"
                  onClick={() => void logout()}
                  aria-label="Đăng xuất khỏi hệ thống"
                  title="Đăng xuất khỏi hệ thống"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SignOut size={14} />
                  <span className="logout-text">Đăng xuất</span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="guest"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href="/login"
                  className="btn-secondary"
                  style={{ padding: "5px 11px", fontSize: 13 }}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="btn-primary"
                  style={{ padding: "5px 13px", fontSize: 13 }}
                >
                  Dùng thử
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Sidebar Navigation Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
