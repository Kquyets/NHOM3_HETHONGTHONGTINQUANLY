import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { createTenant, listTenants } from "../../../modules/tenants/tenant.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/tenants — list all tenants (owner, manager only)
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const data = await listTenants(ctx.userId, ctx.role);
    return successResponse({ tenants: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/tenants — create tenant profile (owner, manager only)
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(
        Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }),
      );
    }

    const { fullName, phone, birthDate, userId } = body as Record<string, unknown>;

    if (typeof fullName !== "string" || !fullName.trim()) {
      return errorResponse(
        Object.assign(new Error("fullName is required."), { code: "VALIDATION_ERROR" }),
      );
    }

    const tenant = await createTenant(ctx.userId, ctx.role, {
      fullName,
      phone: typeof phone === "string" ? phone : null,
      birthDate: typeof birthDate === "string" ? birthDate : null,
      userId: typeof userId === "string" ? userId : null,
    });

    return successResponse({ tenant }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
