import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  batchGenerateInvoices,
  type BatchGenerateInvoicesInput,
} from "../../../../modules/invoices/invoice.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/invoices/batch
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const {
      propertyId,
      billingPeriodStart,
      dueDate,
      waterPerPerson,
      wifiPerRoom,
      parkingPerVehicle,
    } = body as Record<string, unknown>;

    if (typeof propertyId !== "string" || typeof billingPeriodStart !== "string") {
      return errorResponse(
        Object.assign(new Error("Missing propertyId or billingPeriodStart."), {
          code: "VALIDATION_ERROR",
        }),
      );
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
