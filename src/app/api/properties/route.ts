import { type NextRequest } from "next/server";
import { getAuthContext } from "../../../lib/auth/with-auth";
import { createProperty, listProperties } from "../../../modules/properties/property.service";
import { errorResponse, successResponse } from "../../../utils/api-response";

// GET /api/properties — list accessible properties
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const data = await listProperties(ctx.userId, ctx.role);
    return successResponse({ properties: data, total: data.length });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/properties — create property (owner only)
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const ctx = getAuthContext(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(Object.assign(new Error("Request body must be JSON."), { code: "VALIDATION_ERROR" }));
    }

    const { name, address, bankCode, bankAccount, accountHolder } = body as Record<string, unknown>;

    if (typeof name !== "string") {
      return errorResponse(Object.assign(new Error("name is required."), { code: "VALIDATION_ERROR" }));
    }

    const property = await createProperty(ctx.userId, ctx.role, {
      name,
      address: typeof address === "string" ? address : null,
      bankCode: typeof bankCode === "string" ? bankCode : null,
      bankAccount: typeof bankAccount === "string" ? bankAccount : null,
      accountHolder: typeof accountHolder === "string" ? accountHolder : null,
    });

    return successResponse({ property }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
