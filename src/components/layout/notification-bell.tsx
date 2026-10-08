"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Check,
  Receipt,
  Wrench,
  CreditCard,
  Info,
  Clock,
} from "@phosphor-icons/react";
import { apiClient } from "../../lib/api-client";
import type { NotificationRow, NotificationType } from "../../modules/notifications/notification.service";

const ICON_MAP: Record<NotificationType, React.ElementType> = {
  invoice: Receipt,
  maintenance: Wrench,
  payment: CreditCard,
  system: Info,
};

function formatTimeAgo(dateStr: Date | string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient<{ notifications: NotificationRow[]; unreadCount: number }>(
        "/api/notifications",
      );
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (n: NotificationRow) => {
    if (!n.isRead) {
      try {
        await apiClient(`/api/notifications/${n.id}`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    }
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <motion.button
        type="button"
        className="theme-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Thông báo hệ thống"
        title="Thông báo hệ thống"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ position: "relative" }}
      >
        <Bell size={16} weight={unreadCount > 0 ? "fill" : "regular"} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: "var(--color-danger, #ef4444)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 0 2px var(--color-bg)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="card"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              width: 340,
              maxWidth: "90vw",
              zIndex: 120,
              padding: 0,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Bell size={16} style={{ color: "var(--color-primary)" }} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Thông báo</span>
                {unreadCount > 0 && (
                  <span className="badge maintenance" style={{ fontSize: 10, padding: "1px 6px" }}>
                    {unreadCount} mới
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}
                  onClick={handleMarkAllRead}
                >
                  <Check size={12} /> Đã đọc hết
                </button>
              )}
            </div>

            {/* Notification List */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {loading && notifications.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                  Đang tải thông báo...
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: "28px 16px", textAlign: "center" }}>
                  <Bell size={28} style={{ color: "var(--color-fg-3)", opacity: 0.5, margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
                    Bạn chưa có thông báo nào.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = ICON_MAP[n.type] || Info;
                  const content = (
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        borderBottom: "1px solid var(--color-border)",
                        background: n.isRead ? "transparent" : "rgba(37, 99, 235, 0.05)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onClick={() => void handleItemClick(n)}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: n.type === "invoice" ? "rgba(37,99,235,0.12)" : n.type === "maintenance" ? "rgba(234,179,8,0.15)" : n.type === "payment" ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
                          color: n.type === "invoice" ? "var(--color-primary)" : n.type === "maintenance" ? "#d97706" : n.type === "payment" ? "#16a34a" : "var(--color-fg)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Icon size={16} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: "var(--text-xs)", fontWeight: n.isRead ? 600 : 700, color: "var(--color-fg)" }}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-primary)", flexShrink: 0 }} />
                          )}
                        </div>
                        <p style={{ margin: "2px 0 4px", fontSize: 11, color: "var(--color-fg-2)", lineHeight: 1.4, wordBreak: "break-word" }}>
                          {n.message}
                        </p>
                        <div style={{ fontSize: 10, color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Clock size={10} />
                          {formatTimeAgo(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  );

                  return n.link ? (
                    <Link key={n.id} href={n.link} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
