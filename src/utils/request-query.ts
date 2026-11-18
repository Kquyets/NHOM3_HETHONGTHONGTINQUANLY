import { z } from "zod";

import { AppError } from "../errors/app-error";

export function requiredQuery(request: Request, name: string): string {
  const value = new URL(request.url).searchParams.get(name);
  if (!value || !z.uuid().safeParse(value).success) {
    throw new AppError("VALIDATION_ERROR", `${name} must be a UUID query parameter.`);
  }
  return value;
}
