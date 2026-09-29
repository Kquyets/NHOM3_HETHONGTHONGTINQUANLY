import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { getInvoice } from "../../../../modules/rentals/service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

export async function GET(request: Request, { params }: { params: Promise<{ invoiceId: string }> }): Promise<Response> {
  try { return successResponse(await getInvoice(await requireAuthenticatedUser(request), (await params).invoiceId)); }
  catch (error) { return errorResponse(error); }
}
