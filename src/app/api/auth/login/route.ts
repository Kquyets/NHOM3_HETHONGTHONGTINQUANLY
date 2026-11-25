import { type NextRequest } from "next/server";
import { AppError } from "../../../../errors/app-error";
import { login } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/login
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new AppError("VALIDATION_ERROR", "Request body must be JSON."));
    }

    const { email, password } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return errorResponse(new AppError("VALIDATION_ERROR", "Email is required."));
    }
    if (typeof password !== "string" || !password) {
      return errorResponse(new AppError("VALIDATION_ERROR", "Password is required."));
    }

    const { user, tokens } = await login({ email, password });

    return successResponse({ user, tokens });
  } catch (error) {
    return errorResponse(error);
  }
}
