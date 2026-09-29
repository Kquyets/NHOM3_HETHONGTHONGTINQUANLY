import { describe, expect, it } from "vitest";
import { AppError } from "../errors/app-error";
import { errorResponse, successResponse } from "./api-response";

describe("API responses", () => {
  it("returns success data, status, and metadata", async () => {
    const response = successResponse({ id: 1 }, { status: 201, meta: { total: 1 } });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ success: true, data: { id: 1 }, meta: { total: 1 } });
  });

  it("defaults successful responses to 200", () => {
    expect(successResponse("ok").status).toBe(200);
  });

  it.each([
    ["VALIDATION_ERROR", 400], ["UNAUTHORIZED", 401], ["FORBIDDEN", 403],
    ["NOT_FOUND", 404], ["CONFLICT", 409], ["BUSINESS_RULE_ERROR", 400],
    ["DATABASE_ERROR", 500], ["INTERNAL_SERVER_ERROR", 500],
  ] as const)("maps %s to HTTP %i", async (code, status) => {
    const response = errorResponse(new AppError(code, "Request failed", ["field"]), false);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ success: false, error: { code, message: "Request failed", details: ["field"] } });
  });

  it("hides unknown errors and stacks in production", async () => {
    const error = new Error("secret password");
    error.stack = "secret stack";
    const response = errorResponse(error, true);
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).not.toContain("secret password");
    expect(body).not.toContain("secret stack");
    expect(JSON.parse(body)).toEqual({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred", details: [] } });
  });

  it("hides database messages and details in production", async () => {
    const response = errorResponse(new AppError("DATABASE_ERROR", "secret password", ["secret query"]), true);
    const body = await response.text();
    expect(body).not.toContain("secret password");
    expect(body).not.toContain("secret query");
    expect(JSON.parse(body)).toEqual({ success: false, error: { code: "DATABASE_ERROR", message: "A database error occurred", details: [] } });
  });
});
