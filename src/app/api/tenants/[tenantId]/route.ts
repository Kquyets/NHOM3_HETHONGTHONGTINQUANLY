import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../../lib/auth/with-auth";
import {
  deleteTenant,
  getTenant,
  updateTenant,
} from "../../../../modules/tenants/tenant.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

type Params = { params: Promise<{ tenantId: string }> };

// GET /api/tenants/[tenantId]
export async function GET(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { tenantId } = await params;
    const tenant = await getTenant(ctx.userId, ctx.role, tenantId);
    return successResponse({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/tenants/[tenantId]
export async function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { tenantId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { fullName, phone, birthDate } = body as Record<string, unknown>;

    const tenant = await updateTenant(ctx.userId, ctx.role, tenantId, {
      fullName: typeof fullName === "string" ? fullName : undefined,
      phone: phone === null ? null : typeof phone === "string" ? phone : undefined,
      birthDate: birthDate === null ? null : typeof birthDate === "string" ? birthDate : undefined,
    });

    return successResponse({ tenant });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/tenants/[tenantId]
export async function DELETE(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const { tenantId } = await params;
    await deleteTenant(ctx.userId, ctx.role, tenantId);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
