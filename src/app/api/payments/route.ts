import { requireAuthenticatedUser } from "../../../lib/auth/session";
import { listPayments, recordPayment } from "../../../modules/rentals/service";
import { paymentInputSchema } from "../../../modules/rentals/validation";
import { errorResponse, successResponse } from "../../../utils/api-response";
import { parseJson } from "../../../utils/parse-json";
import { requiredQuery } from "../../../utils/request-query";

export async function GET(request: Request): Promise<Response> {
  try { return successResponse(await listPayments(await requireAuthenticatedUser(request), requiredQuery(request, "invoiceId"))); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try { return successResponse(await recordPayment(await requireAuthenticatedUser(request), await parseJson(request, paymentInputSchema)), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
