import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { errorResponse, successResponse } from "../../../../utils/api-response";

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId: id, email, role } = await requireAuthenticatedUser(request);
    return successResponse({ id, email, role });
  } catch (error) {
    return errorResponse(error);
  }
}
