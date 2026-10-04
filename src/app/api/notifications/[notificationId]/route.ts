import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import { markNotificationAsRead } from "../../../../modules/notifications/notification.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// PATCH /api/notifications/[notificationId] — mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { notificationId } = await params;
    await markNotificationAsRead(ctx.userId, notificationId);
    return successResponse({ message: "Đã đánh dấu là đã đọc." });
  } catch (error) {
    return errorResponse(error);
  }
}
