import { type NextRequest } from "next/server";
import { register } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/register
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new Error("Request body must be JSON."));
    }

    const { email, password, role, fullName, phone } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return errorResponse(Object.assign(new Error("Email is required."), { code: "VALIDATION_ERROR" }));
    }
    if (typeof password !== "string" || !password) {
      return errorResponse(Object.assign(new Error("Password is required."), { code: "VALIDATION_ERROR" }));
    }
    if (role !== "owner" && role !== "manager" && role !== "tenant") {
      return errorResponse(Object.assign(new Error("Role must be 'owner', 'manager', or 'tenant'."), { code: "VALIDATION_ERROR" }));
    }

    const { user, tokens } = await register({
      email,
      password,
      role,
      fullName: typeof fullName === "string" ? fullName : undefined,
      phone: typeof phone === "string" ? phone : undefined,
    });

    return successResponse({ user, tokens }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
