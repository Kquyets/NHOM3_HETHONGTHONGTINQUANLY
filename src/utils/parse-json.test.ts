import { describe, expect, it } from "vitest";

import { AppError } from "../errors/app-error";
import { loginSchema } from "../lib/auth/validation";
import { parseJson } from "./parse-json";

describe("JSON request parsing", () => {
  it("returns validated, normalized request data", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: " USER@example.com ", password: "demo-password" }),
    });
    await expect(parseJson(request, loginSchema)).resolves.toEqual({
      email: "user@example.com",
      password: "demo-password",
    });
  });

  it("converts malformed or invalid JSON into a safe validation error", async () => {
    const request = new Request("http://localhost/api/auth/login", { method: "POST", body: "{" });
    await expect(parseJson(request, loginSchema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request body must be valid JSON.",
    } satisfies Partial<AppError>);
  });
});
