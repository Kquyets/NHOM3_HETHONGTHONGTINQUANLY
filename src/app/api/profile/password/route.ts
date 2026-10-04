import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import { changePassword } from "../../../../modules/profile/profile.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/profile/password — change user password
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    await changePassword(ctx.userId, {
      currentPassword: String(body.currentPassword || ""),
      newPassword: String(body.newPassword || ""),
    });
    return successResponse({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    return errorResponse(error);
  }
}
