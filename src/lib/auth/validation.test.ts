import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./validation";

describe("authentication request validation", () => {
  it("normalizes registration email and never accepts a caller-selected role", () => {
    expect(registerSchema.parse({
      email: "  Tenant@Example.com ",
      password: "a secure demo password",
      fullName: "Demo Tenant",
    })).toEqual({ email: "tenant@example.com", password: "a secure demo password", fullName: "Demo Tenant" });
    expect(registerSchema.safeParse({
      email: "tenant@example.com",
      password: "a secure demo password",
      fullName: "Demo Tenant",
      role: "owner",
    }).success).toBe(false);
  });

  it("rejects weak login payloads at the request boundary", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});
