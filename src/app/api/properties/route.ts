import { requireAuthenticatedUser } from "../../../lib/auth/session";
import { createProperty, listProperties } from "../../../modules/properties/service";
import { propertyInputSchema } from "../../../modules/properties/validation";
import { errorResponse, successResponse } from "../../../utils/api-response";
import { parseJson } from "../../../utils/parse-json";

export async function GET(request: Request): Promise<Response> {
  try {
    return successResponse(await listProperties(await requireAuthenticatedUser(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    return successResponse(await createProperty(user, await parseJson(request, propertyInputSchema)), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
