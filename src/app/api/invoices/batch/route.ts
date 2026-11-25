import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { requireAuthContext } from "../../../../lib/auth/with-auth";
import {
  batchGenerateInvoices,
  type BatchGenerateInvoicesInput,
} from "../../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/invoices/batch
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const {
      propertyId,
      billingPeriodStart,
      dueDate,
      waterPerPerson,
      wifiPerRoom,
      parkingPerVehicle,
    } = body as Record<string, unknown>;

    if (typeof propertyId !== "string" || !propertyId.trim() || typeof billingPeriodStart !== "string") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Missing propertyId or billingPeriodStart."));
    }

    const input: BatchGenerateInvoicesInput = {
      propertyId,
      billingPeriodStart,
      dueDate: typeof dueDate === "string" ? dueDate : null,
      waterPerPerson: typeof waterPerPerson === "number" ? waterPerPerson : undefined,
      wifiPerRoom: typeof wifiPerRoom === "number" ? wifiPerRoom : undefined,
      parkingPerVehicle: typeof parkingPerVehicle === "number" ? parkingPerVehicle : undefined,
    };

    const result = await batchGenerateInvoices(ctx.userId, ctx.role, input);
    return successResponse(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
