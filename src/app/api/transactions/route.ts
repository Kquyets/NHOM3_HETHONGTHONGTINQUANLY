import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { listTransactions } from "../../../modules/transactions/transaction.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/transactions — List transactions and cashflow stats
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);

    const propertyId = searchParams.get("propertyId") || undefined;
    const type = (searchParams.get("type") as "all" | "income" | "expense") || undefined;
    const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
    const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;

    const result = await listTransactions(ctx.userId, ctx.role, {
      propertyId,
      type,
      month,
      year,
    });

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
