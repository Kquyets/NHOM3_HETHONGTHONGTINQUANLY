import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import {
  createUtilityRate,
  listUtilityRates,
  type UtilityType,
} from "../../../modules/meters/meter.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/utility-rates
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") ?? undefined;
    const data = await listUtilityRates(ctx.userId, ctx.role, propertyId);
    return successResponse({ utilityRates: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/utility-rates
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { propertyId, utilityType, unitPrice, effectiveFrom, effectiveTo } =
      body as Record<string, unknown>;

    if (
      typeof propertyId !== "string" ||
      (utilityType !== "electricity" && utilityType !== "water") ||
      typeof effectiveFrom !== "string"
    ) {
      return errorResponse(
        Object.assign(new Error("Missing or invalid required fields."), {
          code: "VALIDATION_ERROR",
        }),
      );
    }

    const rate = await createUtilityRate(ctx.userId, ctx.role, {
      propertyId,
      utilityType: utilityType as UtilityType,
      unitPrice: Number(unitPrice),
      effectiveFrom,
      effectiveTo: typeof effectiveTo === "string" ? effectiveTo : null,
    });

    return successResponse({ utilityRate: rate }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
