import { requireAuthenticatedUser } from "../../../lib/auth/session";
import { createMeterReading, listMeterReadings } from "../../../modules/rentals/service";
import { meterInputSchema } from "../../../modules/rentals/validation";
import { errorResponse, successResponse } from "../../../utils/api-response";
import { parseJson } from "../../../utils/parse-json";
import { requiredQuery } from "../../../utils/request-query";

export async function GET(request: Request): Promise<Response> {
  try { return successResponse(await listMeterReadings(await requireAuthenticatedUser(request), requiredQuery(request, "propertyId"))); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try { return successResponse(await createMeterReading(await requireAuthenticatedUser(request), await parseJson(request, meterInputSchema)), { status: 201 }); }
  catch (error) { return errorResponse(error); }
}
