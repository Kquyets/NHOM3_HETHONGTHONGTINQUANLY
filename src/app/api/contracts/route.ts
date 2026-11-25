import { type NextRequest } from "next/server";
import { AppError } from "../../../errors/app-error";
import { requireAuthContext } from "../../../lib/auth/with-auth";
import { createContract, listContracts } from "../../../modules/contracts/contract.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/contracts
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const data = await listContracts(ctx.userId, ctx.role);
    return successResponse({ contracts: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/contracts
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { roomId, startDate, endDate, monthlyRentSnapshot, depositSnapshot, paymentCycleMonths, handoverInventory } =
      body as Record<string, unknown>;

    if (typeof roomId !== "string" || !roomId.trim()) {
      return errorResponse(new AppError("VALIDATION_ERROR", "roomId is required."));
    }

    const contract = await createContract(ctx.userId, ctx.role, {
      roomId,
      startDate: typeof startDate === "string" ? startDate : "",
      endDate: typeof endDate === "string" ? endDate : null,
      monthlyRentSnapshot: Number(monthlyRentSnapshot),
      depositSnapshot: Number(depositSnapshot),
      paymentCycleMonths: paymentCycleMonths ? Number(paymentCycleMonths) : 1,
      handoverInventory: typeof handoverInventory === "string" ? handoverInventory : null,
      tenantIds: Array.isArray(body.tenantIds) ? body.tenantIds.map(String) : undefined,
    });

    return successResponse({ contract }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
