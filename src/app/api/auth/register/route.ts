import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";
import { registerSchema } from "../../../../lib/auth/validation";
import { registerTenant } from "../../../../modules/auth/service";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await parseJson(request, registerSchema);
    return successResponse(await registerTenant(input), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
