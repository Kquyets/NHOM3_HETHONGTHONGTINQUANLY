import { getGeminiApiKey } from "../../config/env";
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
// Main Service Entry Point (Hybrid: Gemini API + Local Fallback)
// ---------------------------------------------------------------------------

export async function processAiQuery(input: ProcessAiQueryInput): Promise<ProcessAiQueryResult> {
  const { userId, role, message } = input;
  const ctx: AuthContext = { userId, role };
  const apiKey = getGeminiApiKey();

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
