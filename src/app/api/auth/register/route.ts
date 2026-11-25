import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { register } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/register
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { email, password, role, fullName, phone } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return errorResponse(new AppError("VALIDATION_ERROR", "Email is required."));
    }
    if (typeof password !== "string" || !password) {
      return errorResponse(new AppError("VALIDATION_ERROR", "Password is required."));
    }
    if (role !== "owner" && role !== "manager" && role !== "tenant") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Role must be 'owner', 'manager', or 'tenant'."));
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
