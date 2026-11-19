"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Printer, X, FileText, Buildings } from "@phosphor-icons/react";
import type { ContractRow } from "../../modules/contracts/contract.service";
import { numberToVietnameseWords } from "../../utils/vietnamese-currency-words";
import { money, formatPhoneNumber } from "../../utils/format";

export type PrintableContractModalProps = {
  contract: ContractRow | null;
  initialTemplate?: "rental" | "service";
  onClose: () => void;
};

export function PrintableContractModal({
  contract,
  initialTemplate = "rental",
  onClose,
}: PrintableContractModalProps) {
  if (!contract && initialTemplate !== "service") {
    return null;
  }

  const [template, setTemplate] = useState<"rental" | "service">(
    contract ? initialTemplate : "service",
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateVN = (dStr: string | null) => {
    if (!dStr) return "—";
    const d = new Date(dStr);
    return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  };

  const primaryTenant = contract?.tenants?.[0];
  const contractCode = contract ? contract.id.slice(0, 8).toUpperCase() : "HDDV-HMANAGERS";

  return (
    <AnimatePresence>
      <div
        className="printable-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Xem hợp đồng in ấn"
        onClick={onClose}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .printable-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.78);
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
            margin: 18px 0 6px;
            text-transform: uppercase;
          }
          .contract-subtitle {
            text-align: center;
            font-size: 13px;
            font-style: italic;
            color: #4b5563;
            margin-bottom: 22px;
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
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-page-break {
            break-before: page;
            page-break-before: always;
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
              font-size: 13.5pt;
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
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 820,
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Template Switcher Tabs */}
          <div style={{ display: "inline-flex", background: "rgba(255, 255, 255, 0.15)", borderRadius: 8, padding: 3 }}>
            {contract && (
              <button
                type="button"
                onClick={() => setTemplate("rental")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  backgroundColor: template === "rental" ? "var(--color-primary, #2563eb)" : "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <FileText size={15} />
                <span>HĐ Thuê phòng trọ</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setTemplate("service")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                backgroundColor: template === "service" ? "var(--color-primary, #2563eb)" : "transparent",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <Buildings size={15} />
              <span>HĐ Dịch vụ phần mềm HManagers (quanlytro.me)</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
              aria-label="Đóng"
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
          onClick={(e) => e.stopPropagation()}
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
              Hà Nội, {formatDateVN(contract?.startDate || new Date().toISOString())}
            </div>
          </div>

          {template === "rental" && contract ? (
            /* ════════════════════════════════════════════════════════════════
               MẪU 1: HỢP ĐỒNG THUÊ PHÒNG TRỌ (BỘ LUẬT DÂN SỰ)
               ════════════════════════════════════════════════════════════════ */
            <div>
              <div className="contract-title">HỢP ĐỒNG THUÊ PHÒNG TRỌ</div>
              <div className="contract-subtitle">
                (Số: HĐ-{contractCode} • Căn cứ theo quy định của Bộ luật Dân sự)
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
                        <span><strong>{t.fullName || (t as any).name}</strong></span>
                      </div>
                      <div className="contract-row">
                        <span className="contract-label">Số điện thoại:</span>
                        <span>{t.phone ? formatPhoneNumber(t.phone) : "—"}</span>
                      </div>
                      <div className="contract-row">
                        <span className="contract-label">Số CCCD/CMND:</span>
                        <span>{t.citizenId || (t as any).nationalId || "—"}</span>
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
                {contract.handoverInventory && (
                  <div style={{ marginTop: 4 }}>
                    1.4. <strong>Biên bản bàn giao tài sản phòng:</strong> {contract.handoverInventory}
                  </div>
                )}
              </div>

              {/* ĐIỀU 2 */}
              <div className="contract-section">
                <div className="contract-section-title">ĐIỀU 2: GIÁ THUÊ VÀ TIỀN ĐẶT CỌC</div>
                <div>
                  2.1. Giá thuê phòng là: <strong>{money.format(Number(contract.monthlyRentSnapshot ?? (contract as any).monthlyRent ?? 0))} / tháng</strong>.
                </div>
                <div style={{ fontStyle: "italic", paddingLeft: 16 }}>
                  (Bằng chữ: {numberToVietnameseWords(Number(contract.monthlyRentSnapshot ?? (contract as any).monthlyRent ?? 0))})
                </div>
                <div>
                  2.2. Tiền đặt cọc bảo đảm là: <strong>{money.format(Number(contract.depositSnapshot ?? (contract as any).depositAmount ?? 0))}</strong>.
                </div>
                <div style={{ fontStyle: "italic", paddingLeft: 16 }}>
                  (Bằng chữ: {numberToVietnameseWords(Number(contract.depositSnapshot ?? (contract as any).depositAmount ?? 0))})
                </div>
                <div>
                  2.3. Khoản tiền cọc được Bên B bàn giao cho Bên A ngay khi ký hợp đồng và sẽ được hoàn trả đầy đủ cho Bên B khi kết thúc hợp đồng sau khi trừ đi các chi phí chưa thanh toán hoặc hư hao trang thiết bị (nếu có).
                </div>
                <div>
                  2.4. Thời hạn đóng tiền phòng: Định kỳ {contract.paymentCycleMonths || 1} tháng/lần, từ ngày 01 đến ngày 05 đầu kỳ qua chuyển khoản VietQR Napas hoặc tiền mặt.
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
            </div>
          ) : (
            /* ════════════════════════════════════════════════════════════════
               MẪU 2: HỢP ĐỒNG DỊCH VỤ PHẦN MỀM HMANAGERS (LOZIDO / QUANLYTRO.ME)
               Tham khảo nguyên mẫu: https://quanlytro.me/contract-service/2sdwMA1H1
               ════════════════════════════════════════════════════════════════ */
            <div>
              <div className="contract-title">HỢP ĐỒNG CUNG CẤP DỊCH VỤ</div>
              <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
                CHO THUÊ PHẦN MỀM QUẢN LÝ NHÀ CHO THUÊ HMANAGERS
              </div>
              <div className="contract-subtitle">
                (Số: HDDV-HMANAGERS-{contractCode})
              </div>

              <div style={{ marginBottom: 12, fontSize: 14, fontStyle: "italic" }}>
                - Căn cứ Luật Thương Mại số 36/2005/QH11 của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam được Quốc hội thông qua ngày 14/06/2005.<br />
                - Căn cứ vào nhu cầu của chủ kinh doanh nhà cho thuê: <strong>{contract?.landlordName || "Chủ cơ sở nhà trọ"}</strong> và khả năng cung cấp giải pháp phần mềm quản lý của <strong>CÔNG TY TNHH GIẢI PHÁP THÔNG MINH HMANAGERS</strong>.
              </div>

              <div style={{ marginBottom: 14 }}>
                Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, Chúng tôi gồm có:
              </div>

              {/* BÊN A */}
              <div className="contract-section">
                <div className="contract-section-title">BÊN A (BÊN THUÊ PHẦN MỀM):</div>
                <div className="contract-row">
                  <span className="contract-label">Họ và tên:</span>
                  <span><strong>{contract?.landlordName || "Chủ nhà kinh doanh"}</strong></span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Số điện thoại:</span>
                  <span>{contract?.landlordPhone || "0912 345 678"}</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Cơ sở nhà trọ:</span>
                  <span>{contract?.propertyName || "Hệ thống nhà trọ & căn hộ cho thuê"}</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Địa chỉ:</span>
                  <span>{contract?.propertyAddress || "Hà Nội / TP. Hồ Chí Minh"}</span>
                </div>
              </div>

              {/* BÊN B */}
              <div className="contract-section">
                <div className="contract-section-title">BÊN B (BÊN CHO THUÊ PHẦN MỀM):</div>
                <div className="contract-row">
                  <span className="contract-label">Tổ chức:</span>
                  <span><strong>CÔNG TY TNHH GIẢI PHÁP THÔNG MINH HMANAGERS</strong></span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Mã số thuế:</span>
                  <span>0318272823</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Địa chỉ trụ sở:</span>
                  <span>Tòa nhà Công nghệ HManagers, TP. Hà Nội — TP. Hồ Chí Minh</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Đại diện:</span>
                  <span><strong>ĐOÀN VĂN QUỐC</strong> — Giám đốc Điều hành</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Điện thoại / Hotline:</span>
                  <span>0965 227 453 • Email: support@hmanagers.vn</span>
                </div>
                <div className="contract-row">
                  <span className="contract-label">Tài khoản ngân hàng:</span>
                  <span><strong>588288611</strong> — Ngân hàng TMCP Quân Đội (MB Bank)</span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                Sau khi thỏa thuận, các bên cùng thống nhất ký kết Hợp đồng cung cấp dịch vụ cho thuê phần mềm quản lý nhà cho thuê HManagers với các điều khoản sau:
              </div>

              {/* ĐIỀU 1 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 1: NỘI DUNG HỢP ĐỒNG &amp; PHẠM VI HỆ THỐNG</div>
                <div>
                  1.1. Thời hạn Hợp đồng: 12 tháng kể từ ngày ký kết và tự động gia hạn theo chu kỳ dịch vụ.
                </div>
                <div>
                  1.2. Trong thời gian hợp đồng, Bên B cung cấp dịch vụ cho thuê phần mềm quản lý nhà cho thuê HManagers (HManagers — Chủ nhà &amp; Ban quản lý) theo yêu cầu của Bên A với 10 phân hệ tính năng nghiệp vụ cốt lõi:
                  <ul style={{ margin: "6px 0 6px 20px", padding: 0 }}>
                    <li><strong>Quản lý Nhà cho thuê &amp; Phân cấp không gian:</strong> Quản lý đa cơ sở, phân chia sơ đồ theo Tầng/Lầu và Dãy phòng.</li>
                    <li><strong>Quản lý Phòng trọ:</strong> Mô tả chi tiết diện tích, đơn giá, kiểm kê nội thất/tiện nghi, trạng thái Sẵn sàng / Đang ở / Bảo trì.</li>
                    <li><strong>Quản lý Nghiệp vụ Cọc:</strong> Tạo và theo dõi cọc giữ chỗ, cọc hợp đồng bảo đảm và hoàn cọc khi thanh lý.</li>
                    <li><strong>Quản lý Hợp đồng thuê:</strong> Lập, lưu trữ hợp đồng thuê, bàn giao tài sản, thanh lý trừ hư hao và in hợp đồng chuẩn A4.</li>
                    <li><strong>Quản lý Khách hàng &amp; Cư dân:</strong> Lưu trữ hồ sơ định danh CCCD 2 mặt, quê quán/thường trú hỗ trợ khai báo tạm trú CT01, quản lý biển số xe và liên hệ khẩn cấp.</li>
                    <li><strong>Quản lý Điện, Nước &amp; Dịch vụ:</strong> Ghi chỉ số công tơ, định mức nước, rác, Internet/Wifi, gửi xe, thang máy.</li>
                    <li><strong>Lập Hóa đơn &amp; Thanh toán tự động:</strong> Lập hóa đơn hàng loạt, tự động sinh mã VietQR Napas ngân hàng và đối soát thanh toán.</li>
                    <li><strong>Báo cáo &amp; Thống kê:</strong> Thống kê tỷ lệ lấp đầy, doanh thu theo chu kỳ, cảnh báo hợp đồng sắp hết hạn và hóa đơn quá hạn.</li>
                    <li><strong>Sổ quỹ Thu / Chi &amp; Lợi nhuận ròng:</strong> Ghi nhận chi phí vận hành, tính toán Lợi nhuận ròng (Net Profit = Tổng thu thực tế - Chi phí sửa chữa/vận hành).</li>
                    <li><strong>Đa nền tảng &amp; Bảo mật:</strong> Hỗ trợ giao diện Web, Responsive Mobile; mã hóa dữ liệu và cam kết không cung cấp cho bên thứ ba.</li>
                  </ul>
                </div>
              </div>

              {/* ĐIỀU 2 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 2: TRÁCH NHIỆM CỦA CÁC BÊN</div>
                <div>
                  2.1. <strong>Trách nhiệm Bên B (Đơn vị cung cấp phần mềm):</strong>
                  <ul style={{ margin: "4px 0 4px 20px", padding: 0 }}>
                    <li>Cung cấp quyền sử dụng hệ thống phần mềm HManagers phiên bản ổn định và mới nhất.</li>
                    <li><strong>Sao lưu dữ liệu định kỳ:</strong> Thực hiện Backup dữ liệu ít nhất 1 tháng/lần vào ngày 01 hàng tháng; đảm bảo an toàn, bảo mật dữ liệu Bên A và cư dân.</li>
                    <li>Đảm bảo hệ thống vận hành liên tục 24/7 với tỷ lệ sẵn sàng cao (Uptime &ge; 99.5%).</li>
                    <li>Kịp thời sửa lỗi, nâng cấp và hỗ trợ khắc phục các vấn đề kỹ thuật phát sinh trong quá trình vận hành.</li>
                  </ul>
                </div>
                <div>
                  2.2. <strong>Trách nhiệm Bên A (Chủ kinh doanh nhà cho thuê):</strong>
                  <ul style={{ margin: "4px 0 4px 20px", padding: 0 }}>
                    <li>Tiếp nhận, quản lý và sử dụng phần mềm HManagers đúng mục đích quản lý nhà trọ, căn hộ cho thuê.</li>
                    <li>Kịp thời thông báo cho Bên B khi phát hiện lỗi hoặc sự cố phát sinh để Bên B nhanh chóng xử lý.</li>
                    <li>Thanh toán phí duy trì dịch vụ đúng hạn theo gói thuê bao đã đăng ký.</li>
                  </ul>
                </div>
              </div>

              {/* ĐIỀU 3 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 3: QUY TRÌNH BẢO TRÌ VÀ NÂNG CẤP</div>
                <div>
                  3.1. Bên B thực hiện bảo trì, vá lỗi và tự động cập nhật các phiên bản nâng cấp tính năng mới cho Bên A trong suốt thời hạn hợp đồng.
                </div>
                <div>
                  3.2. Thời gian hỗ trợ kỹ thuật: Giờ hành chính từ thứ 2 đến thứ 7 qua các kênh Hotline, Zalo CSKH và Cổng hỗ trợ trực tuyến.
                </div>
              </div>

              {/* ĐIỀU 4 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 4: PHÍ DỊCH VỤ &amp; PHƯƠNG THỨC THANH TOÁN</div>
                <div>
                  4.1. Phí sử dụng dịch vụ phần mềm HManagers được tính theo gói thuê bao chu kỳ (12 tháng).
                </div>
                <div>
                  4.2. Phương thức thanh toán: Chuyển khoản ngân hàng qua mã VietQR hoặc số tài khoản:
                  <ul style={{ margin: "4px 0 4px 20px", padding: 0 }}>
                    <li><strong>Ngân hàng:</strong> Ngân hàng Thương mại Cổ phần Quân đội (MB Bank)</li>
                    <li><strong>Tên tài khoản:</strong> CTY TNHH GIAI PHAP THONG MINH POPIPLUS / HMANAGERS</li>
                    <li><strong>Số tài khoản:</strong> 588288611</li>
                    <li><strong>Nội dung chuyển khoản:</strong> HDDV-{contractCode}</li>
                  </ul>
                </div>
              </div>

              {/* ĐIỀU 5 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 5: BẢN QUYỀN VÀ QUYỀN SỞ HỮU TRÍ TUỆ</div>
                <div>
                  5.1. Bản quyền phần mềm quản lý nhà cho thuê HManagers thuộc Bên B. Bên B cấp phép cho Bên A quyền sử dụng, vận hành phần mềm trong hệ thống quản lý nội bộ của Bên A.
                </div>
                <div>
                  5.2. Bên A không được sao chép mã nguồn, dịch ngược hoặc chuyển giao phần mềm cho bên thứ ba khi chưa có sự đồng ý bằng văn bản của Bên B.
                </div>
              </div>

              {/* ĐIỀU 6 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 6: HIỆU LỰC VÀ CHẤM DỨT HỢP ĐỒNG</div>
                <div>
                  6.1. Hợp đồng có hiệu lực kể từ ngày ký. Trường hợp một bên muốn chấm dứt trước thời hạn phải thông báo trước bằng văn bản hoặc email ít nhất 30 ngày.
                </div>
                <div>
                  6.2. Bên vi phạm điều khoản dẫn đến việc chấm dứt hợp đồng trước hạn sẽ phải chịu trách nhiệm hoàn trả hoặc bồi thường theo quy định pháp luật hiện hành.
                </div>
              </div>

              {/* ĐIỀU 7 */}
              <div className="contract-section print-avoid-break">
                <div className="contract-section-title">ĐIỀU 7: ĐIỀU KHOẢN CHUNG</div>
                <div>
                  7.1. Các bên cam kết thực hiện đúng các điều khoản đã thỏa thuận. Mọi tranh chấp nếu có sẽ được thương lượng giải quyết trên tinh thần hợp tác.
                </div>
                <div>
                  7.2. Hợp đồng được lập thành 03 bản gốc bằng tiếng Việt có giá trị pháp lý như nhau: Bên A giữ 01 bản, Bên B giữ 01 bản để thực hiện và 01 bản lưu trữ điện tử trên hệ thống HManagers để truy xuất.
                </div>
              </div>

              {/* CHỮ KÝ */}
              <div className="contract-signature-grid">
                <div>
                  <div className="contract-signature-title">ĐẠI DIỆN BÊN A</div>
                  <div className="contract-signature-sub">(Ký và ghi rõ họ tên)</div>
                  <div style={{ height: 60 }} />
                  <div><strong>{contract?.landlordName || "Chủ nhà kinh doanh"}</strong></div>
                </div>

                <div>
                  <div className="contract-signature-title">ĐẠI DIỆN BÊN B</div>
                  <div className="contract-signature-sub">(Ký tên và đóng dấu)</div>
                  <div style={{ height: 60 }} />
                  <div><strong>Đoàn Văn Quốc</strong><br /><span style={{ fontSize: 13, fontStyle: "italic", color: "#6b7280" }}>Giám đốc CTY Giải pháp Thông minh HManagers</span></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
