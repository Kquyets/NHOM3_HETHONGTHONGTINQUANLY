"use client";

import { motion, AnimatePresence } from "motion/react";
import { Printer, X } from "@phosphor-icons/react";
import type { ContractRow } from "../../modules/contracts/contract.service";
import { numberToVietnameseWords } from "../../utils/vietnamese-currency-words";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export type PrintableContractModalProps = {
  contract: ContractRow | null;
  onClose: () => void;
};

export function PrintableContractModal({ contract, onClose }: PrintableContractModalProps) {
  if (!contract) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDateVN = (dStr: string | null) => {
    if (!dStr) return "—";
    const d = new Date(dStr);
    return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  };

  const primaryTenant = contract.tenants?.[0];

  return (
    <AnimatePresence>
      <div className="printable-modal-overlay">
        <style dangerouslySetInnerHTML={{ __html: `
          .printable-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(5px);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            overflow-y: auto;
          }
          .printable-contract-sheet {
            background: #ffffff;
            color: #111827;
            width: 100%;
            max-width: 820px;
            border-radius: 8px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
            padding: 44px 50px;
            font-family: "Times New Roman", Times, serif;
            line-height: 1.6;
            font-size: 15px;
            position: relative;
          }
          .contract-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0 6px;
            text-transform: uppercase;
          }
          .contract-subtitle {
            text-align: center;
            font-size: 13px;
            font-style: italic;
            color: #4b5563;
            margin-bottom: 24px;
          }
          .contract-section {
            margin-bottom: 18px;
          }
          .contract-section-title {
            font-weight: bold;
            font-size: 15.5px;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .contract-row {
            display: flex;
            margin-bottom: 4px;
          }
          .contract-label {
            min-width: 140px;
            font-weight: 600;
          }
          .contract-signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            text-align: center;
            margin-top: 36px;
            page-break-inside: avoid;
          }
          .contract-signature-title {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
          }
          .contract-signature-sub {
            font-size: 12px;
            font-style: italic;
            color: #4b5563;
            margin-bottom: 70px;
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-modal-overlay {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              background: none;
              overflow: visible;
            }
            .printable-contract-sheet, .printable-contract-sheet * {
              visibility: visible;
            }
            .printable-contract-sheet {
              box-shadow: none;
              border-radius: 0;
              width: 100%;
              max-width: 100%;
              padding: 20mm;
              font-size: 14pt;
              line-height: 1.5;
            }
            .contract-modal-actions {
              display: none !important;
            }
          }
        ` }} />

        {/* Modal Controls Bar */}
        <div
          className="contract-modal-actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 820,
            marginBottom: 14,
          }}
        >
          <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
            Xem &amp; In Hợp đồng thuê phòng trọ
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: "var(--color-primary, #2563eb)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Printer size={16} weight="bold" /> In hợp đồng (A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <X size={16} /> Đóng
            </button>
          </div>
        </div>

        {/* Printable Contract Sheet */}
        <motion.div
          className="printable-contract-sheet"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
        >
          {/* Header Quốc Hiệu */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontWeight: "bold", fontSize: 14, textTransform: "uppercase" }}>
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div style={{ fontSize: 13, fontWeight: "bold", textDecoration: "underline", margin: "2px 0 16px" }}>
              Độc lập - Tự do - Hạnh phúc
            </div>
            <div style={{ fontSize: 12, fontStyle: "italic", textAlign: "right" }}>
              Hà Nội, {formatDateVN(contract.startDate)}
            </div>
          </div>

          <div className="contract-title">HỢP ĐỒNG THUÊ PHÒNG TRỌ</div>
          <div className="contract-subtitle">
            (Số: HĐ-{contract.id.slice(0, 8).toUpperCase()} • Căn cứ theo quy định của Bộ luật Dân sự)
          </div>

          <div style={{ marginBottom: 16 }}>
            Hôm nay, ngày {new Date(contract.startDate).getDate()} tháng {new Date(contract.startDate).getMonth() + 1} năm {new Date(contract.startDate).getFullYear()}, tại địa chỉ: <strong>{contract.propertyAddress || contract.propertyName}</strong>, hai bên chúng tôi gồm có:
          </div>

          {/* BÊN A */}
          <div className="contract-section">
            <div className="contract-section-title">BÊN A (BÊN CHO THUÊ):</div>
            <div className="contract-row">
              <span className="contract-label">Họ và tên:</span>
              <span><strong>{contract.landlordName || "Ban Quản Lý Tòa Nhà"}</strong></span>
            </div>
            <div className="contract-row">
              <span className="contract-label">Số điện thoại:</span>
              <span>{contract.landlordPhone || "—"}</span>
            </div>
            <div className="contract-row">
              <span className="contract-label">Cơ sở nhà trọ:</span>
              <span>{contract.propertyName}</span>
            </div>
            <div className="contract-row">
              <span className="contract-label">Địa chỉ:</span>
              <span>{contract.propertyAddress || "—"}</span>
            </div>
          </div>

          {/* BÊN B */}
          <div className="contract-section">
            <div className="contract-section-title">BÊN B (BÊN THUÊ PHÒNG):</div>
            {contract.tenants && contract.tenants.length > 0 ? (
              contract.tenants.map((t, idx) => (
                <div key={t.id} style={{ marginBottom: idx > 0 ? 8 : 4, paddingLeft: contract.tenants.length > 1 ? 12 : 0, borderLeft: contract.tenants.length > 1 ? "2px solid #e5e7eb" : "none" }}>
                  <div className="contract-row">
                    <span className="contract-label">{contract.tenants.length > 1 ? `Người thuê ${idx + 1}:` : "Họ và tên:"}</span>
                    <span><strong>{t.fullName}</strong></span>
                  </div>
                  <div className="contract-row">
                    <span className="contract-label">Số điện thoại:</span>
                    <span>{t.phone}</span>
                  </div>
                  <div className="contract-row">
                    <span className="contract-label">Số CCCD/CMND:</span>
                    <span>{t.citizenId || "—"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div>
                <div className="contract-row">
                  <span className="contract-label">Họ và tên:</span>
                  <span>...........................................................................................</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Số điện thoại:</span>
                  <span>...........................................................................................</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Số CCCD/CMND:</span>
                  <span>...........................................................................................</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            Hai bên cùng thỏa thuận và thống nhất ký kết Hợp đồng thuê phòng trọ với các điều khoản cụ thể sau đây:
          </div>

          {/* ĐIỀU 1 */}
          <div className="contract-section">
            <div className="contract-section-title">ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN THUÊ</div>
            <div>
              1.1. Bên A đồng ý cho Bên B thuê phòng số: <strong>{contract.roomNumber}</strong>, thuộc tòa nhà trọ: <strong>{contract.propertyName}</strong>.
            </div>
            <div>
              1.2. Mục đích thuê: Dùng làm nơi ở sinh hoạt hợp pháp của Bên B.
            </div>
            <div>
              1.3. Thời hạn thuê: Từ ngày <strong>{new Date(contract.startDate).toLocaleDateString("vi-VN")}</strong>
              {contract.endDate
                ? ` đến ngày ${new Date(contract.endDate).toLocaleDateString("vi-VN")}.`
                : " cho đến khi hai bên có thỏa thuận chấm dứt hợp đồng."}
            </div>
          </div>

          {/* ĐIỀU 2 */}
          <div className="contract-section">
            <div className="contract-section-title">ĐIỀU 2: GIÁ THUÊ VÀ TIỀN ĐẶT CỌC</div>
            <div>
              2.1. Giá thuê phòng là: <strong>{money.format(contract.monthlyRentSnapshot)} / tháng</strong>.
            </div>
            <div style={{ fontStyle: "italic", paddingLeft: 16 }}>
              (Bằng chữ: {numberToVietnameseWords(contract.monthlyRentSnapshot)})
            </div>
            <div>
              2.2. Tiền đặt cọc bảo đảm là: <strong>{money.format(contract.depositSnapshot)}</strong>.
            </div>
            <div style={{ fontStyle: "italic", paddingLeft: 16 }}>
              (Bằng chữ: {numberToVietnameseWords(contract.depositSnapshot)})
            </div>
            <div>
              2.3. Khoản tiền cọc được Bên B bàn giao cho Bên A ngay khi ký hợp đồng và sẽ được hoàn trả đầy đủ cho Bên B khi kết thúc hợp đồng sau khi trừ đi các chi phí chưa thanh toán hoặc hư hao trang thiết bị (nếu có).
            </div>
            <div>
              2.4. Thời hạn đóng tiền phòng: Định kỳ hàng tháng từ ngày 01 đến ngày 05 đầu tháng qua chuyển khoản VietQR Napas hoặc tiền mặt.
            </div>
          </div>

          {/* ĐIỀU 3 */}
          <div className="contract-section">
            <div className="contract-section-title">ĐIỀU 3: CHI PHÍ ĐIỆN, NƯỚC VÀ DỊCH VỤ</div>
            <div>
              3.1. Tiền điện sinh hoạt và tiền nước được tính theo chỉ số đồng hồ công tơ riêng của phòng nhân với đơn giá niêm yết của nhà trọ tại thời điểm lập hóa đơn.
            </div>
            <div>
              3.2. Bên B có nghĩa vụ thanh toán đầy đủ các khoản tiền dịch vụ (rác, wifi, vệ sinh) cùng kỳ đóng tiền phòng hàng tháng.
            </div>
          </div>

          {/* ĐIỀU 4 */}
          <div className="contract-section">
            <div className="contract-section-title">ĐIỀU 4: NGHĨA VỤ VÀ TRÁCH NHIỆM HAI BÊN</div>
            <div>
              4.1. <strong>Trách nhiệm Bên A:</strong> Bàn giao phòng và các trang thiết bị kèm theo đúng tình trạng sẵn sàng sử dụng; bảo đảm quyền sử dụng phòng riêng tư và hợp pháp cho Bên B; hỗ trợ khắc phục các sự cố hỏng hóc kỹ thuật chung.
            </div>
            <div>
              4.2. <strong>Trách nhiệm Bên B:</strong> Sử dụng phòng đúng mục đích; giữ gìn vệ sinh và bảo quản trang thiết bị; chấp hành nghiêm chỉnh quy định an ninh trật tự, tạm trú tạm vắng và phòng cháy chữa cháy (PCCC); không tàng trữ chất cấm hoặc gây mất trật tự ảnh hưởng xung quanh.
            </div>
          </div>

          {/* ĐIỀU 5 */}
          <div className="contract-section">
            <div className="contract-section-title">ĐIỀU 5: ĐIỀU KHOẢN CHUNG</div>
            <div>
              5.1. Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Trường hợp bên nào muốn đơn phương chấm dứt hợp đồng trước hạn phải thông báo trước ít nhất 30 ngày.
            </div>
            <div>
              5.2. Hợp đồng này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản để cùng thực hiện.
            </div>
          </div>

          {/* CHỮ KÝ */}
          <div className="contract-signature-grid">
            <div>
              <div className="contract-signature-title">ĐẠI DIỆN BÊN A</div>
              <div className="contract-signature-sub">(Ký và ghi rõ họ tên)</div>
              <div style={{ fontWeight: "bold" }}>{contract.landlordName || "Chủ nhà"}</div>
            </div>

            <div>
              <div className="contract-signature-title">ĐẠI DIỆN BÊN B</div>
              <div className="contract-signature-sub">(Ký và ghi rõ họ tên)</div>
              <div style={{ fontWeight: "bold" }}>{primaryTenant?.fullName || "Khách thuê"}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
