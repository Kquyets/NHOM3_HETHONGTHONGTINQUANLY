import { z } from "zod";

import { AppError } from "../errors/app-error";

export async function parseJson<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Request validation failed.",
      result.error.issues.map(({ path, message }) => ({ path, message })),
    );
  }
  return result.data;
}
