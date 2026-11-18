"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Lightning,
  Drop,
  Plus,
  X,
  Trash,
  Door,
  CurrencyDollar,
  Receipt,
  Buildings,
  DownloadSimple,
  CheckCircle,
} from "@phosphor-icons/react";

import { AppHeader } from "../../components/layout/app-header";
import { FluentDatePicker } from "../../components/ui/fluent-date-picker";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { exportTableToCsv } from "../../utils/export-csv";
import type { MeterReadingRow, UtilityRateRow, UtilityType } from "../../modules/meters/meter.service";
import type { PropertyRow } from "../../modules/properties/property.service";
import type { RoomRow } from "../../modules/rooms/room.service";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.04, ease: "easeOut" as const },
  }),
};

/* ── Slide Panel ─────────────────────────────────────────────────── */
function SlidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="panel"
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: "var(--space-3)" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        <motion.button type="button" className="btn-ghost" style={{ padding: "5px 10px" }} onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} aria-label="Đóng">
          <X size={14} />
        </motion.button>
      </div>
      {children}
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function MetersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"matrix" | "readings" | "rates">("matrix");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [propertyRooms, setPropertyRooms] = useState<RoomRow[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Month selector (defaults to current month YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [billingMonth, setBillingMonth] = useState(currentMonthStr);

  // Matrix values state: roomId -> { prevElec, currElec, waterOccupants, wifiCount, vehicleCount }
  type MatrixEntry = {
    prevElec: number;
    currElec: number;
    waterOccupants: number;
    wifiCount: number;
    vehicleCount: number;
  };
  const [matrixData, setMatrixData] = useState<Record<string, MatrixEntry>>({});
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixSuccess, setMatrixSuccess] = useState<string | null>(null);

  const [readings, setReadings] = useState<MeterReadingRow[]>([]);
  const [rates, setRates] = useState<UtilityRateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | UtilityType>("all");

  const [showAddReading, setShowAddReading] = useState(false);
  const [submittingReading, setSubmittingReading] = useState(false);
  const [readingFormRooms, setReadingFormRooms] = useState<RoomRow[]>([]);
  const [rRoomId, setRRoomId] = useState("");
  const [rPropId, setRPropId] = useState("");
  const [rType, setRType] = useState<UtilityType>("electricity");
  const [rPeriod, setRPeriod] = useState("");
  const [rPrev, setRPrev] = useState("");
  const [rCurr, setRCurr] = useState("");
  const [rPrice, setRPrice] = useState("");

  const [showAddRate, setShowAddRate] = useState(false);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [ratePropId, setRatePropId] = useState("");
  const [rateType, setRateType] = useState<UtilityType>("electricity");
  const [ratePrice, setRatePrice] = useState("");
  const [rateFrom, setRateFrom] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [propsRes, readingsRes, ratesRes] = await Promise.all([
        apiClient<{ properties: PropertyRow[] }>("/api/properties"),
        apiClient<{ readings: MeterReadingRow[] }>("/api/meters"),
        apiClient<{ utilityRates: UtilityRateRow[] }>("/api/utility-rates"),
      ]);
      setProperties(propsRes.properties);
      if (propsRes.properties.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(propsRes.properties[0].id);
      }
      setReadings(readingsRes.readings);
      setRates(ratesRes.utilityRates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu chỉ số.");
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "tenant") { router.replace("/"); return; }
    void loadData();
  }, [user, authLoading, router, loadData]);

  // Load rooms and populate matrix data when selectedPropertyId changes
  useEffect(() => {
    if (!selectedPropertyId) return;
    const fetchRooms = async () => {
      try {
        setLoadingRooms(true);
        const res = await apiClient<{ rooms: RoomRow[] }>(`/api/properties/${selectedPropertyId}/rooms`);
        setPropertyRooms(res.rooms);

        // Pre-populate matrix data
        const initialMatrix: Record<string, MatrixEntry> = {};
        res.rooms.forEach((room, idx) => {
          // Find latest previous reading for this room if available
          const pastReadings = readings.filter((r) => r.roomId === room.id && r.utilityType === "electricity");
          const lastReading = pastReadings[0];
          const prevVal = lastReading ? parseFloat(lastReading.currentValue) : 100 + idx * 50;
          const currVal = prevVal + (lastReading ? 35 : 40);

          initialMatrix[room.id] = {
            prevElec: prevVal,
            currElec: currVal,
            waterOccupants: room.maxOccupants ?? 2,
            wifiCount: 1,
            vehicleCount: 1,
          };
        });
        setMatrixData(initialMatrix);
      } catch {
        setPropertyRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    void fetchRooms();
  }, [selectedPropertyId, readings]);

  const updateMatrixField = (roomId: string, field: keyof MatrixEntry, val: number) => {
    setMatrixData((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || { prevElec: 0, currElec: 0, waterOccupants: 1, wifiCount: 1, vehicleCount: 1 }),
        [field]: val,
      },
    }));
  };

  // Get active rates for selected property
  const activeElecRate = rates.find((r) => r.propertyId === selectedPropertyId && r.utilityType === "electricity")?.unitPrice || 3800;
  const activeWaterRate = rates.find((r) => r.propertyId === selectedPropertyId && r.utilityType === "water")?.unitPrice || 120000;
  const fixedWifiRate = 180000;
  const fixedVehicleRate = 120000;

  // Real-time matrix totals
  const totalElecKWh = propertyRooms.reduce((sum, r) => {
    const entry = matrixData[r.id];
    if (!entry) return sum;
    return sum + Math.max(0, entry.currElec - entry.prevElec);
  }, 0);
  const totalElecCost = totalElecKWh * activeElecRate;

  const totalWaterOccupants = propertyRooms.reduce((sum, r) => {
    const entry = matrixData[r.id];
    return sum + (entry?.waterOccupants || 0);
  }, 0);
  const totalWaterCost = totalWaterOccupants * activeWaterRate;

  const totalWifiCount = propertyRooms.reduce((sum, r) => {
    const entry = matrixData[r.id];
    return sum + (entry?.wifiCount || 0);
  }, 0);
  const totalWifiCost = totalWifiCount * fixedWifiRate;

  const totalVehicleCount = propertyRooms.reduce((sum, r) => {
    const entry = matrixData[r.id];
    return sum + (entry?.vehicleCount || 0);
  }, 0);
  const totalVehicleCost = totalVehicleCount * fixedVehicleRate;

  const grandTotalServices = totalElecCost + totalWaterCost + totalWifiCost + totalVehicleCost;

  const handleSaveBulkMatrix = async () => {
    if (!selectedPropertyId) return;
    try {
      setSavingMatrix(true);
      setError(null);
      setMatrixSuccess(null);

      const billingPeriod = `${billingMonth}-01`;
      const items = propertyRooms.map((r) => {
        const entry = matrixData[r.id] || { prevElec: 0, currElec: 0 };
        return {
          roomId: r.id,
          utilityType: "electricity" as UtilityType,
          previousValue: entry.prevElec,
          currentValue: entry.currElec,
          unitPriceSnapshot: activeElecRate,
        };
      });

      await apiClient("/api/meters", {
        method: "POST",
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          billingPeriod,
          items,
        }),
      });

      setMatrixSuccess(`Đã lưu thành công chỉ số & dịch vụ cho ${items.length} phòng trong tháng ${billingMonth}!`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu chỉ số hàng loạt thất bại.");
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleCreateReading = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingReading(true);
      await apiClient("/api/meters", {
        method: "POST",
        body: JSON.stringify({
          roomId: rRoomId.trim(),
          propertyId: rPropId.trim(),
          utilityType: rType,
          billingPeriod: rPeriod,
          previousValue: Number(rPrev),
          currentValue: Number(rCurr),
          unitPriceSnapshot: Number(rPrice || 0),
        }),
      });
      setShowAddReading(false);
      setRRoomId("");
      setRPropId("");
      setRPrev("");
      setRCurr("");
      setRPrice("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu chỉ số thất bại.");
    } finally {
      setSubmittingReading(false);
    }
  };

  const handleCreateRate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingRate(true);
      await apiClient("/api/utility-rates", {
        method: "POST",
        body: JSON.stringify({
          propertyId: ratePropId.trim(),
          utilityType: rateType,
          unitPrice: Number(ratePrice),
          effectiveFrom: rateFrom,
        }),
      });
      setShowAddRate(false);
      setRatePropId("");
      setRatePrice("");
      setRateFrom("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo biểu giá thất bại.");
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleDeleteReading = async (reading: MeterReadingRow) => {
    if (!window.confirm("Bạn có chắc muốn xóa bản ghi chỉ số này?")) return;
    try {
      await apiClient(`/api/meters/${reading.id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa bản ghi chỉ số.");
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="main-container">
          <div className="loading-indicator">
            <span className="spinner" role="status" aria-label="Đang tải" />
            Đang xác thực thông tin...
          </div>
        </main>
      </div>
    );
  }

  const filteredReadings = readings.filter(
    (r) => filterType === "all" || r.utilityType === filterType,
  );

  const exportReadingsCSV = () => {
    if (readings.length === 0) return;
    const headers = [
      "Mã Bản Ghi",
      "Phòng",
      "Nhà trọ",
      "Loại dịch vụ",
      "Kỳ tính",
      "Chỉ số cũ",
      "Chỉ số mới",
      "Tiêu thụ",
      "Đơn vị",
      "Đơn giá (VND)",
      "Thành tiền (VND)",
    ];
    const rows = filteredReadings.map((r) => {
      const usage = Number(r.currentValue) - Number(r.previousValue);
      const cost = usage * r.unitPriceSnapshot;
      return [
        r.id,
        `P${r.roomNumber}`,
        r.propertyName,
        r.utilityType === "electricity" ? "Điện" : "Nước",
        r.billingPeriod,
        r.previousValue,
        r.currentValue,
        usage,
        r.utilityType === "electricity" ? "kWh" : "m3",
        r.unitPriceSnapshot,
        cost,
      ];
    });

    exportTableToCsv(
      `Chi_so_dien_nuoc_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows,
    );
  };

  const exportMatrixCSV = () => {
    if (propertyRooms.length === 0) return;
    const headers = [
      "Phòng",
      "Điện cũ",
      "Điện mới",
      "Điện dùng (kWh)",
      "Tiền điện (VND)",
      "Số người dùng nước",
      "Tiền nước (VND)",
      "Tiền wifi (VND)",
      "Số xe",
      "Tiền giữ xe (VND)",
      "Tổng tiền dịch vụ (VND)",
    ];
    const rows = propertyRooms.map((room) => {
      const entry = matrixData[room.id] || { prevElec: 0, currElec: 0, waterOccupants: 1, wifiCount: 1, vehicleCount: 1 };
      const elecUsage = Math.max(0, entry.currElec - entry.prevElec);
      const elecCost = elecUsage * activeElecRate;
      const waterCost = entry.waterOccupants * activeWaterRate;
      const wifiCost = entry.wifiCount * fixedWifiRate;
      const vehicleCost = entry.vehicleCount * fixedVehicleRate;
      const roomTotal = elecCost + waterCost + wifiCost + vehicleCost;
      return [
        `Phòng ${room.roomNumber}`,
        entry.prevElec,
        entry.currElec,
        elecUsage,
        elecCost,
        entry.waterOccupants,
        waterCost,
        wifiCost,
        entry.vehicleCount,
        vehicleCost,
        roomTotal,
      ];
    });

    exportTableToCsv(
      `Bao_cao_dich_vu_${billingMonth}_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows,
    );
  };

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="main-container">
        {/* Page header */}
        <motion.div
          className="page-title-row"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="page-title">Điện, Nước &amp; Dịch vụ</h1>
            <p className="page-desc">Nhập chỉ số hàng loạt cả tòa nhà, tính tiền điện nước, wifi, giữ xe theo tháng.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {activeTab === "matrix" && (
              <>
                <motion.button
                  type="button"
                  className="btn-secondary"
                  onClick={exportMatrixCSV}
                  disabled={propertyRooms.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  title="Xuất bảng báo cáo sử dụng ra file CSV"
                >
                  <DownloadSimple size={14} />
                  Xuất Excel
                </motion.button>
                <motion.button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveBulkMatrix}
                  disabled={savingMatrix || propertyRooms.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <CheckCircle size={14} weight="bold" />
                  {savingMatrix ? "Đang lưu..." : "Lưu chỉ số cả nhà"}
                </motion.button>
              </>
            )}
            {activeTab === "readings" && (
              <>
                <motion.button
                  type="button"
                  className="btn-secondary"
                  onClick={exportReadingsCSV}
                  disabled={readings.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <DownloadSimple size={14} />
                  Xuất CSV
                </motion.button>
                <motion.button
                  type="button"
                  className={showAddReading ? "btn-secondary" : "btn-primary"}
                  onClick={() => setShowAddReading(!showAddReading)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {showAddReading ? <X size={14} /> : <Plus size={14} weight="bold" />}
                  {showAddReading ? "Đóng" : "Ghi thủ công"}
                </motion.button>
              </>
            )}
            {activeTab === "rates" && (
              <motion.button
                type="button"
                className={showAddRate ? "btn-secondary" : "btn-primary"}
                onClick={() => setShowAddRate(!showAddRate)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {showAddRate ? <X size={14} /> : <Plus size={14} weight="bold" />}
                {showAddRate ? "Đóng" : "Thêm đơn giá"}
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div className="alert-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} style={{ marginBottom: "var(--space-2)" }}>
              {error}
            </motion.div>
          )}
          {matrixSuccess && (
            <motion.div style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--color-success)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "10px 14px", borderRadius: 8, fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--space-2)" }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <CheckCircle size={16} weight="fill" />
              <span>{matrixSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-2)" }}>
          <motion.button
            type="button"
            className={activeTab === "matrix" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "var(--text-sm)" }}
            onClick={() => setActiveTab("matrix")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Nhập chỉ số hàng loạt
          </motion.button>
          <motion.button
            type="button"
            className={activeTab === "rates" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "var(--text-sm)" }}
            onClick={() => setActiveTab("rates")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Đơn giá dịch vụ ({rates.length})
          </motion.button>
          <motion.button
            type="button"
            className={activeTab === "readings" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "6px 14px", fontSize: "var(--text-sm)" }}
            onClick={() => setActiveTab("readings")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Lịch sử chỉ số ({readings.length})
          </motion.button>
        </div>

        {/* ── TAB 1: BULK USAGE MATRIX ────────────────────────────────────── */}
        {activeTab === "matrix" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Top filter bar: Select Property & Month */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px var(--space-3)",
              backgroundColor: "var(--color-bg)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label htmlFor="m-prop" style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-3)", margin: 0 }}>
                    Nhà trọ:
                  </label>
                  <select
                    id="m-prop"
                    className="form-control"
                    style={{ minWidth: 180, height: 34, fontSize: "var(--text-xs)" }}
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label htmlFor="m-month" style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-fg-3)", margin: 0 }}>
                    Tháng:
                  </label>
                  <FluentDatePicker
                    id="m-month"
                    mode="month"
                    value={billingMonth}
                    onChange={(val) => setBillingMonth(val)}
                  />
                </div>
              </div>

              {/* Rates preview summary */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "11.5px", color: "var(--color-fg-3)", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "var(--color-fg-2)" }}>Đơn giá:</span>
                <span>Điện: <strong style={{ color: "var(--color-fg)" }}>{money.format(activeElecRate)}/kWh</strong></span>
                <span style={{ color: "var(--color-border)" }}>•</span>
                <span>Nước: <strong style={{ color: "var(--color-fg)" }}>{money.format(activeWaterRate)}/người</strong></span>
                <span style={{ color: "var(--color-border)" }}>•</span>
                <span>Wifi: <strong style={{ color: "var(--color-fg)" }}>{money.format(fixedWifiRate)}/tháng</strong></span>
                <span style={{ color: "var(--color-border)" }}>•</span>
                <span>Gửi xe: <strong style={{ color: "var(--color-fg)" }}>{money.format(fixedVehicleRate)}/xe</strong></span>
              </div>
            </div>

            {/* Matrix Table with Clean Layout */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-responsive" style={{ overflowX: "auto" }}>
                <table className="matrix-table" style={{ width: "100%", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ minWidth: 90, verticalAlign: "middle" }}>
                        Phòng
                      </th>
                      <th colSpan={4} style={{ textAlign: "center", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)" }} className="matrix-th-group">
                        Điện ({money.format(activeElecRate)}/kWh)
                      </th>
                      <th colSpan={2} style={{ textAlign: "center", borderRight: "1px solid var(--color-border)" }} className="matrix-th-group">
                        Nước ({money.format(activeWaterRate)}/người)
                      </th>
                      <th rowSpan={2} style={{ textAlign: "right", borderRight: "1px solid var(--color-border)", minWidth: 75, verticalAlign: "middle" }}>
                        <div>Wifi</div>
                        <div style={{ fontSize: 10, fontWeight: 400, color: "var(--color-fg-3)" }}>{money.format(fixedWifiRate)}</div>
                      </th>
                      <th colSpan={2} style={{ textAlign: "center", borderRight: "1px solid var(--color-border)" }} className="matrix-th-group">
                        Gửi xe ({money.format(fixedVehicleRate)}/xe)
                      </th>
                      <th rowSpan={2} style={{ textAlign: "right", minWidth: 95, verticalAlign: "middle" }}>
                        Tổng dịch vụ
                      </th>
                    </tr>
                    <tr className="matrix-th-sub">
                      <th style={{ borderLeft: "1px solid var(--color-border)", width: 60, textAlign: "right" }}>Số cũ</th>
                      <th style={{ width: 68, textAlign: "right" }}>Số mới</th>
                      <th style={{ width: 48, textAlign: "right" }}>Dùng</th>
                      <th style={{ borderRight: "1px solid var(--color-border)", width: 80, textAlign: "right" }}>Tiền điện</th>
                      <th style={{ width: 50, textAlign: "right" }}>Số người</th>
                      <th style={{ borderRight: "1px solid var(--color-border)", width: 80, textAlign: "right" }}>Tiền nước</th>
                      <th style={{ width: 48, textAlign: "right" }}>Số xe</th>
                      <th style={{ borderRight: "1px solid var(--color-border)", width: 80, textAlign: "right" }}>Tiền xe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Top Summary Row */}
                    <tr className="matrix-summary-row">
                      <td style={{ fontWeight: 700, color: "var(--color-fg)" }}>Tổng cộng:</td>
                      <td style={{ borderLeft: "1px solid var(--color-border)", textAlign: "center", color: "var(--color-fg-3)" }}>—</td>
                      <td style={{ textAlign: "center", color: "var(--color-fg-3)" }}>—</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{totalElecKWh.toFixed(0)} kWh</td>
                      <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money.format(totalElecCost)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{totalWaterOccupants} ng</td>
                      <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money.format(totalWaterCost)}</td>
                      <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money.format(totalWifiCost)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{totalVehicleCount} xe</td>
                      <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money.format(totalVehicleCost)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-primary)", fontVariantNumeric: "tabular-nums" }}>{money.format(grandTotalServices)}</td>
                    </tr>

                    {/* Room rows */}
                    {loadingRooms ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: 32 }}>
                          <span className="spinner" role="status" aria-label="Đang tải" /> Đang tải danh sách phòng...
                        </td>
                      </tr>
                    ) : propertyRooms.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--color-fg-3)" }}>
                          Nhà trọ này chưa có phòng nào. Hãy thêm phòng tại mục Nhà trọ &amp; Phòng.
                        </td>
                      </tr>
                    ) : (
                      propertyRooms.map((room) => {
                        const entry = matrixData[room.id] || { prevElec: 0, currElec: 0, waterOccupants: 1, wifiCount: 1, vehicleCount: 1 };
                        const elecUsage = Math.max(0, entry.currElec - entry.prevElec);
                        const elecCost = elecUsage * activeElecRate;
                        const waterCost = entry.waterOccupants * activeWaterRate;
                        const wifiCost = entry.wifiCount * fixedWifiRate;
                        const vehicleCost = entry.vehicleCount * fixedVehicleRate;
                        const roomTotal = elecCost + waterCost + wifiCost + vehicleCost;

                        return (
                          <tr key={room.id}>
                            <td style={{ fontWeight: 600 }}>
                              Phòng {room.roomNumber}
                            </td>

                            {/* Electricity: prev, curr input, usage, cost */}
                            <td style={{ borderLeft: "1px solid var(--color-border)" }}>
                              <input
                                type="number"
                                className="matrix-input"
                                value={entry.prevElec}
                                onChange={(e) => updateMatrixField(room.id, "prevElec", parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="matrix-input matrix-input-primary"
                                value={entry.currElec}
                                onChange={(e) => updateMatrixField(room.id, "currElec", parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                              {elecUsage.toFixed(0)}
                            </td>
                            <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12, fontWeight: 500 }}>
                              {money.format(elecCost)}
                            </td>

                            {/* Water: occupants, cost */}
                            <td>
                              <input
                                type="number"
                                className="matrix-input"
                                min={0}
                                max={20}
                                value={entry.waterOccupants}
                                onChange={(e) => updateMatrixField(room.id, "waterOccupants", parseInt(e.target.value, 10) || 0)}
                              />
                            </td>
                            <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                              {money.format(waterCost)}
                            </td>

                            {/* Wifi: cost */}
                            <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                              {money.format(wifiCost)}
                            </td>

                            {/* Vehicles: count, cost */}
                            <td>
                              <input
                                type="number"
                                className="matrix-input"
                                min={0}
                                max={10}
                                value={entry.vehicleCount}
                                onChange={(e) => updateMatrixField(room.id, "vehicleCount", parseInt(e.target.value, 10) || 0)}
                              />
                            </td>
                            <td style={{ borderRight: "1px solid var(--color-border)", textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>
                              {money.format(vehicleCost)}
                            </td>

                            {/* Room total */}
                            <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--color-fg)" }}>
                              {money.format(roomTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div style={{
                padding: "10px var(--space-3)",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "var(--text-xs)",
                color: "var(--color-fg-3)",
              }}>
                <span>Tổng số phòng tính tiền: <strong>{propertyRooms.length}</strong></span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-fg)" }}>
                  Tổng doanh thu dịch vụ tháng {billingMonth}: <strong style={{ color: "var(--color-primary)" }}>{money.format(grandTotalServices)}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: UTILITY RATES ────────────────────────────────────────── */}
        {activeTab === "rates" && (
          <div>
            {loading ? (
              <div className="card" style={{ padding: "var(--space-3)" }}>
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : rates.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"><CurrencyDollar size={28} /></div>
                  <p className="text-muted" style={{ margin: 0 }}>Chưa có biểu giá nào được thiết lập.</p>
                </div>
              </div>
            ) : (
              <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Loại tiện ích</th>
                        <th>Đơn giá</th>
                        <th>Hiệu lực từ</th>
                        <th>Hiệu lực đến</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((rate, i) => (
                        <motion.tr key={rate.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              {rate.utilityType === "electricity" ? (
                                <><Lightning size={14} weight="fill" /> Điện (kWh)</>
                              ) : (
                                <><Drop size={14} weight="fill" /> Nước (m³)</>
                              )}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money.format(rate.unitPrice)}</td>
                          <td className="text-muted">{rate.effectiveFrom}</td>
                          <td className="text-muted">{rate.effectiveTo ?? "Hiện tại"}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── TAB 3: READINGS HISTORY ────────────────────────────────────── */}
        {activeTab === "readings" && (
          <div>
            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-2)" }}>
              <button
                type="button"
                className={filterType === "all" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)" }}
                onClick={() => setFilterType("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={filterType === "electricity" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => setFilterType("electricity")}
              >
                <Lightning size={12} weight="fill" /> Điện
              </button>
              <button
                type="button"
                className={filterType === "water" ? "btn-primary" : "btn-ghost"}
                style={{ padding: "4px 12px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                onClick={() => setFilterType("water")}
              >
                <Drop size={12} weight="fill" /> Nước
              </button>
            </div>

            {loading ? (
              <div className="card" style={{ padding: "var(--space-3)" }}>
                <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 40 }} />
              </div>
            ) : filteredReadings.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-icon"><Receipt size={28} /></div>
                  <p className="text-muted" style={{ margin: 0 }}>Chưa có bản ghi chỉ số nào.</p>
                </div>
              </div>
            ) : (
              <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Phòng / Nhà</th>
                        <th>Loại</th>
                        <th>Kỳ tính</th>
                        <th>Chỉ số cũ</th>
                        <th>Chỉ số mới</th>
                        <th>Tiêu thụ</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                        <th style={{ textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReadings.map((reading, i) => {
                        const usage = Number(reading.currentValue) - Number(reading.previousValue);
                        const cost = usage * reading.unitPriceSnapshot;
                        return (
                          <motion.tr key={reading.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <Door size={13} style={{ color: "var(--color-fg-3)" }} />
                                  Phòng {reading.roomNumber}
                                </span>
                                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Buildings size={11} />{reading.propertyName}
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                {reading.utilityType === "electricity" ? (
                                  <><Lightning size={10} weight="fill" /> Điện</>
                                ) : (
                                  <><Drop size={10} weight="fill" /> Nước</>
                                )}
                              </span>
                            </td>
                            <td className="text-muted">{reading.billingPeriod}</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{reading.previousValue}</td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{reading.currentValue}</td>
                            <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                              {usage.toFixed(1)} {reading.utilityType === "electricity" ? "kWh" : "m³"}
                            </td>
                            <td style={{ fontVariantNumeric: "tabular-nums" }}>{money.format(reading.unitPriceSnapshot)}</td>
                            <td style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money.format(cost)}</td>
                            <td style={{ textAlign: "right" }}>
                              {user?.role === "owner" && (
                                <motion.button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => void handleDeleteReading(reading)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  title="Xóa chỉ số"
                                >
                                  <Trash size={12} />
                                </motion.button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Add Reading Panel */}
        <AnimatePresence>
          {showAddReading && (
            <SlidePanel title="Ghi chỉ số mới" onClose={() => setShowAddReading(false)}>
              <form onSubmit={handleCreateReading}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-prop">Chọn Nhà trọ *</label>
                    <select
                      id="r-prop"
                      className="form-control"
                      value={rPropId}
                      onChange={async (e) => {
                        const pId = e.target.value;
                        setRPropId(pId);
                        if (pId) {
                          try {
                            const res = await apiClient<{ rooms: RoomRow[] }>(`/api/properties/${pId}/rooms`);
                            setReadingFormRooms(res.rooms || []);
                            if (res.rooms && res.rooms.length > 0) {
                              setRRoomId(res.rooms[0].id);
                            }
                          } catch {
                            setReadingFormRooms([]);
                            setRRoomId("");
                          }
                        } else {
                          setReadingFormRooms([]);
                          setRRoomId("");
                        }
                      }}
                      required
                      autoFocus
                    >
                      <option value="">-- Chọn nhà trọ --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-room">Chọn Phòng *</label>
                    <select
                      id="r-room"
                      className="form-control"
                      value={rRoomId}
                      onChange={(e) => setRRoomId(e.target.value)}
                      required
                      disabled={!rPropId}
                    >
                      <option value="">{rPropId ? "-- Chọn phòng --" : "-- Hãy chọn nhà trọ trước --"}</option>
                      {readingFormRooms.map((r) => (
                        <option key={r.id} value={r.id}>Phòng {r.roomNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-type">Loại tiện ích *</label>
                    <select id="r-type" className="form-control" value={rType} onChange={(e) => setRType(e.target.value as UtilityType)}>
                      <option value="electricity">Điện (kWh)</option>
                      <option value="water">Nước (m³)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-period">Kỳ hóa đơn (Ngày 01 đầu tháng) *</label>
                    <FluentDatePicker
                      id="r-period"
                      mode="date"
                      value={rPeriod}
                      onChange={(val) => setRPeriod(val)}
                      placeholder="Chọn ngày lập kỳ"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-prev">Chỉ số cũ *</label>
                    <input id="r-prev" type="number" step="0.001" min="0" className="form-control" placeholder="VD: 100" value={rPrev} onChange={(e) => setRPrev(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-curr">Chỉ số mới *</label>
                    <input id="r-curr" type="number" step="0.001" min="0" className="form-control" placeholder="VD: 150" value={rCurr} onChange={(e) => setRCurr(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="r-price">Đơn giá áp dụng (VND) *</label>
                    <input id="r-price" type="number" min="0" className="form-control" placeholder="VD: 3500" value={rPrice} onChange={(e) => setRPrice(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddReading(false)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingReading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingReading ? "Đang lưu..." : "Lưu chỉ số"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>

        {/* Add Rate Panel */}
        <AnimatePresence>
          {showAddRate && (
            <SlidePanel title="Thêm đơn giá mới" onClose={() => setShowAddRate(false)}>
              <form onSubmit={handleCreateRate}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-prop">Chọn Nhà trọ *</label>
                    <select
                      id="rate-prop"
                      className="form-control"
                      value={ratePropId}
                      onChange={(e) => setRatePropId(e.target.value)}
                      required
                      autoFocus
                    >
                      <option value="">-- Chọn nhà trọ --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-type">Loại tiện ích *</label>
                    <select id="rate-type" className="form-control" value={rateType} onChange={(e) => setRateType(e.target.value as UtilityType)}>
                      <option value="electricity">Điện (kWh)</option>
                      <option value="water">Nước (m³)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-price">Đơn giá (VND) *</label>
                    <input id="rate-price" type="number" min="0" className="form-control" placeholder="VD: 3500" value={ratePrice} onChange={(e) => setRatePrice(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="rate-from">Hiệu lực từ *</label>
                    <FluentDatePicker
                      id="rate-from"
                      mode="date"
                      value={rateFrom}
                      onChange={(val) => setRateFrom(val)}
                      placeholder="Chọn ngày hiệu lực"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
                  <button type="button" className="btn-ghost" onClick={() => setShowAddRate(false)}>Hủy</button>
                  <motion.button type="submit" className="btn-primary" disabled={submittingRate} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {submittingRate ? "Đang lưu..." : "Lưu đơn giá"}
                  </motion.button>
                </div>
              </form>
            </SlidePanel>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
