"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  House,
  Buildings,
  Receipt,
  Lightning,
  Drop,
  QrCode,
  Printer,
  Clock,
  CheckCircle,
  WarningCircle,
  Wrench,
  Copy,
  Check,
  DownloadSimple,
  X,
  Bank,
  ArrowsClockwise,
  Plus,
  FileText,
  IdentificationCard,
  PencilSimple,
  MagnifyingGlass,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";

import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { buildVietQrUrl, formatBankDisplayName } from "../../utils/vietqr";
import { PrintableInvoiceModal } from "../invoices/printable-invoice-modal";
import { PrintableContractModal } from "../contracts/printable-contract-modal";
import { PrintableCt01Modal } from "./printable-ct01-modal";
import type { InvoiceDetail, InvoiceStatus } from "../../modules/invoices/invoice.service";
import type { TenantPortalData, TenantProfile } from "../../modules/tenant-portal/tenant-portal.service";
import type { ContractRow } from "../../modules/contracts/contract.service";
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceRow,
  MaintenanceStatus,
} from "../../modules/maintenance/maintenance.service";
import { money, formatPhoneNumber } from "../../utils/format";

const formatBillingPeriod = (period: string) => {
  const parts = period.split("-");
  if (parts.length >= 2) return `Tháng ${parts[1]}/${parts[0]}`;
  return period;
};

const formatDateVN = (d: string | null) => {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  draft:          { label: "Bản nháp",      cls: "badge neutral",     Icon: Clock },
  issued:         { label: "Chờ thanh toán",cls: "badge maintenance", Icon: WarningCircle },
  partially_paid: { label: "Trả một phần",  cls: "badge maintenance", Icon: Clock },
  paid:           { label: "Đã thanh toán", cls: "badge ready",       Icon: CheckCircle },
  cancelled:      { label: "Đã hủy",        cls: "badge",             Icon: WarningCircle },
};

const MNT_STATUS_CONFIG: Record<MaintenanceStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  pending:     { label: "Đang chờ tiếp nhận", cls: "badge neutral",     Icon: Clock },
  in_progress: { label: "Đang sửa chữa",     cls: "badge maintenance", Icon: Wrench },
  resolved:    { label: "Đã hoàn thành",     cls: "badge ready",       Icon: CheckCircle },
  cancelled:   { label: "Đã hủy",            cls: "badge",             Icon: WarningCircle },
};

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Cấp thoát nước",
  electrical: "Điện sinh hoạt",
  appliance: "Thiết bị / Đồ dùng",
  internet: "Mạng / Internet",
  structural: "Cơ sở vật chất",
  other: "Khác",
};

const PRIORITY_LABELS: Record<MaintenancePriority, { label: string; color: string; bg: string }> = {
  low: { label: "Thấp", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  medium: { label: "Bình thường", color: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  high: { label: "Cao", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
  urgent: { label: "Khẩn cấp", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
};

export function TenantPortalView() {
  const { user } = useAuth();
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);

  // Maintenance state
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRow[]>([]);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [submittingMnt, setSubmittingMnt] = useState(false);
  const [cancellingMntId, setCancellingMntId] = useState<string | null>(null);
  const [mTitle, setMTitle] = useState("");
  const [mCategory, setMCategory] = useState<MaintenanceCategory>("plumbing");
  const [mPriority, setMPriority] = useState<MaintenancePriority>("medium");
  const [mDescription, setMDescription] = useState("");
  const [mPhotoUrl, setMPhotoUrl] = useState("");

  // Invoices search, filter & pagination state
  const [invSearch, setInvSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState<string>("all");
  const [invPage, setInvPage] = useState(1);
  const INV_PAGE_SIZE = 5;

  // Toast / error state
  const [profileError, setProfileError] = useState<string | null>(null);
  const [mntError, setMntError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // VietQR modal state
  const [qrInvoice, setQrInvoice] = useState<InvoiceDetail | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notifyingPayment, setNotifyingPayment] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Printable modals
  const [printInvoice, setPrintInvoice] = useState<InvoiceDetail | null>(null);
  const [printContract, setPrintContract] = useState<ContractRow | null>(null);
  const [showCt01Modal, setShowCt01Modal] = useState(false);

  // Profile self-service modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [pFullName, setPFullName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pBirthDate, setPBirthDate] = useState("");
  const [pCitizenId, setPCitizenId] = useState("");
  const [pHometown, setPHometown] = useState("");
  const [pVehicleNumber, setPVehicleNumber] = useState("");
  const [pEmergencyName, setPEmergencyName] = useState("");
  const [pEmergencyPhone, setPEmergencyPhone] = useState("");
  const [pIdCardFrontUrl, setPIdCardFrontUrl] = useState("");
  const [pIdCardBackUrl, setPIdCardBackUrl] = useState("");

  // Accessibility: Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowProfileModal(false);
        setShowMaintenanceModal(false);
        setQrInvoice(null);
        setPrintInvoice(null);
        setPrintContract(null);
        setShowCt01Modal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (showProfileModal) setProfileError(null);
  }, [showProfileModal]);

  useEffect(() => {
    if (showMaintenanceModal) setMntError(null);
  }, [showMaintenanceModal]);

  const handleImageFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    errorSetter?: (err: string | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      if (errorSetter) errorSetter("Kích thước ảnh tối đa là 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
        if (errorSetter) errorSetter(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadData = useCallback(async (roomId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url = roomId ? `/api/tenant-portal?roomId=${encodeURIComponent(roomId)}` : "/api/tenant-portal";
      const res = await apiClient<TenantPortalData>(url);
      setData(res);

      if (res.tenant) {
        setPFullName(res.tenant.fullName || "");
        setPPhone(res.tenant.phone || "");
        setPBirthDate(res.tenant.birthDate || "");
        setPCitizenId(res.tenant.citizenId || "");
        setPHometown(res.tenant.hometown || "");
        setPVehicleNumber(res.tenant.vehicleNumber || "");
        setPEmergencyName(res.tenant.emergencyContactName || "");
        setPEmergencyPhone(res.tenant.emergencyContactPhone || "");
        setPIdCardFrontUrl(res.tenant.idCardFrontUrl || "");
        setPIdCardBackUrl(res.tenant.idCardBackUrl || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông tin cổng khách thuê.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaintenance = useCallback(async () => {
    try {
      const res = await apiClient<{ requests: MaintenanceRow[] }>("/api/maintenance");
      setMaintenanceRequests(res.requests);
    } catch {
      // ignore
    }
  }, []);

  const handleCreateMaintenance = async (e: FormEvent) => {
    e.preventDefault();
    if (!data?.stay) return;
    try {
      setSubmittingMnt(true);
      await apiClient("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          roomId: data.stay.roomId,
          title: mTitle.trim(),
          category: mCategory,
          priority: mPriority,
          description: mDescription.trim(),
          photoUrl: mPhotoUrl.trim() || undefined,
        }),
      });
      setShowMaintenanceModal(false);
      setMTitle("");
      setMDescription("");
      setMPhotoUrl("");
      await loadMaintenance();
    } catch (err) {
      setMntError(err instanceof Error ? err.message : "Gửi yêu cầu sửa chữa thất bại.");
    } finally {
      setSubmittingMnt(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingProfile(true);
      await apiClient<{ tenant: TenantProfile }>("/api/tenant-portal", {
        method: "PUT",
        body: JSON.stringify({
          fullName: pFullName.trim(),
          phone: pPhone.trim() || null,
          birthDate: pBirthDate || null,
          citizenId: pCitizenId.trim() || null,
          hometown: pHometown.trim() || null,
          vehicleNumber: pVehicleNumber.trim() || null,
          emergencyContactName: pEmergencyName.trim() || null,
          emergencyContactPhone: pEmergencyPhone.trim() || null,
          idCardFrontUrl: pIdCardFrontUrl.trim() || null,
          idCardBackUrl: pIdCardBackUrl.trim() || null,
        }),
      });
      setShowProfileModal(false);
      await loadData(selectedRoomId);
      setPaymentSuccessToast("Cập nhật hồ sơ cá nhân & tạm trú thành công!");
      setTimeout(() => setPaymentSuccessToast(null), 5000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.");
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleNotifyPayment = async (invoiceId: string) => {
    try {
      setNotifyingPayment(true);
      setPaymentError(null);
      const res = await apiClient<{ success: boolean; message: string }>("/api/tenant-portal", {
        method: "POST",
        body: JSON.stringify({ action: "notify-payment", invoiceId }),
      });
      setQrInvoice(null);
      setPaymentSuccessToast(res.message);
      setTimeout(() => setPaymentSuccessToast(null), 6000);
    } catch (err: unknown) {
      setPaymentError(err instanceof Error ? err.message : "Không thể gửi thông báo chuyển khoản.");
    } finally {
      setNotifyingPayment(false);
    }
  };

  const handleCancelMaintenance = async (requestId: string) => {
    if (!window.confirm("Bạn có chắc muốn hủy yêu cầu sửa chữa này không?")) return;
    try {
      setCancellingMntId(requestId);
      await apiClient(`/api/maintenance/${requestId}`, {
        method: "DELETE",
      });
      await loadMaintenance();
      setPaymentSuccessToast("Đã hủy yêu cầu sửa chữa thành công.");
      setTimeout(() => setPaymentSuccessToast(null), 4000);
    } catch (err) {
      setPaymentSuccessToast(err instanceof Error ? err.message : "Không thể hủy yêu cầu.");
      setTimeout(() => setPaymentSuccessToast(null), 4000);
    } finally {
      setCancellingMntId(null);
    }
  };

  useEffect(() => {
    void loadData(selectedRoomId);
    void loadMaintenance();
  }, [loadData, loadMaintenance, selectedRoomId]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  const { tenant, stay, stays, contract, invoices, meters } = data || {
    tenant: null,
    stay: null,
    stays: [],
    contract: null,
    invoices: [],
    meters: [],
  };

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status === "issued" || inv.status === "partially_paid",
  );
  const urgentInvoice = unpaidInvoices[0] ?? null;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invStatusFilter !== "all" && inv.status !== invStatusFilter) return false;
      if (invSearch.trim()) {
        const q = invSearch.toLowerCase();
        const period = formatBillingPeriod(inv.billingPeriodStart).toLowerCase();
        const room = `phòng ${inv.roomNumber}`.toLowerCase();
        if (!period.includes(q) && !room.includes(q) && !inv.roomNumber.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, invSearch, invStatusFilter]);

  const totalInvPages = Math.max(1, Math.ceil(filteredInvoices.length / INV_PAGE_SIZE));
  const paginatedInvoices = useMemo(() => {
    const start = (invPage - 1) * INV_PAGE_SIZE;
    return filteredInvoices.slice(start, start + INV_PAGE_SIZE);
  }, [filteredInvoices, invPage]);

  if (loading) {
    return (
      <main className="main-container">
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="skeleton" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />
          <div className="stats-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="stat-card skeleton" style={{ minHeight: 110 }} />
            ))}
          </div>
          <div className="card skeleton" style={{ height: 260 }} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="main-container">
        <div className="card" style={{ padding: "var(--space-4)", textAlign: "center", maxWidth: 460, margin: "40px auto" }}>
          <div style={{ color: "#ef4444", marginBottom: 12, display: "flex", justifyContent: "center" }}>
            <WarningCircle size={44} weight="fill" />
          </div>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 8px" }}>
            Không thể tải dữ liệu cổng khách thuê
          </h2>
          <p className="text-muted" style={{ margin: "0 0 16px", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
            {error}
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 auto" }}
            onClick={() => void loadData(selectedRoomId)}
          >
            <ArrowsClockwise size={16} /> Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-container">
      {/* Toast Notification when payment notification sent */}
      <AnimatePresence>
        {paymentSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#059669",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--space-3)",
            }}
          >
            <CheckCircle size={20} weight="fill" />
            <span>{paymentSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Banner */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)",
          borderColor: "rgba(37, 99, 235, 0.25)",
          padding: "var(--space-3)",
          marginBottom: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", background: "rgba(37, 99, 235, 0.15)", borderRadius: 12, fontSize: "var(--text-xs)", color: "var(--color-primary)", fontWeight: 600, marginBottom: 6 }}>
              <House size={12} weight="bold" /> Cổng thông tin Khách thuê
            </div>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: "2px 0 6px" }}>
              Xin chào, {tenant?.fullName || user?.email || "Bạn"}!
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-sm)" }}>
              {stay ? (
                <>Bạn đang thuê <strong>Phòng {stay.roomNumber}</strong> tại <strong>{stay.propertyName}</strong></>
              ) : (
                "Chào mừng bạn đến với hệ thống quản lý phòng trọ trực tuyến."
              )}
            </p>

            {/* Multi-stay Selector if tenant rents more than 1 room */}
            {stays && stays.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-fg-3)", textTransform: "uppercase" }}>
                  Phòng đang xem:
                </span>
                <select
                  className="form-control"
                  style={{ padding: "4px 8px", fontSize: "var(--text-xs)", height: "auto", fontWeight: 600, width: "auto" }}
                  value={stay?.roomId || ""}
                  onChange={(e) => {
                    setSelectedRoomId(e.target.value);
                  }}
                >
                  {stays.map((s) => (
                    <option key={s.roomId} value={s.roomId}>
                      {s.propertyName} - Phòng {s.roomNumber} {s.contractStatus === "active" ? "(Đang hiệu lực)" : "(Đã kết thúc)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setShowProfileModal(true)}
              title="Cập nhật CCCD, quê quán, biển số xe"
            >
              <PencilSimple size={14} /> Sửa hồ sơ tạm trú
            </button>

            {contract && (
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => setPrintContract(contract)}
                title="Xem & In Hợp đồng thuê chuẩn A4"
              >
                <FileText size={14} /> Xem & In Hợp đồng
              </button>
            )}

            {stay && (
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                onClick={() => setShowMaintenanceModal(true)}
              >
                <Wrench size={14} /> Báo sự cố
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* If tenant not yet linked to any contract */}
      {!stay && (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-4) var(--space-2)", marginBottom: "var(--space-3)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.1)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-2)" }}>
            <Buildings size={28} />
          </div>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: 8 }}>
            Tài khoản chưa liên kết với phòng trọ
          </h2>
          <p className="text-muted" style={{ maxWidth: 460, margin: "0 auto var(--space-2)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
            Vui lòng cung cấp Số điện thoại (<strong>{tenant?.phone ? formatPhoneNumber(tenant.phone) : (user?.email || "của bạn")}</strong>) cho Chủ nhà / Quản lý để được thêm vào hợp đồng phòng trọ. Sau khi được thêm, bạn sẽ thấy thông tin phòng, chỉ số điện nước và hóa đơn hàng tháng tại đây.
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowProfileModal(true)}
          >
            <PencilSimple size={14} /> Cập nhật số điện thoại & hồ sơ
          </button>
        </div>
      )}

      {/* Urgent Payment Callout */}
      {urgentInvoice && urgentInvoice.status !== "paid" && urgentInvoice.status !== "cancelled" && (
        <motion.div
          className="card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)",
            borderColor: "rgba(239, 68, 68, 0.35)",
            marginBottom: "var(--space-3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            padding: "var(--space-3)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-danger, #ef4444)", fontWeight: 700, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              <WarningCircle size={16} weight="bold" /> Hóa đơn cần thanh toán
            </div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "4px 0" }}>
              {formatBillingPeriod(urgentInvoice.billingPeriodStart)} • Phòng {urgentInvoice.roomNumber}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>
              Hạn nộp tiền: <strong>{urgentInvoice.dueDate || "Ngày 10 cùng tháng"}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tiền còn nợ:</div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-danger, #ef4444)", fontFamily: "var(--font-mono)" }}>
                {money.format(Math.max(0, urgentInvoice.totalAmount - (urgentInvoice.paidAmount || 0)))}
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: "var(--text-sm)",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
              }}
              onClick={() => setQrInvoice(urgentInvoice)}
            >
              <QrCode size={18} weight="bold" /> Quét mã VietQR trả tiền
            </button>
          </div>
        </motion.div>
      )}

      {/* Stay Details Grid */}
      {stay && (
        <div className="portal-cards-grid">
          {/* Room info card */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(37,99,235,0.1)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Buildings size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                    Thông tin phòng thuê
                  </h2>
                  {stay.contractStatus === "active" ? (
                    <span className="badge ready" style={{ fontSize: "10px" }}>Hợp đồng hiệu lực</span>
                  ) : stay.contractStatus === "terminated" ? (
                    <span className="badge" style={{ fontSize: "10px" }}>Đã thanh lý</span>
                  ) : stay.contractStatus === "expired" ? (
                    <span className="badge maintenance" style={{ fontSize: "10px" }}>Đã hết hạn</span>
                  ) : (
                    <span className="badge" style={{ fontSize: "10px" }}>{stay.contractStatus || "Chưa kích hoạt"}</span>
                  )}
                </div>
              </div>

              {contract && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => setPrintContract(contract)}
                  title="Xem hợp đồng chi tiết"
                >
                  <FileText size={13} /> Hợp đồng
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
              <div className="portal-info-row">
                <span className="portal-info-label">Nhà trọ:</span>
                <strong className="portal-info-value">{stay.propertyName}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Phòng số:</span>
                <strong className="portal-info-value" style={{ color: "var(--color-primary)", fontSize: "var(--text-sm)" }}>Phòng {stay.roomNumber}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Địa chỉ:</span>
                <span className="portal-info-value">{stay.propertyAddress || "—"}</span>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Tiền phòng/tháng:</span>
                <strong className="portal-info-value" style={{ fontFamily: "var(--font-mono)" }}>{money.format(stay.monthlyRent)}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Tiền cọc giữ chỗ:</span>
                <strong className="portal-info-value" style={{ fontFamily: "var(--font-mono)" }}>{money.format(stay.deposit)}</strong>
              </div>
            </div>
          </div>

          {/* Profile & Temporary Residence Card */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(16,185,129,0.1)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IdentificationCard size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                    Hồ sơ tạm trú & Xe
                  </h2>
                  {tenant?.citizenId && tenant?.idCardFrontUrl && tenant?.idCardBackUrl ? (
                    <span className="badge ready" style={{ fontSize: "10px" }}>Đã nộp đủ hồ sơ CT01</span>
                  ) : (
                    <span className="badge maintenance" style={{ fontSize: "10px" }}>Cần bổ sung hồ sơ CT01</span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => setShowCt01Modal(true)}
                  title="Xem & In tờ khai thay đổi thông tin cư trú CT01"
                >
                  <FileText size={13} color="var(--color-primary)" /> Mẫu CT01
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                  onClick={() => setShowProfileModal(true)}
                  title="Cập nhật hồ sơ & khai báo tạm trú"
                >
                  <PencilSimple size={13} /> Sửa
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
              <div className="portal-info-row">
                <span className="portal-info-label">Họ và tên:</span>
                <strong className="portal-info-value">{tenant?.fullName}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Số điện thoại:</span>
                <strong className="portal-info-value">{tenant?.phone ? formatPhoneNumber(tenant.phone) : "Chưa cập nhật"}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Ngày sinh:</span>
                <span className="portal-info-value">{tenant?.birthDate ? formatDateVN(tenant.birthDate) : "Chưa cập nhật"}</span>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Số CCCD:</span>
                <strong className="portal-info-value">{tenant?.citizenId || "Chưa cập nhật"}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Biển số xe gửi:</span>
                <strong className="portal-info-value">{tenant?.vehicleNumber || "Chưa đăng ký"}</strong>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">Thường trú / Quê quán:</span>
                <span className="portal-info-value">{tenant?.hometown || "Chưa cập nhật"}</span>
              </div>
              <div className="portal-info-row">
                <span className="portal-info-label">LH khẩn cấp:</span>
                <span className="portal-info-value">
                  {tenant?.emergencyContactName
                    ? `${tenant.emergencyContactName} (${tenant.emergencyContactPhone ? formatPhoneNumber(tenant.emergencyContactPhone) : ""})`
                    : "Chưa cập nhật"}
                </span>
              </div>
            </div>
          </div>

          {/* Landlord VietQR Bank Account info */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(245,158,11,0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bank size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0 }}>
                  Tài khoản nhận tiền chủ trọ
                </h2>
                <span className="text-muted" style={{ fontSize: "var(--text-xs)" }}>Chuyển khoản VietQR</span>
              </div>
            </div>

            {stay.bankCode && stay.bankAccount ? (
              <div style={{ display: "grid", gap: 8, fontSize: "var(--text-xs)" }}>
                <div className="portal-info-row">
                  <span className="portal-info-label">Ngân hàng:</span>
                  <strong className="portal-info-value">
                    {formatBankDisplayName(stay.bankCode)}
                  </strong>
                </div>
                <div className="portal-info-row">
                  <span className="portal-info-label">Số tài khoản:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>{stay.bankAccount}</strong>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "2px 6px" }}
                      onClick={() => void handleCopy(stay.bankAccount!, "stk")}
                      title="Sao chép STK"
                    >
                      {copiedKey === "stk" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <div className="portal-info-row">
                  <span className="portal-info-label">Chủ tài khoản:</span>
                  <strong className="portal-info-value" style={{ textTransform: "uppercase" }}>{stay.accountHolder || "Chủ nhà"}</strong>
                </div>
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: 0, lineHeight: 1.6 }}>
                Chủ nhà chưa cấu hình STK tự động cho nhà trọ này. Vui lòng liên hệ trực tiếp với chủ nhà để nhận thông tin chuyển khoản hoặc thanh toán tiền mặt.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Invoices List Section */}
      <div id="invoices" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Receipt size={20} style={{ color: "var(--color-primary)" }} /> Lịch sử Hóa đơn tiền phòng & Dịch vụ
            </h2>
            <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
              Xem chi tiết các khoản thu, thanh toán qua mã VietQR và in phiếu thu A4.
            </p>
          </div>

          {/* Search & Filter */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: 180 }}>
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 28, height: 32, fontSize: "var(--text-xs)" }}
                placeholder="Tìm kỳ, số phòng..."
                value={invSearch}
                onChange={(e) => {
                  setInvSearch(e.target.value);
                  setInvPage(1);
                }}
              />
              <MagnifyingGlass
                size={14}
                style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--color-fg-3)" }}
              />
            </div>

            <select
              className="input-field"
              style={{ height: 32, fontSize: "var(--text-xs)", width: "auto" }}
              value={invStatusFilter}
              onChange={(e) => {
                setInvStatusFilter(e.target.value);
                setInvPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="issued">Chờ thanh toán</option>
              <option value="partially_paid">Thanh toán một phần</option>
              <option value="paid">Đã thanh toán</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-4) var(--space-3)", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Receipt size={22} />
            </div>
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 6px" }}>
              Chưa có hóa đơn nào được phát hành cho phòng này
            </h3>
            <p className="text-muted" style={{ margin: "0 auto", maxWidth: 480, fontSize: "var(--text-xs)", lineHeight: 1.6 }}>
              Chủ nhà hoặc Quản lý sẽ lập và gửi hóa đơn tiền phòng & dịch vụ định kỳ hàng tháng (thường từ ngày 1 đến ngày 5). Sau khi phát hành, bạn có thể xem chi tiết từng khoản thu và quét mã VietQR để thanh toán trực tiếp tại đây.
            </p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-3)", textAlign: "center" }}>
            <p className="text-muted" style={{ margin: 0, fontSize: "var(--text-xs)" }}>
              Không tìm thấy hóa đơn nào khớp với từ khóa &quot;{invSearch}&quot; hoặc bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kỳ thu</th>
                    <th>Phòng</th>
                    <th>Hạn nộp</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status];
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{formatBillingPeriod(inv.billingPeriodStart)}</td>
                        <td>Phòng {inv.roomNumber}</td>
                        <td className="text-muted">{formatDateVN(inv.dueDate ?? null)}</td>
                        <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {money.format(inv.totalAmount)}
                        </td>
                        <td>
                          <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <cfg.Icon size={10} weight="fill" />
                            {cfg.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            {inv.status !== "paid" && inv.status !== "cancelled" && (
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                                onClick={() => setQrInvoice(inv)}
                                title="Quét mã VietQR"
                              >
                                <QrCode size={13} /> VietQR
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ padding: "4px 8px", fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
                              onClick={() => setPrintInvoice(inv)}
                              title="In phiếu thu / Lưu PDF"
                            >
                              <Printer size={13} /> In / PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalInvPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderTop: "1px solid var(--color-border)",
                  fontSize: "var(--text-xs)",
                }}
              >
                <span className="text-muted">
                  Hiển thị {(invPage - 1) * INV_PAGE_SIZE + 1} - {Math.min(invPage * INV_PAGE_SIZE, filteredInvoices.length)} trong số {filteredInvoices.length} hóa đơn
                </span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                    disabled={invPage <= 1}
                    onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <span style={{ fontWeight: 600 }}>
                    Trang {invPage} / {totalInvPages}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "var(--text-xs)" }}
                    disabled={invPage >= totalInvPages}
                    onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Electricity & Water Consumption History */}
      <div id="utilities" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Lightning size={20} style={{ color: "#eab308" }} /> Lịch sử Chỉ số Điện & Nước
            </h2>
            <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
              Theo dõi số điện (kWh) và số nước (m³) theo từng kỳ chốt số kèm đơn giá và tiền ước tính.
            </p>
          </div>
        </div>

        {meters.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-4) var(--space-3)", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(234,179,8,0.08)", color: "#eab308", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Lightning size={22} />
            </div>
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 6px" }}>
              Chưa có dữ liệu chốt số điện & nước
            </h3>
            <p className="text-muted" style={{ margin: "0 auto", maxWidth: 480, fontSize: "var(--text-xs)", lineHeight: 1.6 }}>
              Ban quản lý sẽ chốt chỉ số công tơ điện nước định kỳ vào cuối mỗi tháng để tính số lượng tiêu thụ (kWh/m³). Dữ liệu đối chiếu kèm tiền ước tính sẽ hiển thị tại đây ngay khi có số liệu mới.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {meters.map((m) => {
              const isElectric = m.utilityType === "electricity";
              const estimatedCost = m.consumption * (m.unitPriceSnapshot || 0);

              return (
                <div key={m.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "var(--text-sm)" }}>
                      {isElectric ? (
                        <Lightning size={16} weight="fill" style={{ color: "#eab308" }} />
                      ) : (
                        <Drop size={16} weight="fill" style={{ color: "#06b6d4" }} />
                      )}
                      <span>{isElectric ? "Điện sinh hoạt" : "Nước sinh hoạt"}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge" style={{ fontSize: "10px" }}>Kỳ {m.billingPeriod}</span>
                      <div style={{ fontSize: "10px", color: "var(--color-fg-3)", marginTop: 2 }}>
                        Ngày chốt: {new Date(m.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center", background: "var(--color-surface)", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Số cũ</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.previousValue}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Số mới</div>
                      <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{m.currentValue}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: "10px" }}>Tiêu thụ</div>
                      <div style={{ fontWeight: 700, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                        {m.consumption} {isElectric ? "kWh" : "m³"}
                      </div>
                    </div>
                  </div>

                  {/* Unit price and estimated cost calculation */}
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--color-fg-3)", borderTop: "1px dashed var(--color-border)", paddingTop: 6 }}>
                    <span>Đơn giá: <strong>{m.unitPriceSnapshot ? `${money.format(m.unitPriceSnapshot)}/${isElectric ? "kWh" : "m³"}` : "Chưa cấu hình"}</strong></span>
                    <span>Ước tính: <strong style={{ color: m.unitPriceSnapshot ? "var(--color-primary)" : "var(--color-fg-3)" }}>
                      {m.unitPriceSnapshot ? money.format(estimatedCost) : "Chưa có đơn giá"}
                    </strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Maintenance Requests Section */}
      <div id="maintenance" style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={20} style={{ color: "var(--color-primary)" }} /> Sự cố & Yêu cầu sửa chữa
            </h2>
            <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "var(--text-xs)" }}>
              Gửi thông báo hỏng hóc thiết bị, sự cố điện nước phòng trọ đến Ban quản lý.
            </p>
          </div>
          {stay && (
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => setShowMaintenanceModal(true)}
            >
              <Plus size={14} weight="bold" /> Tạo yêu cầu
            </button>
          )}
        </div>

        {maintenanceRequests.length === 0 ? (
          <div className="card" style={{ padding: "var(--space-4) var(--space-3)", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Wrench size={22} />
            </div>
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, margin: "0 0 6px" }}>
              Chưa có yêu cầu sửa chữa nào
            </h3>
            <p className="text-muted" style={{ margin: "0 auto", maxWidth: 480, fontSize: "var(--text-xs)", lineHeight: 1.6 }}>
              Nếu phòng trọ xảy ra sự cố kỹ thuật (điện, nước, bóng đèn hỏng, thiết bị hư hỏng...), bạn hãy nhấn nút <strong>&quot;Tạo yêu cầu&quot;</strong> bên trên để gửi thông báo đến Ban quản lý hỗ trợ xử lý kịp thời.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {maintenanceRequests.map((req) => {
              const cfg = MNT_STATUS_CONFIG[req.status] || MNT_STATUS_CONFIG.pending;
              return (
                <div key={req.id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>{req.title}</span>
                        <span className={cfg.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px" }}>
                          <cfg.Icon size={12} weight="fill" />
                          {cfg.label}
                        </span>
                        {CATEGORY_LABELS[req.category] && (
                          <span className="badge" style={{ fontSize: "10px", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                            {CATEGORY_LABELS[req.category]}
                          </span>
                        )}
                        {PRIORITY_LABELS[req.priority] && (
                          <span
                            className="badge"
                            style={{
                              fontSize: "10px",
                              color: PRIORITY_LABELS[req.priority].color,
                              backgroundColor: PRIORITY_LABELS[req.priority].bg,
                              border: "none",
                              fontWeight: 600,
                            }}
                          >
                            {PRIORITY_LABELS[req.priority].label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)", marginTop: 2 }}>
                        Phòng {req.roomNumber} • Tạo lúc {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </div>

                    {req.status === "pending" && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: "3px 8px", fontSize: "11px", color: "var(--color-danger, #ef4444)" }}
                        disabled={cancellingMntId === req.id}
                        onClick={() => void handleCancelMaintenance(req.id)}
                        title="Hủy yêu cầu sửa chữa này"
                      >
                        {cancellingMntId === req.id ? "Đang hủy..." : "Hủy yêu cầu"}
                      </button>
                    )}
                  </div>
                  {req.description && (
                    <p style={{ margin: "6px 0", fontSize: "var(--text-xs)", color: "var(--color-fg)", lineHeight: 1.5 }}>
                      {req.description}
                    </p>
                  )}
                  {req.photoUrl && (
                    <div style={{ marginTop: 6, marginBottom: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={req.photoUrl}
                        alt="Ảnh sự cố"
                        style={{ maxWidth: 160, maxHeight: 110, objectFit: "cover", borderRadius: 6, border: "1px solid var(--color-border)" }}
                      />
                    </div>
                  )}
                  {req.resolutionNotes && (
                    <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 6, fontSize: "var(--text-xs)" }}>
                      <strong style={{ color: "#16a34a" }}>Phản hồi từ chủ nhà: </strong>
                      <span>{req.resolutionNotes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VietQR Payment Modal for Tenant */}
      <AnimatePresence>
        {qrInvoice && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 110,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQrInvoice(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
          >
            <motion.div
              className="card"
              style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "22px 26px", boxSizing: "border-box" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <div>
                  <h2 id="qr-modal-title" style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <QrCode size={22} style={{ color: "var(--color-primary)" }} />
                    Quét mã VietQR thanh toán
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Phòng {qrInvoice.roomNumber} • Kỳ {qrInvoice.billingPeriodStart}
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setQrInvoice(null)} aria-label="Đóng">
                  <X size={14} />
                </button>
              </div>

              {(() => {
                const remaining = Math.max(0, qrInvoice.totalAmount - (qrInvoice.paidAmount || 0));

                if (remaining <= 0 || qrInvoice.status === "paid") {
                  return (
                    <div>
                      <div style={{ textAlign: "center", padding: "24px 16px", background: "rgba(16, 185, 129, 0.08)", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.25)", margin: "16px 0" }}>
                        <div style={{ color: "#16a34a", marginBottom: 8, display: "flex", justifyContent: "center" }}>
                          <CheckCircle size={48} weight="fill" />
                        </div>
                        <h3 style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: "0 0 6px", color: "#16a34a" }}>
                          Hóa đơn đã được thanh toán đủ
                        </h3>
                        <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: 0 }}>
                          Không còn số dư cần thanh toán cho kỳ này ({money.format(qrInvoice.totalAmount)}).
                        </p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                        <button type="button" className="btn-secondary" onClick={() => setQrInvoice(null)}>
                          Đóng
                        </button>
                      </div>
                    </div>
                  );
                }

                const transferDesc = `TT P${qrInvoice.roomNumber.replace(/\s+/g, "")} ${qrInvoice.billingPeriodStart.replace(/-/g, "").slice(0, 6)}`;
                const qrUrl = qrInvoice.bankCode && qrInvoice.bankAccount
                  ? buildVietQrUrl({
                      bankCode: qrInvoice.bankCode,
                      bankAccount: qrInvoice.bankAccount,
                      accountHolder: qrInvoice.accountHolder,
                      amount: remaining,
                      description: transferDesc,
                      template: "compact2",
                    })
                  : null;

                if (!qrUrl) {
                  return (
                    <div style={{ textAlign: "center", padding: "20px 10px" }}>
                      <p className="text-muted">Chủ nhà chưa cài đặt STK ngân hàng cho nhà trọ này.</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {/* QR Code Frame */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: "#ffffff",
                      padding: "16px",
                      borderRadius: "12px",
                      marginBottom: "var(--space-2)",
                      boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt="VietQR thanh toán"
                        style={{
                          width: "100%",
                          maxWidth: 260,
                          height: "auto",
                          aspectRatio: "1/1",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <a
                          href={qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`vietqr-${qrInvoice.roomNumber}.png`}
                          className="btn-ghost"
                          style={{
                            padding: "4px 12px",
                            fontSize: "var(--text-xs)",
                            color: "#1e293b",
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                          }}
                        >
                          <DownloadSimple size={13} /> Tải mã QR
                        </a>
                      </div>
                    </div>

                    {/* Details box */}
                    <div style={{ marginBottom: "var(--space-3)", display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Ngân hàng</div>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                            {formatBankDisplayName(qrInvoice.bankCode)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tài khoản</div>
                          <div style={{ fontSize: "var(--text-base)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            {qrInvoice.bankAccount}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(qrInvoice.bankAccount!, "acc")}
                        >
                          {copiedKey === "acc" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Số tiền chuyển khoản</div>
                          <div style={{ fontSize: "var(--text-base)", fontWeight: 800, color: "var(--color-primary)", fontFamily: "var(--font-mono)" }}>
                            {money.format(remaining)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(String(remaining), "amt")}
                        >
                          {copiedKey === "amt" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-fg-3)" }}>Nội dung chuyển khoản</div>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--color-primary)" }}>
                            {transferDesc}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: "4px 8px", fontSize: "var(--text-xs)" }}
                          onClick={() => void handleCopy(transferDesc, "desc")}
                        >
                          {copiedKey === "desc" ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {paymentError && (
                      <div
                        style={{
                          marginBottom: 12,
                          padding: "8px 12px",
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid #ef4444",
                          borderRadius: 8,
                          color: "#dc2626",
                          fontSize: "var(--text-xs)",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <WarningCircle size={14} weight="bold" />
                        <span>{paymentError}</span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setQrInvoice(null)}
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={notifyingPayment}
                        onClick={() => void handleNotifyPayment(qrInvoice.id)}
                      >
                        {notifyingPayment ? "Đang gửi tín hiệu..." : "Báo cho chủ nhà: Tôi đã chuyển khoản xong"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Self Profile & Temporary Residence Data */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 110,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProfileModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <motion.div
              className="card"
              style={{ maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px 28px", boxSizing: "border-box" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <h2 id="profile-modal-title" style={{ fontSize: "var(--text-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <IdentificationCard size={20} color="var(--color-primary)" weight="fill" />
                    Hồ sơ cá nhân & Khai báo tạm trú
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Cung cấp số CCCD, ảnh chụp 2 mặt, thường trú và biển số xe để Ban quản lý làm thủ tục tạm trú CT01 và cấp thẻ xe.
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowProfileModal(false)} aria-label="Đóng">
                  <X size={14} />
                </button>
              </div>

              {stay && (
                <div style={{
                  background: "rgba(37,99,235,0.06)",
                  border: "1px solid rgba(37,99,235,0.18)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  fontSize: "var(--text-xs)",
                  lineHeight: 1.5,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <strong>Nơi đăng ký tạm trú:</strong> Phòng {stay.roomNumber} — {stay.propertyName}
                    <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {stay.propertyAddress || "Theo thông tin cơ sở nhà trọ"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "4px 8px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                    onClick={() => setShowCt01Modal(true)}
                    title="Xem tờ khai tạm trú CT01"
                  >
                    <FileText size={13} color="var(--color-primary)" /> Mẫu CT01
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: 12 }}>
                {profileError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid #ef4444",
                      color: "#dc2626",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-xs)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <WarningCircle size={14} weight="bold" />
                    <span>{profileError}</span>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="field-label" htmlFor="pFullName">Họ và tên *</label>
                    <input
                      id="pFullName"
                      type="text"
                      required
                      disabled={submittingProfile}
                      className="input-field"
                      value={pFullName}
                      onChange={(e) => setPFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pPhone">Số điện thoại *</label>
                    <input
                      id="pPhone"
                      type="tel"
                      required
                      placeholder="VD: 0912.345.678"
                      disabled={submittingProfile}
                      className="input-field"
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="field-label" htmlFor="pCitizenId">Số CCCD / CMND *</label>
                    <input
                      id="pCitizenId"
                      type="text"
                      disabled={submittingProfile}
                      className="input-field"
                      placeholder="VD: 001201012345"
                      value={pCitizenId}
                      onChange={(e) => setPCitizenId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pBirthDate">Ngày sinh</label>
                    <input
                      id="pBirthDate"
                      type="date"
                      disabled={submittingProfile}
                      className="input-field"
                      value={pBirthDate}
                      onChange={(e) => setPBirthDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* CCCD Front & Back Photo Upload */}
                <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-fg-3)", textTransform: "uppercase", marginBottom: 8 }}>
                    Ảnh chụp CCCD (Mặt trước & Mặt sau)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                    {/* Front */}
                    <div>
                      <span className="field-label" style={{ display: "block", marginBottom: 4 }}>
                        Mặt trước CCCD
                      </span>
                      {pIdCardFrontUrl ? (
                        <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", height: 110 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pIdCardFrontUrl}
                            alt="Mặt trước CCCD"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setPIdCardFrontUrl("")}
                            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Trash size={12} /> Xóa
                          </button>
                        </div>
                      ) : (
                        <label
                          style={{
                            border: "1px dashed var(--color-border)",
                            borderRadius: 8,
                            padding: "16px 10px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            background: "var(--color-surface)",
                          }}
                        >
                          <UploadSimple size={20} color="var(--color-primary)" />
                          <span style={{ fontSize: 11, color: "var(--color-fg-2)" }}>Tải ảnh mặt trước</span>
                          <span style={{ fontSize: 10, color: "var(--color-fg-3)" }}>PNG, JPG tối đa 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={submittingProfile}
                            onChange={(e) => handleImageFileChange(e, setPIdCardFrontUrl, setProfileError)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Back */}
                    <div>
                      <span className="field-label" style={{ display: "block", marginBottom: 4 }}>
                        Mặt sau CCCD
                      </span>
                      {pIdCardBackUrl ? (
                        <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", height: 110 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={pIdCardBackUrl}
                            alt="Mặt sau CCCD"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setPIdCardBackUrl("")}
                            style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Trash size={12} /> Xóa
                          </button>
                        </div>
                      ) : (
                        <label
                          style={{
                            border: "1px dashed var(--color-border)",
                            borderRadius: 8,
                            padding: "16px 10px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            background: "var(--color-surface)",
                          }}
                        >
                          <UploadSimple size={20} color="var(--color-primary)" />
                          <span style={{ fontSize: 11, color: "var(--color-fg-2)" }}>Tải ảnh mặt sau</span>
                          <span style={{ fontSize: 10, color: "var(--color-fg-3)" }}>PNG, JPG tối đa 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            disabled={submittingProfile}
                            onChange={(e) => handleImageFileChange(e, setPIdCardBackUrl, setProfileError)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="field-label" htmlFor="pHometown">Nơi thường trú / Quê quán (Khai báo tạm trú)</label>
                    <input
                      id="pHometown"
                      type="text"
                      disabled={submittingProfile}
                      className="input-field"
                      placeholder="VD: Xã ..., Huyện ..., Tỉnh ..."
                      value={pHometown}
                      onChange={(e) => setPHometown(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="pVehicleNumber">Biển số xe máy (Đăng ký gửi xe)</label>
                    <input
                      id="pVehicleNumber"
                      type="text"
                      disabled={submittingProfile}
                      className="input-field"
                      placeholder="VD: 29A-12345"
                      value={pVehicleNumber}
                      onChange={(e) => setPVehicleNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-fg-3)", textTransform: "uppercase", marginBottom: 8 }}>
                    Người liên hệ khẩn cấp (Người thân)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                    <div>
                      <label className="field-label" htmlFor="pEmergencyName">Tên người thân</label>
                      <input
                        id="pEmergencyName"
                        type="text"
                        disabled={submittingProfile}
                        className="input-field"
                        placeholder="VD: Bố / Mẹ / Anh"
                        value={pEmergencyName}
                        onChange={(e) => setPEmergencyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="pEmergencyPhone">SĐT người thân</label>
                      <input
                        id="pEmergencyPhone"
                        type="tel"
                        disabled={submittingProfile}
                        className="input-field"
                        placeholder="VD: 0988.776.655"
                        value={pEmergencyPhone}
                        onChange={(e) => setPEmergencyPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: "var(--text-xs)", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => setShowCt01Modal(true)}
                    title="Xem & In tờ khai CT01 phục vụ công an"
                  >
                    <FileText size={14} color="var(--color-primary)" /> Xem tờ khai CT01
                  </button>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setShowProfileModal(false)}
                      disabled={submittingProfile}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingProfile || !pFullName.trim()}
                    >
                      {submittingProfile ? "Đang lưu..." : "Lưu thông tin"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Maintenance Modal */}
      <AnimatePresence>
        {showMaintenanceModal && (
          <motion.div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 110,
              padding: 16,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMaintenanceModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="maintenance-modal-title"
          >
            <motion.div
              className="card"
              style={{ maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "22px 26px", boxSizing: "border-box" }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <div>
                  <h2 id="maintenance-modal-title" style={{ fontSize: "var(--text-lg)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Wrench size={22} style={{ color: "var(--color-primary)" }} />
                    Báo sự cố phòng {stay?.roomNumber}
                  </h2>
                  <p className="text-muted" style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
                    Chủ nhà sẽ nhận được thông báo và xử lý trong thời gian sớm nhất.
                  </p>
                </div>
                <button type="button" className="btn-ghost" style={{ padding: 6 }} onClick={() => setShowMaintenanceModal(false)} aria-label="Đóng">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreateMaintenance} style={{ display: "grid", gap: 12 }}>
                {mntError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid #ef4444",
                      color: "#dc2626",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--text-xs)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <WarningCircle size={14} weight="bold" />
                    <span>{mntError}</span>
                  </div>
                )}
                <div>
                  <label className="field-label" htmlFor="mTitle">Tiêu đề sự cố *</label>
                  <input
                    id="mTitle"
                    type="text"
                    required
                    disabled={submittingMnt}
                    className="input-field"
                    placeholder="VD: Hỏng vòi sen, Nghẹt bồn rửa, Mất điện..."
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <div>
                    <label className="field-label" htmlFor="mCategory">Danh mục</label>
                    <select
                      id="mCategory"
                      disabled={submittingMnt}
                      className="input-field"
                      value={mCategory}
                      onChange={(e) => setMCategory(e.target.value as MaintenanceCategory)}
                    >
                      <option value="plumbing">Cấp thoát nước</option>
                      <option value="electrical">Điện sinh hoạt</option>
                      <option value="appliance">Thiết bị / Đồ dùng</option>
                      <option value="internet">Mạng / Internet</option>
                      <option value="structural">Cơ sở vật chất</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label" htmlFor="mPriority">Mức độ khẩn</label>
                    <select
                      id="mPriority"
                      disabled={submittingMnt}
                      className="input-field"
                      value={mPriority}
                      onChange={(e) => setMPriority(e.target.value as MaintenancePriority)}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Bình thường</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="mDescription">Mô tả chi tiết</label>
                  <textarea
                    id="mDescription"
                    rows={3}
                    disabled={submittingMnt}
                    className="input-field"
                    placeholder="Mô tả cụ thể vị trí và tình trạng hỏng để thợ mang đúng đồ sửa..."
                    value={mDescription}
                    onChange={(e) => setMDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" style={{ display: "block", marginBottom: 4 }}>
                    Ảnh chụp sự cố hỏng hóc (nếu có)
                  </label>
                  {mPhotoUrl ? (
                    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxWidth: 220, marginBottom: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mPhotoUrl}
                        alt="Ảnh chụp sự cố"
                        style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setMPhotoUrl("")}
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <Trash size={12} /> Xóa ảnh
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                      <label
                        className="btn-secondary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "var(--text-xs)",
                          cursor: "pointer",
                        }}
                      >
                        <UploadSimple size={14} /> Tải ảnh từ thiết bị
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={submittingMnt}
                          onChange={(e) => handleImageFileChange(e, setMPhotoUrl, setMntError)}
                        />
                      </label>
                      <span className="text-muted" style={{ fontSize: "11px" }}>hoặc nhập URL bên dưới</span>
                    </div>
                  )}
                  <input
                    id="mPhotoUrl"
                    type="url"
                    disabled={submittingMnt}
                    className="input-field"
                    placeholder="VD: https://... hoặc liên kết ảnh trực tiếp"
                    value={mPhotoUrl}
                    onChange={(e) => setMPhotoUrl(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" className="btn-secondary" disabled={submittingMnt} onClick={() => setShowMaintenanceModal(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-primary" disabled={submittingMnt || !mTitle.trim()}>
                    {submittingMnt ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printable Invoice Modal */}
      <PrintableInvoiceModal invoice={printInvoice} onClose={() => setPrintInvoice(null)} />

      {/* Printable Contract Modal */}
      {printContract && (
        <PrintableContractModal contract={printContract} onClose={() => setPrintContract(null)} />
      )}

      {/* Printable CT01 Temporary Residence Declaration Modal */}
      <PrintableCt01Modal
        isOpen={showCt01Modal}
        tenant={tenant}
        stay={stay}
        onClose={() => setShowCt01Modal(false)}
      />
    </main>
  );
}
