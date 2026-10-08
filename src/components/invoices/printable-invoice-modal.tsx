"use client";

import { motion, AnimatePresence } from "motion/react";
import { Printer, X, DownloadSimple, QrCode } from "@phosphor-icons/react";
import type { InvoiceDetail, InvoiceRow } from "../../modules/invoices/invoice.service";
import { numberToVietnameseWords } from "../../utils/vietnamese-currency-words";
import { buildVietQrUrl, getBankInfo } from "../../utils/vietqr";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export type PrintableInvoiceModalProps = {
  invoice: InvoiceDetail | InvoiceRow | null;
  onClose: () => void;
};

export function PrintableInvoiceModal({ invoice, onClose }: PrintableInvoiceModalProps) {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const remaining = Math.max(0, invoice.totalAmount - (invoice.paidAmount || 0));
  const transferDesc = `TT P${invoice.roomNumber.replace(/\s+/g, "")} ${invoice.billingPeriodStart.replace(/-/g, "").slice(0, 6)}`;
  const hasBank = !!(invoice.bankCode && invoice.bankAccount);
  const bankInfo = invoice.bankCode ? getBankInfo(invoice.bankCode) : undefined;

  const qrUrl = hasBank
    ? buildVietQrUrl({
        bankCode: invoice.bankCode!,
        bankAccount: invoice.bankAccount!,
        accountHolder: invoice.accountHolder,
        amount: remaining > 0 ? remaining : invoice.totalAmount,
        description: transferDesc,
        template: "compact2",
      })
    : null;

  // Format billing period display e.g. "02/2025"
  const periodParts = invoice.billingPeriodStart.split("-");
  const periodLabel = periodParts.length >= 2 ? `${periodParts[1]}/${periodParts[0]}` : invoice.billingPeriodStart;

  // Items fallback if row only
  const items = "items" in invoice && Array.isArray(invoice.items) && invoice.items.length > 0
    ? invoice.items
    : [
        {
          id: "item-default",
          description: "Tiền thuê phòng & dịch vụ kỳ " + periodLabel,
          quantity: "1",
          unitPriceSnapshot: invoice.totalAmount,
          amount: invoice.totalAmount,
          itemType: "rent" as const,
        },
      ];

  const ITEM_TYPE_LABELS: Record<string, string> = {
    rent: "Tiền phòng",
    electricity: "Tiền điện",
    water: "Tiền nước",
    service: "Dịch vụ",
    adjustment: "Phụ thu",
  };

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
          .printable-sheet {
            background: #ffffff;
            color: #111827;
            width: 100%;
            max-width: 780px;
            border-radius: 8px;
            padding: 40px 48px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            position: relative;
            margin-bottom: 30px;
          }
          .print-actions-bar {
            width: 100%;
            max-width: 780px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1f2937;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          .print-table th {
            background: #f3f4f6;
            color: #111827;
            font-weight: 600;
            padding: 8px 10px;
            border: 1px solid #d1d5db;
            text-align: left;
            font-size: 12px;
          }
          .print-table td {
            padding: 8px 10px;
            border: 1px solid #d1d5db;
            color: #1f2937;
            font-size: 12px;
          }

          @media print {
            body * {
              visibility: hidden;
            }
            .printable-sheet, .printable-sheet * {
              visibility: visible;
            }
            .printable-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .no-print, .print-actions-bar {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
          }
        `}} />

        {/* Action Controls Bar (hidden during print) */}
        <div className="print-actions-bar no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              Xem trước Phiếu thu / Hóa đơn A4
            </span>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
              (Hỗ trợ in trực tiếp hoặc Lưu file PDF)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <Printer size={16} />
              In phiếu / Lưu PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                background: "#374151",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
              aria-label="Đóng xem trước"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Paper Sheet */}
        <motion.div
          id="printable-invoice"
          className="printable-sheet"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
        >
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111827", paddingBottom: 12, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 800, margin: "0 0 4px", textTransform: "uppercase", color: "#111827", letterSpacing: "0.3px" }}>
                {invoice.propertyName}
              </h2>
              <div style={{ fontSize: "12px", color: "#4b5563" }}>
                Địa chỉ: {invoice.propertyAddress || "Hệ thống nhà trọ & căn hộ dịch vụ"}
              </div>
            </div>

            <div style={{ textAlign: "right", fontSize: "11px", color: "#4b5563" }}>
              <div><strong>Mẫu số:</strong> 01-TT/HĐTR</div>
              <div><strong>Số phiếu:</strong> #{invoice.id.slice(0, 8).toUpperCase()}</div>
              <div><strong>Ngày phát hành:</strong> {invoice.issueDate || invoice.billingPeriodStart}</div>
            </div>
          </div>

          {/* Title Banner */}
          <div style={{ textAlign: "center", margin: "16px 0 20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              PHIẾU BÁO THU TIỀN NHÀ &amp; DỊCH VỤ
            </h1>
            <div style={{ fontSize: "13px", fontStyle: "italic", color: "#4b5563" }}>
              Kỳ thu: <strong>Tháng {periodLabel}</strong> (Hạn thanh toán: {invoice.dueDate || "Ngày 10 cùng tháng"})
            </div>
          </div>

          {/* Tenant & Room details */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", background: "#f9fafb", padding: "12px 16px", borderRadius: "6px", border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <div>
              <span style={{ color: "#6b7280" }}>Người thuê phòng:</span>{" "}
              <strong style={{ fontSize: "14px", color: "#111827" }}>
                {invoice.tenantName || "Khách thuê phòng " + invoice.roomNumber}
              </strong>
            </div>

            <div>
              <span style={{ color: "#6b7280" }}>Phòng số:</span>{" "}
              <strong style={{ fontSize: "14px", color: "#2563eb" }}>Phòng {invoice.roomNumber}</strong>
            </div>

            <div>
              <span style={{ color: "#6b7280" }}>Số điện thoại:</span>{" "}
              <span>{invoice.tenantPhone || "—"}</span>
            </div>

            <div>
              <span style={{ color: "#6b7280" }}>Trạng thái:</span>{" "}
              <span style={{ fontWeight: 600 }}>
                {invoice.status === "paid"
                  ? "Đã thanh toán đủ"
                  : invoice.status === "partially_paid"
                  ? "Đã thanh toán 1 phần"
                  : "Chờ thanh toán"}
              </span>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>STT</th>
                <th>Khoản thu</th>
                <th style={{ width: 90 }}>Phân loại</th>
                <th style={{ width: 70, textAlign: "center" }}>Số lượng</th>
                <th style={{ width: 110, textAlign: "right" }}>Đơn giá (đ)</th>
                <th style={{ width: 120, textAlign: "right" }}>Thành tiền (đ)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: "center", color: "#6b7280" }}>{idx + 1}</td>
                  <td><strong>{item.description}</strong></td>
                  <td style={{ color: "#4b5563" }}>{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</td>
                  <td style={{ textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {money.format(item.unitPriceSnapshot)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {money.format(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, paddingRight: 12 }}>
                  Tổng cộng tiền dịch vụ:
                </td>
                <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#111827", fontVariantNumeric: "tabular-nums" }}>
                  {money.format(invoice.totalAmount)}
                </td>
              </tr>
              {invoice.paidAmount !== undefined && invoice.paidAmount > 0 && (
                <>
                  <tr>
                    <td colSpan={5} style={{ textAlign: "right", color: "#16a34a", paddingRight: 12 }}>
                      Đã thanh toán trước đó:
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                      -{money.format(invoice.paidAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, paddingRight: 12, color: "#dc2626" }}>
                      Số tiền còn phải thanh toán:
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontSize: "14px", color: "#dc2626", fontVariantNumeric: "tabular-nums" }}>
                      {money.format(remaining)}
                    </td>
                  </tr>
                </>
              )}
            </tfoot>
          </table>

          {/* Amount in words */}
          <div style={{ marginBottom: 20, padding: "8px 12px", background: "#f3f4f6", borderRadius: 6, borderLeft: "4px solid #2563eb" }}>
            <span style={{ color: "#4b5563", fontSize: "12px" }}>Số tiền bằng chữ: </span>
            <strong style={{ fontStyle: "italic", fontSize: "13px", color: "#111827" }}>
              {numberToVietnameseWords(remaining > 0 ? remaining : invoice.totalAmount)}
            </strong>
          </div>

          {/* Payment & VietQR Transfer Section */}
          {hasBank && qrUrl && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              padding: "14px 18px",
              border: "1px dashed #9ca3af",
              borderRadius: "8px",
              background: "#fafafa",
              marginBottom: 24,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: 6, textTransform: "uppercase", color: "#111827" }}>
                  Thông tin chuyển khoản nhanh qua VietQR (NAPAS 247)
                </div>
                <div style={{ fontSize: "12px", color: "#374151", display: "grid", gap: 3 }}>
                  <div>Ngân hàng thụ hưởng: <strong>{bankInfo?.name || invoice.bankCode} ({invoice.bankCode})</strong></div>
                  <div>Số tài khoản: <strong style={{ fontSize: "14px", fontFamily: "monospace", color: "#2563eb" }}>{invoice.bankAccount}</strong></div>
                  <div>Tên người thụ hưởng: <strong style={{ textTransform: "uppercase" }}>{invoice.accountHolder || "CHỦ NHÀ"}</strong></div>
                  <div>Nội dung chuyển khoản: <strong style={{ fontFamily: "monospace", color: "#d97706" }}>{transferDesc}</strong></div>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginTop: 4 }}>
                    * Hỗ trợ quét mã thanh toán tức thì qua tất cả các ứng dụng Ngân hàng và Ví điện tử.
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <img
                  src={qrUrl}
                  alt="Mã VietQR thanh toán"
                  style={{ width: 120, height: 120, objectFit: "contain", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", padding: 4 }}
                />
                <div style={{ fontSize: "10px", color: "#6b7280", marginTop: 2 }}>Quét mã thanh toán</div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", marginTop: 24, paddingTop: 10, pageBreakInside: "avoid" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>NGƯỜI NỘP TIỀN</div>
              <div style={{ fontSize: "11px", fontStyle: "italic", color: "#6b7280" }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 60 }} />
              <div style={{ fontWeight: 500, fontSize: "13px" }}>{invoice.tenantName || ""}</div>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>NGƯỜI LẬP PHIẾU / CHỦ NHÀ</div>
              <div style={{ fontSize: "11px", fontStyle: "italic", color: "#6b7280" }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: 60 }} />
              <div style={{ fontWeight: 500, fontSize: "13px" }}>{invoice.accountHolder || ""}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
