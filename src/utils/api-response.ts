import { AppError, type AppErrorCode } from "../errors/app-error";
import type { ApiError, ApiSuccess } from "../types/api";

const statusByCode: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  BUSINESS_RULE_ERROR: 400,
  DATABASE_ERROR: 500,
  INTERNAL_SERVER_ERROR: 500,
};

export function successResponse<T>(
  data: T,
  options: { status?: 200 | 201; meta?: Record<string, unknown> } = {},
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(options.meta === undefined ? {} : { meta: options.meta }),
  };
  return Response.json(body, { status: options.status ?? 200 });
}

export function errorResponse(
  error: unknown,
  production = process.env.NODE_ENV === "production",
): Response {
  let status = 500;
  let body: ApiError;

  if (error instanceof AppError) {
    status = statusByCode[error.code];
    const redact = production && (status === 500);
    body = {
      success: false,
      error: {
        code: error.code,
        message: redact
          ? error.code === "DATABASE_ERROR" ? "A database error occurred" : "An unexpected error occurred"
          : error.message,
        details: redact ? [] : error.details,
      },
    };
  } else {
    body = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: production ? "An unexpected error occurred" : error instanceof Error ? error.message : "An unexpected error occurred",
        details: [],
      },
    };
  }

  return Response.json(body, { status });
}
