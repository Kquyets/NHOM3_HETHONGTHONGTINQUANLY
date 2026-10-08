import { type NextRequest } from "next/server";
import { logout } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/logout
// Body: { refreshToken: string }
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

    // Best-effort revocation — always return 200 to prevent enumeration
    await logout(refreshToken);

    return successResponse({ message: "Logged out successfully." });
  } catch (error) {
    return errorResponse(error);
  }
}
