import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  listNotifications,
  markAllNotificationsAsRead,
} from "../../../modules/notifications/notification.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/notifications — list user notifications
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const result = await listNotifications(ctx.userId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/notifications — mark all notifications as read
export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    await markAllNotificationsAsRead(ctx.userId);
    return successResponse({ message: "Đã đánh dấu tất cả là đã đọc." });
  } catch (error) {
    return errorResponse(error);
  }
}
