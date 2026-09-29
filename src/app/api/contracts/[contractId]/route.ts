import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { updateContract } from "../../../../modules/rentals/service";
import { contractPatchSchema } from "../../../../modules/rentals/validation";
import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";

export async function PATCH(request: Request, { params }: { params: Promise<{ contractId: string }> }): Promise<Response> {
  try {
    const { contractId } = await params;
    return successResponse(await updateContract(await requireAuthenticatedUser(request), contractId, await parseJson(request, contractPatchSchema)));
  } catch (error) { return errorResponse(error); }
}
