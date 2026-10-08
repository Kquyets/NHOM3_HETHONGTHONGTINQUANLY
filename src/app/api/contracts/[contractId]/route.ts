import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteContract,
  getContract,
  updateContractStatus,
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
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { status } = body as Record<string, unknown>;
    const VALID_STATUSES: ContractStatus[] = ["draft", "active", "ended", "cancelled"];

    if (typeof status !== "string" || !VALID_STATUSES.includes(status as ContractStatus)) {
      return errorResponse(
        Object.assign(
          new Error(`status must be one of: ${VALID_STATUSES.join(", ")}.`),
          { code: "VALIDATION_ERROR" },
        ),
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
