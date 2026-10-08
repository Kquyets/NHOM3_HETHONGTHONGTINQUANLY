import { type NextRequest } from "next/server";
import { getMe } from "../../../../modules/auth/auth.service";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// GET /api/auth/me  — requires Bearer token
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const user = await getMe(ctx.userId);
    return successResponse({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
