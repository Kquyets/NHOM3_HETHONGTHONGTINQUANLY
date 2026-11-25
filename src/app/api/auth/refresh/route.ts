import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { refreshTokens_ } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/refresh
// Body: { refreshToken: string }
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body?.refreshToken !== "string" || !body.refreshToken) {
      return errorResponse(new AppError("VALIDATION_ERROR", "refreshToken is required."));
    }

    const tokens = await refreshTokens_(body.refreshToken);

    return successResponse({ tokens });
  } catch (error) {
    return errorResponse(error);
  }
}
