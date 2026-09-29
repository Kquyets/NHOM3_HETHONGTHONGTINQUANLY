import { requireAuthenticatedUser } from "../../../../../lib/auth/session";
import { createRoom, listRooms } from "../../../../../modules/properties/service";
import { roomInputSchema } from "../../../../../modules/properties/validation";
import { errorResponse, successResponse } from "../../../../../utils/api-response";
import { parseJson } from "../../../../../utils/parse-json";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    return successResponse(await listRooms(await requireAuthenticatedUser(request), (await params).propertyId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    return successResponse(await createRoom(user, (await params).propertyId, await parseJson(request, roomInputSchema)), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
