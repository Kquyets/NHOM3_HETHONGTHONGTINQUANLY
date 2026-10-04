import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { createContract, listContracts } from "../../../modules/contracts/contract.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/contracts
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const data = await listContracts(ctx.userId, ctx.role);
    return successResponse({ contracts: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/contracts
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { roomId, startDate, endDate, monthlyRentSnapshot, depositSnapshot } =
      body as Record<string, unknown>;

    if (typeof roomId !== "string") {
      return errorResponse(
        Object.assign(new Error("roomId is required."), { code: "VALIDATION_ERROR" }),
      );
    }

    const contract = await createContract(ctx.userId, ctx.role, {
      roomId,
      startDate: typeof startDate === "string" ? startDate : "",
      endDate: typeof endDate === "string" ? endDate : null,
      monthlyRentSnapshot: Number(monthlyRentSnapshot),
      depositSnapshot: Number(depositSnapshot),
      tenantIds: Array.isArray(body.tenantIds) ? body.tenantIds.map(String) : undefined,
    });

    return successResponse({ contract }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
