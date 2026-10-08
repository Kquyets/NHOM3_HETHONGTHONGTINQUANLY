import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { getTenantPortalData } from "../../../modules/tenant-portal/tenant-portal.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/tenant-portal — retrieve tenant portal data (stay, invoices, meters)
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const data = await getTenantPortalData(ctx.userId);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
