"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, FileText, IdentificationCard } from "@phosphor-icons/react";
import type { TenantProfile, TenantStay } from "../../modules/tenant-portal/tenant-portal.service";

export type PrintableCt01ModalProps = {
  isOpen: boolean;
  tenant: TenantProfile | null;
  stay: TenantStay | null;
  onClose: () => void;
};

export function PrintableCt01Modal({
  isOpen,
  tenant,
  stay,
  onClose,
}: PrintableCt01ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const formatDateVN = (dStr: string | null | undefined) => {
    if (!dStr) return "................................";
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <AnimatePresence>
      <div
        className="ct01-modal-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ct01-modal-title"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .ct01-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 16px;
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .ct01-modal-overlay {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              background: none;
              overflow: visible;
            }
            .printable-ct01-sheet, .printable-ct01-sheet * {
              visibility: visible;
            }
            .printable-ct01-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: none !important;
              padding: 20mm !important;
              box-shadow: none !important;
              border: none !important;
            }
            .no-print {
              display: none !important;
            }
          }
        ` }} />
        <motion.div
          className="card printable-ct01-sheet"
          style={{
            maxWidth: 820,
            width: "100%",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            color: "#0f172a",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar (Hidden when printing) */}
          <div
            className="no-print"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "#1e293b",
              color: "#ffffff",
              borderBottom: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IdentificationCard size={22} color="#60a5fa" weight="fill" />
              <div>
                <h3 id="ct01-modal-title" style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                  Tờ khai thay đổi thông tin cư trú (Mẫu CT01)
                </h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
                  Phục vụ thủ tục đăng ký tạm trú theo Luật Cư trú năm 2020 &amp; Thông tư 66/2023/TT-BCA
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Printer size={16} /> In tờ khai (A4)
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                style={{
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "none",
                  padding: 6,
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Printable Document Body */}
          <div
            id="printable-ct01-content"
            style={{
              padding: "36px 48px",
              overflowY: "auto",
              flex: 1,
              fontFamily: "'Times New Roman', Times, serif",
              lineHeight: 1.5,
              fontSize: "14pt",
              color: "#000000",
              background: "#ffffff",
            }}
          >
            {/* Header / National Emblem */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: "bold", fontSize: "12pt", textTransform: "uppercase" }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div style={{ fontWeight: "bold", fontSize: "13pt" }}>
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div style={{ fontSize: "11pt", marginTop: 2, letterSpacing: 1 }}>
                -------------------------------
              </div>
              <div style={{ textAlign: "right", fontStyle: "italic", fontSize: "10pt", marginTop: 4 }}>
                Mẫu CT01 ban hành kèm theo Thông tư số 66/2023/TT-BCA
              </div>
            </div>

            {/* Title */}
            <div style={{ textAlign: "center", margin: "20px 0 16px" }}>
              <h1 style={{ fontSize: "16pt", fontWeight: "bold", margin: 0, textTransform: "uppercase" }}>
                TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ
              </h1>
              <div style={{ fontStyle: "italic", fontSize: "12pt", marginTop: 4 }}>
                (Dùng cho công dân kê khai đăng ký tạm trú, điều chỉnh thông tin cư trú)
              </div>
            </div>

            {/* Destination Authority */}
            <div style={{ marginBottom: 16, fontSize: "13pt" }}>
              <strong>Kính gửi:</strong> Công an xã/phường/thị trấn:{" "}
              <span style={{ borderBottom: "1px dotted #000", display: "inline-block", minWidth: 320 }}>
                {stay?.propertyAddress?.split(",").slice(-2).join(",").trim() || "Địa bàn nơi đặt nhà trọ"}
              </span>
            </div>

            {/* Section 1: Declarant Info */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: 6, fontSize: "13pt" }}>
                1. Thông tin người kê khai:
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13pt" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0", width: "60%" }}>
                      1.1. Họ, chữ đệm và tên:{" "}
                      <strong style={{ textTransform: "uppercase" }}>{tenant?.fullName || "......................................."}</strong>
                    </td>
                    <td style={{ padding: "4px 0", width: "40%" }}>
                      1.2. Ngày sinh: <strong>{formatDateVN(tenant?.birthDate)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      1.3. Số ĐDCN/CCCD/CMND: <strong>{tenant?.citizenId || "......................................."}</strong>
                    </td>
                    <td style={{ padding: "4px 0" }}>
                      1.4. Số điện thoại: <strong>{tenant?.phone || "......................................."}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: "4px 0" }}>
                      1.5. Nơi thường trú / Quê quán: <strong>{tenant?.hometown || "......................................................................................................."}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: "4px 0" }}>
                      1.6. Nơi ở hiện tại: Phòng <strong>{stay?.roomNumber || "...."}</strong>, cơ sở <strong>{stay?.propertyName || "......................."}</strong>, địa chỉ: <strong>{stay?.propertyAddress || "..................................................................."}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0" }}>
                      1.7. Biển số xe gắn máy gửi: <strong>{tenant?.vehicleNumber || "Chưa có"}</strong>
                    </td>
                    <td style={{ padding: "4px 0" }}>
                      1.8. Người liên hệ khẩn cấp: <strong>{tenant?.emergencyContactName ? `${tenant.emergencyContactName} (${tenant.emergencyContactPhone || ""})` : "...................."}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Request content */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: 6, fontSize: "13pt" }}>
                2. Nội dung đề nghị:
              </div>
              <div style={{ textIndent: "1.5em", textAlign: "justify", fontSize: "13pt" }}>
                Đề nghị cơ quan Công an có thẩm quyền xem xét, giải quyết thủ tục <strong>ĐĂNG KÝ TẠM TRÚ</strong> cho công dân theo quy định của Luật Cư trú năm 2020.
              </div>
              <div style={{ marginTop: 6, fontSize: "13pt" }}>
                - <strong>Nơi đăng ký tạm trú:</strong> Phòng {stay?.roomNumber || "...."} — {stay?.propertyName || "Nhà trọ"}, địa chỉ: {stay?.propertyAddress || "Theo địa chỉ cơ sở cho thuê"}.
              </div>
              <div style={{ marginTop: 4, fontSize: "13pt" }}>
                - <strong>Lý do đăng ký:</strong> Thuê phòng trọ để sinh sống, học tập và làm việc theo Hợp đồng thuê phòng giữa Bên cho thuê và Bên thuê.
              </div>
              <div style={{ marginTop: 4, fontSize: "13pt" }}>
                - <strong>Hồ sơ đính kèm:</strong> Bản chụp Căn cước công dân (mặt trước &amp; mặt sau), Hợp đồng thuê phòng trọ hợp pháp.
              </div>
            </div>

            {/* Section 3: Owner Agreement */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: 6, fontSize: "13pt" }}>
                3. Ý kiến của chủ hộ / Người cho thuê trọ hợp pháp:
              </div>
              <div style={{ textIndent: "1.5em", textAlign: "justify", fontSize: "13pt" }}>
                Tôi là <strong>{stay?.accountHolder || "Chủ cơ sở nhà trọ"}</strong>, là chủ sở hữu / người quản lý hợp pháp của cơ sở nhà trọ tại địa chỉ trên. Tôi xác nhận và <strong>ĐỒNG Ý</strong> cho công dân có tên trên được đăng ký tạm trú tại Phòng <strong>{stay?.roomNumber || "...."}</strong> trong thời gian thực hiện Hợp đồng thuê phòng.
              </div>
            </div>

            {/* Section 4: Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30, fontSize: "13pt" }}>
              <div style={{ width: "45%", textAlign: "center" }}>
                <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                  Ý KIẾN CỦA CHỦ HỘ / CHO THUÊ
                </div>
                <div style={{ fontStyle: "italic", fontSize: "11pt" }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 80 }} />
                <div style={{ fontWeight: "bold" }}>{stay?.accountHolder || "Chủ nhà"}</div>
              </div>

              <div style={{ width: "45%", textAlign: "center" }}>
                <div style={{ fontStyle: "italic", fontSize: "12pt" }}>
                  Ngày {day} tháng {month} năm {year}
                </div>
                <div style={{ fontWeight: "bold", textTransform: "uppercase", marginTop: 2 }}>
                  NGƯỜI KÊ KHAI
                </div>
                <div style={{ fontStyle: "italic", fontSize: "11pt" }}>(Ký và ghi rõ họ tên)</div>
                <div style={{ height: 80 }} />
                <div style={{ fontWeight: "bold" }}>{tenant?.fullName || "Khách thuê"}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
