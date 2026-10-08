import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  createMeterReading,
  listMeterReadings,
  type UtilityType,
} from "../../../modules/meters/meter.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/meters
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") ?? undefined;
    const data = await listMeterReadings(ctx.userId, ctx.role, propertyId);
    return successResponse({ readings: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/meters
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
      roomId,
      propertyId,
      utilityType,
      billingPeriod,
      previousValue,
      currentValue,
      utilityRateId,
      unitPriceSnapshot,
    } = body as Record<string, unknown>;

    if (
      typeof roomId !== "string" ||
      typeof propertyId !== "string" ||
      (utilityType !== "electricity" && utilityType !== "water") ||
      typeof billingPeriod !== "string"
    ) {
      return errorResponse(
        Object.assign(new Error("Missing or invalid required fields."), {
          code: "VALIDATION_ERROR",
        }),
      );
    }

    const reading = await createMeterReading(ctx.userId, ctx.role, {
      roomId,
      propertyId,
      utilityType: utilityType as UtilityType,
      billingPeriod,
      previousValue: Number(previousValue),
      currentValue: Number(currentValue),
      utilityRateId: typeof utilityRateId === "string" ? utilityRateId : "default",
      unitPriceSnapshot: Number(unitPriceSnapshot || 0),
    });

    return successResponse({ reading }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
