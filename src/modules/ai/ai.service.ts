import { getGeminiApiKey } from "../../config/env";
import { getTenantPortalData, type TenantMeterReading } from "../tenant-portal/tenant-portal.service";
import { listMaintenanceRequests, type MaintenanceRow } from "../maintenance/maintenance.service";
import {
  toolGetOverviewStats,
  toolLookupContracts,
  toolLookupMaintenanceRequests,
  toolLookupRooms,
  toolLookupTenants,
  toolLookupUnpaidInvoices,
  type AuthContext,
} from "./ai-tools";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export type ProcessAiQueryInput = {
  userId: string;
  role: string;
  message: string;
  history?: ChatMessage[];
};

export type ProcessAiQueryResult = {
  reply: string;
  toolsUsed: string[];
  suggestions: string[];
};

// ---------------------------------------------------------------------------
// Currency formatting helper
// ---------------------------------------------------------------------------
function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

// ---------------------------------------------------------------------------
// Natural Language Intent Engine (Local & Fallback)
// ---------------------------------------------------------------------------

function extractRoomNumber(text: string): string | null {
  // Check if query is asking generally for vacant/maintenance rooms, not a specific room
  if (text.includes("trống") || text.includes("nào trống") || text.includes("danh sách phòng")) {
    return null;
  }

  // Matches "phòng 101", "room 204", "p.101", "p101", "phòng A2"
  const prefixMatch = text.match(/\b(?:phòng|room|p\.)\s*([a-zA-Z0-9_-]+)/i) || text.match(/\bp([0-9]{2,4}[a-zA-Z]?)\b/i);
  if (prefixMatch) {
    const candidate = prefixMatch[1].trim();
    const blacklist = ["trống", "nào", "gì", "bảo", "sửa", "khách", "thuê", "tất cả", "ở", "sắp", "hết"];
    if (blacklist.includes(candidate.toLowerCase())) {
      return null;
    }
    return candidate;
  }

  // Check standalone 3 or 4-digit numbers if preceded or followed by room context
  const numMatch = text.match(/\b([1-9][0-9]{2,3})\b/);
  if (numMatch && (text.includes("phòng") || text.includes("hợp đồng") || text.includes("thuê"))) {
    return numMatch[1];
  }

  return null;
}

export async function processWithLocalEngine(
  ctx: AuthContext,
  message: string,
): Promise<ProcessAiQueryResult> {
  const lower = message.toLowerCase();
  const roomNumber = extractRoomNumber(lower);
  const toolsUsed: string[] = [];

  // 1. Debt & Unpaid Invoices
  if (
    lower.includes("chưa thanh toán") ||
    lower.includes("nợ tiền") ||
    lower.includes("chưa nộp") ||
    lower.includes("chưa đóng") ||
    lower.includes("quá hạn") ||
    (lower.includes("hóa đơn") && (lower.includes("nợ") || lower.includes("chưa")))
  ) {
    toolsUsed.push("lookup_unpaid_invoices");
    const data = await toolLookupUnpaidInvoices(ctx, { roomNumber: roomNumber || undefined });

    if (data.totalUnpaidInvoices === 0) {
      return {
        reply: `🎉 **Tuyệt vời! Hiện tại không có hóa đơn nào bị nợ hoặc chưa thanh toán.**\nTất cả khách thuê đều đã hoàn thành đầy đủ nghĩa vụ tiền phòng & điện nước.`,
        toolsUsed,
        suggestions: [
          "Doanh thu tháng này là bao nhiêu?",
          "Hợp đồng nào sắp hết hạn trong 30 ngày?",
          "Tỷ lệ lấp đầy phòng hiện tại?",
        ],
      };
    }

    let reply = `📊 **Danh sách hóa đơn chưa thanh toán (${data.totalUnpaidInvoices} hóa đơn - Tổng nợ: ${formatVND(data.totalDebtAmount)}):**\n\n`;
    for (const inv of data.invoices) {
      reply += `- **Phòng ${inv.roomNumber}** (${inv.propertyName}):\n`;
      reply += `  • Khách thuê: **${inv.tenantName || "Chưa cập nhật"}** ${inv.tenantPhone ? `(📞 ${inv.tenantPhone})` : ""}\n`;
      reply += `  • Số tiền còn nợ: **${formatVND(inv.remainingDebt)}** (Tổng hóa đơn: ${formatVND(inv.totalAmount)})\n`;
      reply += `  • Hạn đóng: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}\n\n`;
    }
    reply += `> 💡 **Khuyến nghị**: Bạn có thể vào trang **[Hóa đơn](/invoices)** để kiểm tra mã VietQR hoặc gửi thông báo nhắc nợ tới khách thuê.`;

    return {
      reply,
      toolsUsed,
      suggestions: [
        "Xem danh sách phòng trống",
        "Doanh thu tháng này là bao nhiêu?",
        "Hợp đồng nào sắp hết hạn trong 30 ngày?",
      ],
    };
  }

  // 2. Contracts & Expiration (Check before room lookup if asking about contracts)
  if (
    lower.includes("hợp đồng") ||
    (lower.includes("hết hạn") && !lower.includes("hóa đơn")) ||
    lower.includes("đáo hạn") ||
    lower.includes("bao nhiêu ngày")
  ) {
    toolsUsed.push("lookup_contracts");
    const expiringWithinDays = lower.includes("30") ? 30 : lower.includes("7") ? 7 : undefined;
    const data = await toolLookupContracts(ctx, {
      roomNumber: roomNumber || undefined,
      expiringWithinDays,
    });

    if (roomNumber) {
      const contract = data.contracts.find((c) => c.roomNumber.toLowerCase() === roomNumber.toLowerCase()) || data.contracts[0];
      if (!contract) {
        return {
          reply: `📄 **Không có hợp đồng nào đang hoạt động cho Phòng ${roomNumber}.**`,
          toolsUsed,
          suggestions: ["Xem các hợp đồng sắp hết hạn", "Danh sách phòng trống", "Tạo hợp đồng mới"],
        };
      }

      let reply = `📄 **Hợp đồng thuê Phòng ${contract.roomNumber} (${contract.propertyName}):**\n\n`;
      reply += `- **Khách thuê chính**: **${contract.primaryTenant}** ${contract.tenantPhone ? `(📞 ${contract.tenantPhone})` : ""}\n`;
      if (contract.roommates.length > 0) {
        reply += `- **Người ở cùng**: ${contract.roommates.join(", ")}\n`;
      }
      reply += `- **Thời hạn**: Từ ${new Date(contract.startDate).toLocaleDateString("vi-VN")} đến ${contract.endDate ? new Date(contract.endDate).toLocaleDateString("vi-VN") : "Vô thời hạn"}\n`;
      reply += `- **Thời gian còn lại**: ${contract.daysRemaining !== null ? (contract.daysRemaining > 0 ? `🔥 **Còn ${contract.daysRemaining} ngày**` : "⚠️ **Đã hết hạn**") : "Hợp đồng vô thời hạn"}\n`;
      reply += `- **Tiền thuê**: ${formatVND(contract.monthlyRent)}/tháng | **Tiền cọc**: ${formatVND(contract.deposit)}\n`;

      return {
        reply,
        toolsUsed,
        suggestions: [
          "Hóa đơn tháng này của phòng này",
          "Hợp đồng nào sắp hết hạn trong 30 ngày?",
          "Tổng quan doanh thu",
        ],
      };
    }

    let reply = `📄 **Danh sách hợp đồng thuê nhà (${data.totalMatched} hợp đồng):**\n\n`;
    for (const c of data.contracts.slice(0, 10)) {
      reply += `- **Phòng ${c.roomNumber}** (${c.propertyName}) — Khách: **${c.primaryTenant}**\n`;
      reply += `  • Hết hạn: ${c.endDate ? new Date(c.endDate).toLocaleDateString("vi-VN") : "Vô thời hạn"} (${c.daysRemaining !== null ? (c.daysRemaining <= 7 ? `🚨 Còn ${c.daysRemaining} ngày!` : `Còn ${c.daysRemaining} ngày`) : "Không thời hạn"})\n`;
    }
    return {
      reply,
      toolsUsed,
      suggestions: ["Phòng nào nợ tiền?", "Doanh thu tháng này", "Xem chi tiết phòng trống"],
    };
  }

  // 3. Room lookup (specific room or vacant rooms)
  if (
    roomNumber ||
    lower.includes("phòng trống") ||
    lower.includes("phòng nào trống") ||
    lower.includes("trống") ||
    lower.includes("ai thuê") ||
    lower.includes("đang ở") ||
    (lower.includes("phòng") && (lower.includes("tình trạng") || lower.includes("danh sách")))
  ) {
    toolsUsed.push("lookup_rooms");
    const data = await toolLookupRooms(ctx, {
      roomNumber: roomNumber || undefined,
      status: lower.includes("bảo trì") ? "maintenance" : undefined,
    });

    // List vacant rooms
    if (lower.includes("trống") || (!roomNumber && lower.includes("phòng"))) {
      const vacant = data.rooms.filter((r) => !r.isOccupied && r.status === "ready");
      let reply = `🏢 **Danh sách phòng đang trống (${vacant.length} phòng):**\n\n`;
      if (vacant.length === 0) {
        reply += `Hiện tại **không có phòng trống**, toàn bộ phòng đã được lấp đầy hoặc đang bảo trì!`;
      } else {
        for (const r of vacant) {
          reply += `- **Phòng ${r.roomNumber}** (${r.propertyName}) — Giá: **${formatVND(r.monthlyRent)}/tháng** ${r.areaM2 ? `(${r.areaM2} m²)` : ""}\n`;
        }
      }
      return {
        reply,
        toolsUsed,
        suggestions: ["Doanh thu tháng này", "Hóa đơn nào chưa thanh toán?", "Tỷ lệ lấp đầy phòng"],
      };
    }

    if (roomNumber) {
      const room = data.rooms.find((r) => r.roomNumber.toLowerCase() === roomNumber.toLowerCase()) || data.rooms[0];
      if (!room) {
        return {
          reply: `🔍 **Không tìm thấy phòng "${roomNumber}"** trong danh sách nhà trọ bạn quản lý. Vui lòng kiểm tra lại số phòng trên trang [Phòng](/properties).`,
          toolsUsed,
          suggestions: ["Danh sách các phòng đang trống", "Hóa đơn nào chưa thanh toán?", "Tổng số phòng đang quản lý"],
        };
      }

      let reply = `🏠 **Thông tin chi tiết Phòng ${room.roomNumber} (${room.propertyName}):**\n\n`;
      reply += `- **Trạng thái**: ${room.status === "maintenance" ? "⚠️ Đang bảo trì" : room.isOccupied ? "🟢 Đang có người thuê" : "⚪ Đang trống (Sẵn sàng cho thuê)"}\n`;
      reply += `- **Giá thuê tháng**: ${formatVND(room.monthlyRent)}\n`;
      reply += `- **Diện tích**: ${room.areaM2 ? `${room.areaM2} m²` : "Chưa ghi nhận"}\n`;

      if (room.isOccupied) {
        reply += `- **Người thuê chính**: **${room.tenantName || "Chưa gán tên"}**\n`;
        if (room.tenantPhone) reply += `- **Số điện thoại**: ${room.tenantPhone}\n`;
        if (room.contractEndDate) {
          const endDate = new Date(room.contractEndDate);
          const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          reply += `- **Hạn hợp đồng**: ${endDate.toLocaleDateString("vi-VN")} (${daysLeft > 0 ? `Còn ${daysLeft} ngày` : "Đã hết hạn"})\n`;
        }
      } else {
        reply += `\n*Phòng này hiện đang để trống, bạn có thể lập hợp đồng mới cho khách trên trang [Hợp đồng](/contracts).*`;
      }

      return {
        reply,
        toolsUsed,
        suggestions: [
          `Hợp đồng phòng ${room.roomNumber} còn bao nhiêu ngày?`,
          `Phòng ${room.roomNumber} có hóa đơn nợ không?`,
          "Danh sách phòng trống hiện tại",
        ],
      };
    }
  }

  // 4. Financial & Overview Stats
  if (
    lower.includes("doanh thu") ||
    lower.includes("lấp đầy") ||
    lower.includes("thống kê") ||
    lower.includes("tổng quan") ||
    lower.includes("tài chính") ||
    lower.includes("thu được bao nhiêu") ||
    lower.includes("tiền điện") ||
    lower.includes("tiền nước")
  ) {
    toolsUsed.push("get_overview_stats");
    const data = await toolGetOverviewStats(ctx);

    let reply = `📊 **Báo cáo Thống kê & Tổng quan Vận hành Tháng này:**\n\n`;
    reply += `### 🏢 Tình trạng Phòng & Lấp đầy\n`;
    reply += `- **Tổng số phòng**: ${data.occupancy.totalRooms} phòng\n`;
    reply += `- **Đang cho thuê**: ${data.occupancy.occupiedRooms} phòng\n`;
    reply += `- **Phòng còn trống**: ${data.occupancy.vacantRooms} phòng\n`;
    reply += `- **Tỷ lệ lấp đầy**: **${data.occupancy.occupancyRate}**\n\n`;

    reply += `### 💰 Tình hình Thu chi & Công nợ\n`;
    reply += `- **Tổng số tiền phải thu**: ${formatVND(data.financial.totalBilled)}\n`;
    reply += `- **Đã thực thu**: **${formatVND(data.financial.totalCollected)}** (${data.financial.collectionRate})\n`;
    reply += `- **Tổng tiền còn nợ**: **${formatVND(data.financial.totalDebt)}** (${data.financial.unpaidInvoiceCount} hóa đơn chưa nộp)\n\n`;

    reply += `### ⚡ Tiêu thụ Tiện ích\n`;
    reply += `- **Điện tiêu thụ**: ${data.utility.electricityKwh} kWh\n`;
    reply += `- **Nước tiêu thụ**: ${data.utility.waterM3} m³\n`;

    return {
      reply,
      toolsUsed,
      suggestions: [
        "Những phòng nào chưa thanh toán?",
        "Hợp đồng nào sắp hết hạn trong 30 ngày?",
        "Danh sách phòng trống",
      ],
    };
  }

  // 5. Maintenance Requests
  if (
    lower.includes("sự cố") ||
    lower.includes("sửa chữa") ||
    lower.includes("bảo trì") ||
    lower.includes("hỏng")
  ) {
    toolsUsed.push("lookup_maintenance_requests");
    const data = await toolLookupMaintenanceRequests(ctx, {
      status: lower.includes("xong") || lower.includes("đã xử lý") ? "resolved" : "pending",
    });

    if (data.totalMatched === 0) {
      return {
        reply: `🔧 **Hiện tại không có yêu cầu bảo trì / báo hỏng nào chưa xử lý.** Toàn bộ thiết bị và cơ sở vật chất đều hoạt động bình thường!`,
        toolsUsed,
        suggestions: ["Thống kê doanh thu tháng này", "Hợp đồng nào sắp hết hạn?", "Phòng nào chưa nộp tiền?"],
      };
    }

    let reply = `🔧 **Danh sách yêu cầu bảo trì & sửa chữa (${data.totalMatched} yêu cầu):**\n\n`;
    for (const req of data.requests) {
      reply += `- **Phòng ${req.roomNumber}** (${req.propertyName}): **${req.title}**\n`;
      reply += `  • Danh mục: ${req.category} | Mức độ: **${req.priority}**\n`;
      reply += `  • Khách báo: ${req.tenantName || "Không xác định"} ${req.tenantPhone ? `(📞 ${req.tenantPhone})` : ""}\n`;
      reply += `  • Trạng thái: ${req.status === "pending" ? "⏳ Chờ tiếp nhận" : "⚙️ Đang xử lý"}\n\n`;
    }
    reply += `> 💡 Bạn có thể cập nhật tiến độ xử lý và chi phí tại trang **[Bảo trì](/maintenance)**.`;

    return {
      reply,
      toolsUsed,
      suggestions: ["Xem phòng chưa thanh toán", "Xem hợp đồng sắp hết hạn", "Tổng quan doanh thu"],
    };
  }

  // 6. Tenants lookup
  if (lower.includes("khách thuê") || lower.includes("người thuê") || lower.includes("tìm khách")) {
    toolsUsed.push("lookup_tenants");
    const data = await toolLookupTenants(ctx);

    let reply = `👥 **Danh bạ khách thuê (${data.totalMatched} người):**\n\n`;
    for (const t of data.tenants.slice(0, 10)) {
      reply += `- **${t.fullName}** ${t.phone ? `(📞 ${t.phone})` : ""} — Hiện ở: **Phòng ${t.currentRoom}**\n`;
    }
    return {
      reply,
      toolsUsed,
      suggestions: ["Hóa đơn nào chưa thanh toán?", "Hợp đồng sắp hết hạn", "Tổng quan doanh thu"],
    };
  }

  // Default: Greeting and Help menu
  return {
    reply: `👋 **Xin chào! Tôi là Trợ lý AI Quản lý Nhà trọ của bạn.**\n\nTôi có thể giúp bạn tra cứu nhanh thông tin và số liệu vận hành theo thời gian thực:\n\n- 🔍 **Tra cứu phòng**: *"Phòng 203 đang ai thuê?"*, *"Danh sách phòng đang trống?"*\n- 📄 **Tra cứu hợp đồng**: *"Hợp đồng phòng 101 còn bao nhiêu ngày?"*, *"Hợp đồng nào sắp hết hạn?"*\n- 💰 **Hóa đơn & Nợ tiền**: *"Tháng này có bao nhiêu phòng chưa thanh toán?"*, *"Danh sách nợ tiền"* \n- 📊 **Doanh thu & Báo cáo**: *"Doanh thu tháng này là bao nhiêu?"*, *"Tỷ lệ lấp đầy phòng?"*\n- 🔧 **Sự cố & Bảo trì**: *"Có yêu cầu sửa chữa nào chưa giải quyết không?"*\n\nBạn muốn tra cứu thông tin gì ngay bây giờ?`,
    toolsUsed: [],
    suggestions: [
      "Tháng này có bao nhiêu phòng chưa thanh toán?",
      "Hợp đồng nào sắp hết hạn trong 30 ngày?",
      "Doanh thu và tỷ lệ lấp đầy tháng này",
      "Danh sách các phòng đang trống",
    ],
  };
}

// ---------------------------------------------------------------------------
// Tenant-Specific AI Engine (Cư dân / Khách thuê)
// ---------------------------------------------------------------------------

export async function processTenantAiQuery(
  userId: string,
  message: string,
): Promise<ProcessAiQueryResult> {
  const lower = message.toLowerCase();

  // 1. Privacy & Security Guard: Block confidential landlord business data
  const landlordKeywords = [
    "doanh thu",
    "lợi nhuận",
    "lãi",
    "thu nhập của chủ",
    "kiếm được bao nhiêu",
    "phòng khác",
    "các phòng khác",
    "nợ của phòng khác",
    "ai nợ tiền",
    "tỷ lệ lấp đầy",
    "danh sách phòng trống",
    "tổng tiền thu được",
    "doanh số",
    "bao nhiêu phòng nợ",
    "ai chưa thanh toán",
    "danh sách khách thuê",
  ];

  if (landlordKeywords.some((k) => lower.includes(k))) {
    return {
      reply: `🔒 **Thông tin nội bộ bảo mật của Ban quản lý:**\n\nDữ liệu về doanh thu tổng thể, lợi nhuận và tình hình tài chính của các phòng khác là thông tin nội bộ của Chủ nhà/Ban quản lý, không áp dụng cho tài khoản Khách thuê.\n\nVới tư cách là Cư dân/Khách thuê, tôi có thể hỗ trợ bạn các nội dung sau:\n- 🧾 **Hóa đơn & Tiền phòng:** Tra cứu số tiền cần đóng, hạn nộp, tạo mã VietQR chuyển khoản.\n- ⚡ **Điện & Nước:** Xem số điện, số nước chốt kỳ này và đơn giá.\n- 📋 **Nội quy & An ninh:** Giờ giấc mở/khóa cổng, phòng cháy chữa cháy (PCCC), rác thải.\n- 📑 **Hồ sơ tạm trú CT01:** Hướng dẫn hoàn thiện CCCD và xuất tờ khai tạm trú Công an.\n- 🔧 **Báo sự cố:** Gửi yêu cầu sửa chữa trang thiết bị phòng.`,
      toolsUsed: ["tenant_privacy_guard"],
      suggestions: [
        "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
        "Chỉ số điện nước phòng tôi tháng này",
        "Nội quy an ninh và giờ giấc nhà trọ",
      ],
    };
  }

  // 2. Fetch tenant portal data
  let portalData;
  let maintenance: MaintenanceRow[] = [];
  try {
    const [pData, mList] = await Promise.all([
      getTenantPortalData(userId),
      listMaintenanceRequests({ userId, role: "tenant" }).catch(() => []),
    ]);
    portalData = pData;
    maintenance = mList;
  } catch {
    portalData = null;
    maintenance = [];
  }

  const tenant = portalData?.tenant;
  const stay = portalData?.stay;
  const invoices = portalData?.invoices || [];
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const meters: TenantMeterReading[] = portalData?.meters || [];

  // A. Rent & Invoice intent
  if (
    lower.includes("hóa đơn") ||
    lower.includes("tiền phòng") ||
    lower.includes("tiền nhà") ||
    lower.includes("chưa thanh toán") ||
    lower.includes("nợ") ||
    lower.includes("thanh toán") ||
    lower.includes("chuyển khoản") ||
    lower.includes("vietqr") ||
    lower.includes("stk") ||
    lower.includes("tài khoản")
  ) {
    if (unpaidInvoices.length > 0) {
      const inv = unpaidInvoices[0];
      const remaining = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
      let reply = `🧾 **Thông tin Hóa đơn phòng ${inv.roomNumber}:**\n`;
      reply += `- **Kỳ hóa đơn:** ${inv.billingPeriodStart}\n`;
      reply += `- **Tổng số tiền:** **${formatVND(inv.totalAmount)}**\n`;
      if (inv.paidAmount && inv.paidAmount > 0) {
        reply += `- **Đã thanh toán:** ${formatVND(inv.paidAmount)}\n`;
        reply += `- **Còn phải trả:** **${formatVND(remaining)}**\n`;
      }
      reply += `- **Hạn thanh toán:** ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("vi-VN") : "Đầu tháng"}\n`;
      reply += `- **Trạng thái:** ${inv.status === "partially_paid" ? "Đã đóng một phần" : "Chưa thanh toán"}\n\n`;

      if (inv.bankAccount && inv.bankCode) {
        reply += `💳 **Thông tin chuyển khoản:**\n`;
        reply += `- **Ngân hàng:** ${inv.bankCode}\n`;
        reply += `- **Số tài khoản:** \`${inv.bankAccount}\`\n`;
        reply += `- **Chủ tài khoản:** **${inv.accountHolder || "Chủ nhà"}**\n`;
        reply += `\n*Bạn có thể bấm nút "VietQR" trên Cổng thông tin để quét mã QR thanh toán nhanh chóng và tự động điền đúng nội dung.*`;
      }
      return {
        reply,
        toolsUsed: ["lookup_tenant_invoices"],
        suggestions: [
          "Chỉ số điện nước phòng tôi tháng này",
          "Nội quy an ninh và giờ giấc nhà trọ",
          "Hướng dẫn khai báo tạm trú CT01",
        ],
      };
    } else {
      return {
        reply: `🎉 **Tuyệt vời! Hiện tại bạn không có hóa đơn nào còn nợ.**\nTất cả các hóa đơn tiền phòng và dịch vụ của phòng ${stay ? stay.roomNumber : ""} đều đã được hoàn tất thanh toán đủ. Cảm ơn bạn đã luôn hoàn thành đúng hạn!`,
        toolsUsed: ["lookup_tenant_invoices"],
        suggestions: [
          "Chỉ số điện nước phòng tôi tháng này",
          "Hợp đồng thuê phòng của tôi đến khi nào?",
          "Nội quy an ninh và giờ giấc nhà trọ",
        ],
      };
    }
  }

  // B. Utility Meters (Điện & Nước)
  if (
    lower.includes("điện") ||
    lower.includes("nước") ||
    lower.includes("chỉ số") ||
    lower.includes("số điện") ||
    lower.includes("số nước") ||
    lower.includes("tiêu thụ") ||
    lower.includes("đồng hồ")
  ) {
    if (meters.length > 0) {
      let reply = `⚡💧 **Lịch sử Chỉ số Điện & Nước gần nhất (Phòng ${stay?.roomNumber || ""}):**\n\n`;
      meters.slice(0, 4).forEach((m: TenantMeterReading) => {
        const typeName = m.utilityType === "electricity" ? "Điện ⚡" : "Nước 💧";
        const unit = m.utilityType === "electricity" ? "kWh" : "m³";
        reply += `- **${typeName}** (Kỳ ${m.billingPeriod}): Số cũ **${m.previousValue}** ➔ Số mới **${m.currentValue}** (Tiêu thụ: **${m.consumption} ${unit}** • Đơn giá: ${formatVND(m.unitPriceSnapshot)}/${unit}).\n`;
      });
      reply += `\n*Chỉ số được chủ nhà chốt hàng tháng để tính vào hóa đơn tiền phòng định kỳ.*`;
      return {
        reply,
        toolsUsed: ["lookup_tenant_meters"],
        suggestions: [
          "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
          "Cách tiết kiệm điện nước trong phòng trọ",
          "Nội quy an ninh và giờ giấc nhà trọ",
        ],
      };
    } else {
      return {
        reply: `⚡💧 **Chỉ số Điện & Nước:**\nHiện chưa có bản ghi chốt số điện nước mới nào cho phòng của bạn. Chủ nhà sẽ cập nhật số công tơ vào kỳ chốt số hàng tháng (thường từ ngày 25 đến cuối tháng).`,
        toolsUsed: ["lookup_tenant_meters"],
        suggestions: [
          "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
          "Nội quy an ninh và giờ giấc nhà trọ",
        ],
      };
    }
  }

  // C. House Rules, Security & PCCC
  if (
    lower.includes("nội quy") ||
    lower.includes("giờ giấc") ||
    lower.includes("đóng cửa") ||
    lower.includes("mở cửa") ||
    lower.includes("rác") ||
    lower.includes("vệ sinh") ||
    lower.includes("bạn bè") ||
    lower.includes("khách") ||
    lower.includes("qua đêm") ||
    lower.includes("an ninh") ||
    lower.includes("pccc") ||
    lower.includes("cháy") ||
    lower.includes("tiết kiệm")
  ) {
    return {
      reply: `📋 **Nội quy & An toàn Cư dân tại cơ sở ${stay?.propertyName || "Nhà trọ"}:**\n\n` +
        `1. 🚪 **Giờ giấc & Ra vào:** Khóa cổng chính sau **23:00**. Cư dân dùng vân tay/thẻ từ/chìa khóa riêng để ra vào, vui lòng luôn khép cổng cẩn thận để đảm bảo an ninh chung.\n` +
        `2. 🔇 **Giữ trật tự chung:** Không bật nhạc lớn, hát karaoke hoặc tụ tập gây ồn ào sau **22:00**, tránh ảnh hưởng đến các phòng xung quanh.\n` +
        `3. 👥 **Khách & Bạn bè đến chơi:** Khách đến chơi vui lòng để xe đúng nơi quy định. Nếu có người thân ở lại qua đêm, vui lòng báo trước với Ban Quản lý để khai báo lưu trú theo quy định.\n` +
        `4. 🗑️ **Rác thải & Vệ sinh:** Đựng rác trong túi kín, vứt rác tại khu vực tập kết đúng giờ. Giữ gìn vệ sinh chung hành lang, cầu thang.\n` +
        `5. 🧯 **An toàn PCCC & Điện:** Không sạc xe điện qua đêm ở hành lang thoát hiểm; tắt quạt, điều hòa và bếp điện khi rời khỏi phòng; trang bị bình chữa cháy mini và nắm rõ lối thoát hiểm tòa nhà.`,
      toolsUsed: ["resident_guidelines"],
      suggestions: [
        "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
        "Làm thế nào để báo sự cố hỏng hóc thiết bị?",
        "Hướng dẫn khai báo tạm trú CT01",
      ],
    };
  }

  // D. Maintenance (Sự cố / Báo hỏng)
  if (
    lower.includes("sự cố") ||
    lower.includes("hỏng") ||
    lower.includes("sửa") ||
    lower.includes("bảo trì") ||
    lower.includes("thiết bị") ||
    lower.includes("vòi nước") ||
    lower.includes("bóng đèn") ||
    lower.includes("mất điện") ||
    lower.includes("mất nước")
  ) {
    let reply = `🔧 **Báo sự cố & Sửa chữa thiết bị phòng ${stay?.roomNumber || ""}:**\n\n`;
    if (maintenance.length > 0) {
      reply += `Bạn đang có **${maintenance.length}** yêu cầu đã gửi:\n`;
      maintenance.slice(0, 3).forEach((req: MaintenanceRow) => {
        const statusText = req.status === "resolved" ? "Đã xử lý xong ✅" : req.status === "in_progress" ? "Đang xử lý ⏳" : req.status === "cancelled" ? "Đã hủy ❌" : "Chờ tiếp nhận 🟡";
        reply += `- **${req.title}** (${statusText})\n`;
      });
      reply += `\n`;
    }
    reply += `📌 **Cách gửi yêu cầu sửa chữa mới:**\n` +
      `1. Nhấp vào nút **"Báo sự cố"** màu tím ở đầu Cổng thông tin (hoặc góc phần Sự cố & Sửa chữa).\n` +
      `2. Nhập tiêu đề, mô tả vị trí hỏng (bóng đèn, vòi nước, điều hòa, v.v.).\n` +
      `3. Đính kèm ảnh chụp thực tế để thợ kỹ thuật chuẩn bị trước linh kiện thay thế.\n` +
      `4. Bấm **"Gửi yêu cầu"** — Chủ nhà và kỹ thuật viên sẽ nhận được thông báo ngay lập tức!`;
    return {
      reply,
      toolsUsed: ["lookup_tenant_maintenance"],
      suggestions: [
        "Thời gian xử lý sự cố thường mất bao lâu?",
        "Chi phí sửa chữa do ai chi trả?",
        "Hóa đơn phòng tháng này của tôi",
      ],
    };
  }

  // E. Contract & CT01 Temporary Residence
  if (
    lower.includes("hợp đồng") ||
    lower.includes("thời hạn") ||
    lower.includes("hết hạn") ||
    lower.includes("trả phòng") ||
    lower.includes("cọc") ||
    lower.includes("tạm trú") ||
    lower.includes("ct01") ||
    lower.includes("công an") ||
    lower.includes("cccd")
  ) {
    let reply = `📑 **Hồ sơ Hợp đồng & Tạm trú (Phòng ${stay?.roomNumber || ""}):**\n\n`;
    if (stay) {
      reply += `- **Phòng:** ${stay.roomNumber} — ${stay.propertyName}\n`;
      reply += `- **Tiền phòng:** ${formatVND(stay.monthlyRent)}/tháng • Tiền cọc: ${formatVND(stay.deposit)}\n`;
      reply += `- **Trạng thái hợp đồng:** ${stay.contractStatus === "active" ? "Đang có hiệu lực ✅" : stay.contractStatus}\n`;
      if (stay.startDate) {
        reply += `- **Thời hạn:** Từ ${new Date(stay.startDate).toLocaleDateString("vi-VN")} đến ${stay.endDate ? new Date(stay.endDate).toLocaleDateString("vi-VN") : "Chưa xác định"}\n\n`;
      }
    }
    reply += `📋 **Thủ tục Khai báo Tạm trú (Mẫu CT01):**\n` +
      `- Cư dân cần cập nhật **Số CCCD**, ảnh chụp **2 mặt CCCD** và **Nơi thường trú** trong mục *Hồ sơ tạm trú & Xe*.\n` +
      `- Sau khi điền, bạn có thể bấm **"Mẫu CT01"** để xem và in tờ khai đã điền sẵn theo quy định của Bộ Công an.\n` +
      `- Ban Quản lý sẽ nộp hồ sơ đăng ký tạm trú lên Cơ quan Công an hoặc bạn có thể nộp trực tiếp qua ứng dụng **VNeID**.\n\n` +
      `*Lưu ý: Khi có kế hoạch trả phòng hoặc không gia hạn hợp đồng, vui lòng thông báo cho chủ nhà trước ít nhất 30 ngày.*`;
    return {
      reply,
      toolsUsed: ["lookup_tenant_contract_profile"],
      suggestions: [
        "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
        "Chỉ số điện nước phòng tôi tháng này",
        "Nội quy an ninh và giờ giấc nhà trọ",
      ],
    };
  }

  // General / Default response for tenant
  const greeting = tenant?.fullName ? `Xin chào **${tenant.fullName}**!` : "Xin chào bạn!";
  return {
    reply: `👋 ${greeting} Tôi là **Trợ lý AI Cư dân** của cơ sở **${stay?.propertyName || "nhà trọ"}** (Phòng **${stay?.roomNumber || ""}**).\n\n` +
      `Tôi có thể hỗ trợ bạn các vấn đề thực tế hàng ngày:\n` +
      `- 🧾 Tra cứu **Hóa đơn tiền phòng**, số dư cần đóng và mã VietQR.\n` +
      `- ⚡ Kiểm tra **Chỉ số điện nước** và lượng tiêu thụ mới nhất.\n` +
      `- 📋 Hướng dẫn **Nội quy ra vào**, giờ giấc an ninh và PCCC.\n` +
      `- 🔧 Hướng dẫn **Báo sự cố hỏng hóc** thiết bị phòng.\n` +
      `- 📑 Tra cứu thông tin hợp đồng và hướng dẫn **Khai báo tạm trú CT01**.\n\n` +
      `Bạn có thể bấm vào một trong các câu hỏi gợi ý bên dưới hoặc gõ câu hỏi cụ thể của mình nhé!`,
    toolsUsed: ["tenant_portal_overview"],
    suggestions: [
      "Hóa đơn tháng này của phòng tôi là bao nhiêu?",
      "Chỉ số điện nước phòng tôi tháng này",
      "Nội quy an ninh và giờ giấc nhà trọ",
    ],
  };
}

// ---------------------------------------------------------------------------
// Main Service Entry Point (Hybrid: Gemini API + Local Fallback)
// ---------------------------------------------------------------------------

export async function processAiQuery(input: ProcessAiQueryInput): Promise<ProcessAiQueryResult> {
  const { userId, role, message } = input;
  const ctx: AuthContext = { userId, role };
  const apiKey = getGeminiApiKey();

  // Route 1: Tenant resident assistant
  if (role === "tenant") {
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const client = new GoogleGenAI({ apiKey });
        const localResult = await processTenantAiQuery(userId, message);

        // If privacy guard was triggered, return immediately without calling model
        if (localResult.toolsUsed.includes("tenant_privacy_guard")) {
          return localResult;
        }

        const prompt = `Bạn là Trợ lý AI Cư dân chuyên nghiệp, thân thiện hỗ trợ khách thuê nhà trọ tại Việt Nam.
Người dùng là Khách thuê (Role: tenant).
Câu hỏi của khách thuê: "${message}"

Dữ liệu thực tế của phòng khách thuê trích xuất từ database:
${localResult.reply}

Công cụ đã dùng: ${localResult.toolsUsed.join(", ")}

Nhiệm vụ của bạn:
- Dựa trên dữ liệu thực tế trên, trả lời thân thiện, lịch sự, chuẩn xác, định dạng Markdown đẹp mắt.
- TUYỆT ĐỐI KHÔNG tiết lộ doanh thu của chủ nhà, lợi nhuận, danh sách phòng khác hoặc nợ của khách thuê khác.
- Đưa ra hướng dẫn hoặc hành động tiếp theo hữu ích cho khách thuê.`;

        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        const text = response.text?.trim();
        if (text) {
          return {
            reply: text,
            toolsUsed: localResult.toolsUsed,
            suggestions: localResult.suggestions,
          };
        }
      } catch {
        // fallback to local tenant engine
      }
    }
    return processTenantAiQuery(userId, message);
  }

  // Route 2: Owner / Manager assistant
  // If Gemini API Key is available, use Gemini generative model with tools
  if (apiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });

      // First run local data fetch to give Gemini grounding context
      const localResult = await processWithLocalEngine(ctx, message);

      const prompt = `Bạn là Trợ lý AI chuyên nghiệp cho phần mềm Quản lý Nhà trọ thông minh tại Việt Nam.
Người dùng là Chủ nhà/Quản lý nhà trọ (Role: ${role}).
Câu hỏi của người dùng: "${message}"

Dữ liệu thực tế vừa được hệ thống trích xuất từ database PostgreSQL:
${localResult.reply}

Công cụ đã dùng: ${localResult.toolsUsed.join(", ") || "None"}

Nhiệm vụ của bạn:
- Dựa trên dữ liệu thực tế trên, hãy trả lời người dùng một cách mạch lạc, lịch sự, chuẩn xác, định dạng Markdown đẹp mắt (bôi đậm số liệu, tiền tệ VNĐ rõ ràng).
- Tuyệt đối không bịa đặt số liệu phòng, tiền nong ngoài dữ liệu được cung cấp.
- Đưa ra lời khuyên hoặc hành động tiếp theo hữu ích cho chủ nhà.`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text?.trim();
      if (text) {
        return {
          reply: text,
          toolsUsed: localResult.toolsUsed,
          suggestions: localResult.suggestions,
        };
      }
    } catch {
      // If Gemini API throws (network, rate limit, quota), seamlessly fallback to local engine
    }
  }

  // Fallback to local intelligent natural language engine
  return processWithLocalEngine(ctx, message);
}
