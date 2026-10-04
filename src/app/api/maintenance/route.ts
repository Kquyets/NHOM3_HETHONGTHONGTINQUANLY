import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "../../../modules/maintenance/maintenance.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/maintenance — list maintenance requests
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const searchParams = request.nextUrl.searchParams;

    const propertyId = searchParams.get("propertyId") || undefined;
    const status = (searchParams.get("status") as MaintenanceStatus) || undefined;

    const requests = await listMaintenanceRequests({
      userId: ctx.userId,
      role: ctx.role,
      propertyId,
      status,
    });

    return successResponse({ requests });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/maintenance — create a new maintenance request
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json();

    const created = await createMaintenanceRequest(ctx.userId, ctx.role, {
      roomId: body.roomId,
      title: body.title,
      category: body.category as MaintenanceCategory,
      priority: body.priority as MaintenancePriority,
      description: body.description,
    });

    return successResponse({ request: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
