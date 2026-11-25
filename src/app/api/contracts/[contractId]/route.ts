import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteContract,
  getContract,
  updateContractStatus,
  liquidateContract,
  type ContractStatus,
} from "../../../../modules/contracts/contract.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type Params = { params: Promise<{ contractId: string }> };

// GET /api/contracts/[contractId]
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { contractId } = await params;
    const contract = await getContract(ctx.userId, ctx.role, contractId);
    return successResponse({ contract });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/contracts/[contractId] — update status
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { contractId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    if (body.action === "liquidate") {
      const contract = await liquidateContract(ctx.userId, ctx.role, contractId, {
        damageDeduction: Number(body.damageDeduction || 0),
        utilityDeduction: Number(body.utilityDeduction || 0),
        liquidationNotes: typeof body.liquidationNotes === "string" ? body.liquidationNotes : null,
      });
      return successResponse({ contract });
    }

    const { status } = body as Record<string, unknown>;
    const VALID_STATUSES: ContractStatus[] = ["draft", "active", "ended", "cancelled"];

    if (typeof status !== "string" || !VALID_STATUSES.includes(status as ContractStatus)) {
      return errorResponse(
        new AppError("VALIDATION_ERROR", `status must be one of: ${VALID_STATUSES.join(", ")}.`),
      );
    }

    const contract = await updateContractStatus(ctx.userId, ctx.role, contractId, status as ContractStatus);
    return successResponse({ contract });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/contracts/[contractId]
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { contractId } = await params;
    await deleteContract(ctx.userId, ctx.role, contractId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
