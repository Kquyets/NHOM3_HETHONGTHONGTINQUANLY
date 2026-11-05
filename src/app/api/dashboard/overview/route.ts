import { requireAuthenticatedUser } from "../../../../lib/auth/session";
import { listProperties, listRooms } from "../../../../modules/properties/service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuthenticatedUser(request);
    const properties = await listProperties(user);
    const summaries = await Promise.all(properties.map(async (property) => {
      const rooms = await listRooms(user, property.id);
      return { property, rooms, roomCount: rooms.length, occupiedCount: rooms.filter((room) => room.status === "occupied").length };
    }));
    return successResponse({
      propertyCount: properties.length,
      roomCount: summaries.reduce((sum, summary) => sum + summary.roomCount, 0),
      occupiedCount: summaries.reduce((sum, summary) => sum + summary.occupiedCount, 0),
      properties: summaries,
    });
  } catch (error) { return errorResponse(error); }
}
