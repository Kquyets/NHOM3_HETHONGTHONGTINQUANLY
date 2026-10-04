import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  updateMaintenanceStatus,
  type MaintenanceStatus,
} from "../../../../modules/maintenance/maintenance.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// PATCH /api/maintenance/[requestId] — update status & resolution notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { requestId } = await params;
    const body = await request.json();

    const updated = await updateMaintenanceStatus(ctx.userId, ctx.role, requestId, {
      status: body.status as MaintenanceStatus,
      resolutionNotes: body.resolutionNotes,
    });

    return successResponse({ request: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
