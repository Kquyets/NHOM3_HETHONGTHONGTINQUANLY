import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { getDashboardSummary } from "../../../modules/dashboard/dashboard.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/dashboard — retrieve aggregated dashboard summary
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const searchParams = request.nextUrl.searchParams;

    const propertyId = searchParams.get("propertyId") || undefined;
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const data = await getDashboardSummary({
      userId: ctx.userId,
      role: ctx.role,
      propertyId,
      month: month && !isNaN(month) ? month : undefined,
      year: year && !isNaN(year) ? year : undefined,
    });

    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
