import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { deleteRoom, getRoom, updateRoom } from "../../../../modules/properties/service";
import { roomPatchSchema } from "../../../../modules/properties/validation";
import { errorResponse, successResponse } from "../../../../utils/api-response";
import { parseJson } from "../../../../utils/parse-json";

type RouteContext = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    return successResponse(await getRoom(await requireAuthenticatedUser(request), (await params).roomId));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    return successResponse(await updateRoom(user, (await params).roomId, await parseJson(request, roomPatchSchema)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    await deleteRoom(await requireAuthenticatedUser(request), (await params).roomId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
