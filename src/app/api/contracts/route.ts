import { requireAuthenticatedUser } from "../../../lib/auth/session";
import { createContract, listContracts } from "../../../modules/rentals/service";
import { contractInputSchema } from "../../../modules/rentals/validation";
import { errorResponse, successResponse } from "../../../utils/api-response";
import { parseJson } from "../../../utils/parse-json";
import { requiredQuery } from "../../../utils/request-query";

export async function GET(request: Request): Promise<Response> {
  try { return successResponse(await listContracts(await requireAuthenticatedUser(request), requiredQuery(request, "propertyId"))); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try { return successResponse(await createContract(await requireAuthenticatedUser(request), await parseJson(request, contractInputSchema)), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
