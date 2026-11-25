import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { requireAuthContext } from "../../../../lib/auth/with-auth";
import {
  cancelTenantMaintenanceRequest,
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
    const ctx = await requireAuthContext(request);
    const { requestId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    if (ctx.role === "tenant") {
      if (body.status === "cancelled") {
        const result = await cancelTenantMaintenanceRequest(ctx.userId, requestId);
        return successResponse(result);
      }
      return errorResponse(new AppError("FORBIDDEN", "Khách thuê chỉ có thể hủy yêu cầu của mình."));
    }

    const updated = await updateMaintenanceStatus(ctx.userId, ctx.role, requestId, {
      status: body.status as MaintenanceStatus,
      resolutionNotes: body.resolutionNotes,
      cost: typeof body.cost === "number" ? body.cost : undefined,
      payer: body.payer,
      contractorName: body.contractorName,
      contractorPhone: body.contractorPhone,
      photoUrl: body.photoUrl,
    });

    return successResponse({ request: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/maintenance/[requestId] — tenant cancels request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { requestId } = await params;

    const result = await cancelTenantMaintenanceRequest(ctx.userId, requestId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
