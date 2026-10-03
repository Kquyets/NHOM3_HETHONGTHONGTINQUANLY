import { type NextRequest } from "next/server";
import { login } from "../../../../modules/auth/auth.service";
import { errorResponse, successResponse } from "../../../../utils/api-response";

// POST /api/auth/login
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return errorResponse(new Error("Request body must be JSON."));
    }

    const { email, password } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.trim()) {
      return errorResponse(Object.assign(new Error("Email is required."), { code: "VALIDATION_ERROR" }));
    }
    if (typeof password !== "string" || !password) {
      return errorResponse(Object.assign(new Error("Password is required."), { code: "VALIDATION_ERROR" }));
    }

    const { user, tokens } = await login({ email, password });

    return successResponse({ user, tokens });
  } catch (error) {
    return errorResponse(error);
  }
}
