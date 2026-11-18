"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarBlank,
  CaretUp,
  CaretDown,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";

export interface FluentDatePickerProps {
  value?: string; // "YYYY-MM-DD" or "YYYY-MM"
  onChange: (value: string) => void;
  mode?: "date" | "month";
  id?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

const VI_DAYS_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const EN_DAYS_SHORT = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const MONTH_NAMES_VI = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const WEEKDAY_NAMES_VI = [
  "Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"
];

export function FluentDatePicker({
  value = "",
  onChange,
  mode = "date",
  id,
  placeholder,
  style,
  className = "",
  disabled = false,
}: FluentDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "months">(
    mode === "month" ? "calendar" : "calendar"
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsed = useMemo(() => {
    if (!value) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(), // 0-11
        day: now.getDate(),
        isValid: false,
      };
    }
    const parts = value.split("-").map((p) => parseInt(p, 10));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        year: parts[0],
        month: parts[1] - 1,
        day: parts[2] && !isNaN(parts[2]) ? parts[2] : 1,
        isValid: true,
      };
    }
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      isValid: false,
    };
  }, [value]);

  // Calendar navigational view state
  const [navYear, setNavYear] = useState<number>(parsed.year);
  const [navMonth, setNavMonth] = useState<number>(parsed.month);

  // Sync nav view when value changes from outside
  useEffect(() => {
    if (parsed.isValid) {
      setNavYear(parsed.year);
      setNavMonth(parsed.month);
    }
  }, [parsed]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Navigate month
  const handlePrevMonth = () => {
    if (viewMode === "months") {
      setNavYear((y) => y - 1);
    } else {
      if (navMonth === 0) {
        setNavMonth(11);
        setNavYear((y) => y - 1);
      } else {
        setNavMonth((m) => m - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "months") {
      setNavYear((y) => y + 1);
    } else {
      if (navMonth === 11) {
        setNavMonth(0);
        setNavYear((y) => y + 1);
      } else {
        setNavMonth((m) => m + 1);
      }
    }
  };

  // Select month from 12-month grid
  const handleSelectMonth = (monthIdx: number) => {
    setNavMonth(monthIdx);
    if (mode === "month") {
      const monthStr = String(monthIdx + 1).padStart(2, "0");
      onChange(`${navYear}-${monthStr}`);
      setIsOpen(false);
    } else {
      setViewMode("calendar");
    }
  };

  // Select a day from calendar grid
  const handleSelectDay = (day: number, monthOffset = 0) => {
    let targetYear = navYear;
    let targetMonth = navMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }

    const monthStr = String(targetMonth + 1).padStart(2, "0");
    if (mode === "month") {
      onChange(`${targetYear}-${monthStr}`);
    } else {
      const dayStr = String(day).padStart(2, "0");
      onChange(`${targetYear}-${monthStr}-${dayStr}`);
    }
    setIsOpen(false);
  };

  // Calendar cells computation (Mo..Su week order)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(navYear, navMonth, 1).getDay(); // 0 is Sun, 1 is Mon
    const startOffset = (firstDay + 6) % 7; // 0 for Mon, 6 for Sun

    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(navYear, navMonth, 0).getDate();

    const cells: Array<{
      day: number;
      offset: number; // -1 prev, 0 current, 1 next
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    const today = new Date();
    const isCurrentNavMonthToday =
      today.getFullYear() === navYear && today.getMonth() === navMonth;

    // Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push({
        day,
        offset: -1,
        isSelected: false,
        isToday: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected =
        parsed.isValid &&
        parsed.year === navYear &&
        parsed.month === navMonth &&
        (mode === "month" || parsed.day === d);

      const isToday = isCurrentNavMonthToday && today.getDate() === d;

      cells.push({
        day: d,
        offset: 0,
        isSelected,
        isToday,
      });
    }

    // Next month leading days to complete full 42 cells (6 rows x 7 cols)
    const totalCurrent = cells.length;
    const remaining = 42 - totalCurrent;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        offset: 1,
        isSelected: false,
        isToday: false,
      });
    }

    return cells;
  }, [navYear, navMonth, parsed, mode]);

  // Display label on the trigger input
  const triggerLabel = useMemo(() => {
    if (!value) return placeholder || (mode === "month" ? "Chọn tháng" : "Chọn ngày");
    if (mode === "month") {
      const parts = value.split("-");
      if (parts.length >= 2) {
        return `Tháng ${parts[1]}/${parts[0]}`;
      }
    } else {
      const parts = value.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return value;
  }, [value, mode, placeholder]);

  // Full header date text (e.g., "Thứ Năm, 19 tháng 11")
  const fullHeaderDate = useMemo(() => {
    if (parsed.isValid) {
      const d = new Date(parsed.year, parsed.month, parsed.day);
      const weekday = WEEKDAY_NAMES_VI[d.getDay()];
      return `${weekday}, ${parsed.day} ${MONTH_NAMES_VI[parsed.month]}`;
    }
    const now = new Date();
    const weekday = WEEKDAY_NAMES_VI[now.getDay()];
    return `${weekday}, ${now.getDate()} ${MONTH_NAMES_VI[now.getMonth()]}`;
  }, [parsed]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block", ...style }}
      className={`fluent-date-picker-root ${className}`}
    >
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="fluent-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarBlank size={15} weight="bold" className="fluent-picker-icon" />
        <span className="fluent-picker-text">{triggerLabel}</span>
        <CaretDown
          size={12}
          weight="bold"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            opacity: 0.65,
          }}
        />
      </button>

      {/* Flyout Window (Windows 11 Acrylic Style) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fluent-calendar-flyout"
            role="dialog"
            aria-label="Lịch chọn ngày"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Top Full Date Header (Windows 11 Header) */}
            <div className="fluent-calendar-top-header">
              <span className="fluent-calendar-title-date">{fullHeaderDate}</span>
              <button
                type="button"
                className="fluent-btn-icon"
                onClick={() => setIsOpen(false)}
                title="Đóng lịch"
                aria-label="Đóng"
              >
                <CaretDown size={14} weight="bold" />
              </button>
            </div>

            {/* Nav Row: Month Year + Up/Down chevrons */}
            <div className="fluent-calendar-nav-row">
              <button
                type="button"
                className="fluent-calendar-view-toggle"
                onClick={() =>
                  setViewMode((prev) => (prev === "calendar" ? "months" : "calendar"))
                }
                title="Bấm để đổi chế độ xem tháng / năm"
              >
                <span>
                  {MONTH_NAMES_VI[navMonth]} {navYear}
                </span>
                <CaretDown
                  size={12}
                  weight="bold"
                  style={{
                    transform: viewMode === "months" ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s ease",
                  }}
                />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  className="fluent-btn-icon"
                  onClick={handlePrevMonth}
                  aria-label="Tháng trước"
                  title="Tháng trước"
                >
                  <CaretUp size={13} weight="bold" />
                </button>
                <button
                  type="button"
                  className="fluent-btn-icon"
                  onClick={handleNextMonth}
                  aria-label="Tháng sau"
                  title="Tháng sau"
                >
                  <CaretDown size={13} weight="bold" />
                </button>
              </div>
            </div>

            {/* View Mode: 12 Months Grid */}
            {viewMode === "months" ? (
              <div className="fluent-months-grid">
                {MONTH_NAMES_VI.map((mName, idx) => {
                  const isSelected =
                    parsed.isValid &&
                    parsed.year === navYear &&
                    parsed.month === idx;
                  const isCurrentMonthNow =
                    new Date().getFullYear() === navYear &&
                    new Date().getMonth() === idx;

                  return (
                    <button
                      key={mName}
                      type="button"
                      className={`fluent-month-cell ${isSelected ? "selected" : ""} ${
                        isCurrentMonthNow ? "today" : ""
                      }`}
                      onClick={() => handleSelectMonth(idx)}
                    >
                      Thg {idx + 1}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* View Mode: Calendar Days Grid */
              <div className="fluent-calendar-body">
                {/* Day of Week Headers */}
                <div className="fluent-weekdays-row">
                  {VI_DAYS_SHORT.map((dayName, i) => (
                    <span key={dayName} title={EN_DAYS_SHORT[i]}>
                      {dayName}
                    </span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="fluent-days-grid">
                  {calendarCells.map((cell, idx) => {
                    const isOutside = cell.offset !== 0;
                    return (
                      <button
                        key={`${cell.day}-${cell.offset}-${idx}`}
                        type="button"
                        className={`fluent-day-cell ${
                          isOutside ? "outside" : ""
                        } ${cell.isSelected ? "selected" : ""} ${
                          cell.isToday && !cell.isSelected ? "today" : ""
                        }`}
                        onClick={() => handleSelectDay(cell.day, cell.offset)}
                      >
                        <span>{cell.day}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
