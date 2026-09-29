import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { deleteProperty, getProperty, updateProperty } from "../../../../modules/properties/service";
import { propertyPatchSchema } from "../../../../modules/properties/validation";
import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { propertyId } = await params;
    return successResponse(await getProperty(await requireAuthenticatedUser(request), propertyId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { propertyId } = await params;
    const user = await requireAuthenticatedUser(request);
    return successResponse(await updateProperty(user, propertyId, await parseJson(request, propertyPatchSchema)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { propertyId } = await params;
    await deleteProperty(await requireAuthenticatedUser(request), propertyId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
