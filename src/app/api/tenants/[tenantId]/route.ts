import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { updateTenant } from "../../../../modules/rentals/service";
import { tenantPatchSchema } from "../../../../modules/rentals/validation";
import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";
import { requiredQuery } from "../../../../utils/request-query";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }): Promise<Response> {
  try {
    const { tenantId } = await params;
    return successResponse(await updateTenant(await requireAuthenticatedUser(request), tenantId, requiredQuery(request, "propertyId"), await parseJson(request, tenantPatchSchema)));
  } catch (error) { return errorResponse(error); }
}
