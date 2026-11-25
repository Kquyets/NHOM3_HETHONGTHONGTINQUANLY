import { type NextRequest } from "next/server";
import { AppError } from "../../../../../errors/app-error";
import { requireAuthContext } from "../../../../../lib/auth/with-auth";
import {
  addTenantToContract,
  removeTenantFromContract,
} from "../../../../../modules/contracts/contract.service";
import { errorResponse, successResponse } from "../../../../../utils/api-response";

type Params = { params: Promise<{ contractId: string }> };

// POST /api/contracts/[contractId]/tenants — Add tenant to contract
export async function POST(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { contractId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body.tenantId !== "string" || !body.tenantId.trim()) {
      return errorResponse(new AppError("VALIDATION_ERROR", "tenantId is required."));
    }

    const contract = await addTenantToContract(
      ctx.userId,
      ctx.role,
      contractId,
      body.tenantId,
    );

    return successResponse({ contract }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/contracts/[contractId]/tenants — Remove tenant from contract
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = await requireAuthContext(request);
    const { contractId } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return errorResponse(new AppError("VALIDATION_ERROR", "tenantId query parameter is required."));
    }

    const contract = await removeTenantFromContract(
      ctx.userId,
      ctx.role,
      contractId,
      tenantId,
    );

    return successResponse({ contract });
  } catch (error) {
    return errorResponse(error);
  }
}
