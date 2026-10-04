import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { getProfile, updateProfile } from "../../../modules/profile/profile.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/profile — view current user profile
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const profile = await getProfile(ctx.userId);
    return successResponse({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/profile — update profile (fullName, phone)
export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => ({}));
    const profile = await updateProfile(ctx.userId, {
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      phone: typeof body.phone === "string" ? body.phone : undefined,
    });
    return successResponse({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
