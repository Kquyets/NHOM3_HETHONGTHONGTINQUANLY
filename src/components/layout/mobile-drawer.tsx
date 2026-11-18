"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  House,
  Buildings,
  Door,
  Users,
  FileText,
  Receipt,
  Lightning,
  Wrench,
  CreditCard,
  Sparkle,
  Gear,
  ShieldCheck,
  SignOut,
  Moon,
  Sun,
  User,
} from "@phosphor-icons/react";
import { useAuth } from "../../lib/auth-context";
import { useTheme } from "../../lib/theme-context";

export type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const DRAWER_MENU_ITEMS = [
  { href: "/", label: "Dashboard", Icon: House, match: (p: string) => p === "/" || p.startsWith("/dashboard") },
  { href: "/properties", label: "Nhà trọ & Phòng", Icon: Buildings, match: (p: string) => p.startsWith("/properties") },
  { href: "/tenants", label: "Khách thuê", Icon: Users, match: (p: string) => p.startsWith("/tenants") },
  { href: "/contracts", label: "Hợp đồng", Icon: FileText, match: (p: string) => p.startsWith("/contracts") },
  { href: "/meters", label: "Điện & Nước", Icon: Lightning, match: (p: string) => p.startsWith("/meters") },
  { href: "/invoices", label: "Hoá đơn", Icon: Receipt, match: (p: string) => p.startsWith("/invoices") },
  { href: "/maintenance", label: "Sự cố & Sửa chữa", Icon: Wrench, match: (p: string) => p.startsWith("/maintenance") },
  { href: "/ai", label: "Trợ lý AI", Icon: Sparkle, match: (p: string) => p.startsWith("/ai"), isAi: true },
  { href: "/profile", label: "Cài đặt & Hồ sơ", Icon: Gear, match: (p: string) => p.startsWith("/profile") },
];

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(4px)",
              zIndex: 9998,
            }}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              maxWidth: "85vw",
              backgroundColor: "var(--color-bg-panel, #ffffff)",
              borderRight: "1px solid var(--color-border)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Drawer Top Header (matching user photo) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "var(--color-primary, #3b82f6)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Buildings size={18} weight="fill" />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: "var(--color-fg-1)", lineHeight: 1.2 }}>
                    HManagers
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-fg-3)" }}>
                    Hệ thống Quản lý Nhà trọ
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng menu"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-fg-3)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Mini Card if logged in */}
            {user && (
              <div
                style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid var(--color-border-soft, rgba(0,0,0,0.06))",
                  backgroundColor: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "var(--color-primary, #3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  <User size={18} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {user.fullName || user.email}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-fg-3)" }}>
                    {user.role === "owner" ? "Chủ nhà" : user.role === "manager" ? "Quản lý" : "Khách thuê"}
                  </div>
                </div>
              </div>
            )}

            {/* Menu List */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                {DRAWER_MENU_ITEMS.map((item) => {
                  const isActive = item.match(pathname);
                  const Icon = item.Icon;
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 500,
                          textDecoration: "none",
                          color: isActive
                            ? "var(--color-primary, #2563eb)"
                            : "var(--color-fg-2, #475569)",
                          backgroundColor: isActive
                            ? "var(--color-primary-light, rgba(37, 99, 235, 0.08))"
                            : "transparent",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Icon
                          size={18}
                          weight={isActive ? "fill" : "regular"}
                          style={{
                            color: item.isAi
                              ? "#8b5cf6"
                              : isActive
                              ? "var(--color-primary, #2563eb)"
                              : "var(--color-fg-3, #94a3b8)",
                          }}
                        />
                        <span>{item.label}</span>
                        {item.isAi && (
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: 10,
                              fontWeight: 700,
                              backgroundColor: "#f3e8ff",
                              color: "#7c3aed",
                              padding: "2px 6px",
                              borderRadius: 12,
                            }}
                          >
                            AI
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Drawer Bottom Controls */}
            <div
              style={{
                padding: "14px 16px",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--color-bg-panel, #ffffff)",
              }}
            >
              <button
                type="button"
                className="btn-ghost"
                onClick={toggle}
                style={{ padding: "6px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
              </button>

              {user && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    onClose();
                    void logout();
                  }}
                  style={{ padding: "6px 10px", fontSize: 13, color: "#dc2626", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <SignOut size={15} />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
