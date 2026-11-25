import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../lib/auth/with-auth", () => {
  const ctxFromReq = (req: NextRequest) => ({
    userId: req.headers.get("x-test-user") ?? "user-1",
    role: (req.headers.get("x-test-role") as "owner" | "manager" | "tenant") ?? "owner",
    email: "test@example.com",
  });
  return {
    getAuthContext: vi.fn(ctxFromReq),
    requireAuthContext: vi.fn(async (req: NextRequest) => ctxFromReq(req)),
  };
});

import { POST as loginPost } from "./auth/login/route";
import { POST as registerPost } from "./auth/register/route";
import { POST as refreshPost } from "./auth/refresh/route";
import { POST as propertyPost } from "./properties/route";
import { POST as paymentPost } from "./invoices/[invoiceId]/payments/route";
import { PATCH as maintenancePatch } from "./maintenance/[requestId]/route";
import { POST as tenantPortalPost } from "./tenant-portal/route";

describe("API Route Validation & Error Responses", () => {
  it("returns 400 VALIDATION_ERROR instead of 500 on malformed JSON or missing auth fields", async () => {
    const badJsonReq = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: "not-json",
    });
    const loginRes = await loginPost(badJsonReq);
    expect(loginRes.status).toBe(400);
    expect((await loginRes.json()).error.code).toBe("VALIDATION_ERROR");

    const regBadRole = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "a@b.com", password: "password123", role: "admin" }),
    });
    const regRes = await registerPost(regBadRole);
    expect(regRes.status).toBe(400);
    expect((await regRes.json()).error.code).toBe("VALIDATION_ERROR");

    const refreshEmpty = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const refreshRes = await refreshPost(refreshEmpty);
    expect(refreshRes.status).toBe(400);
    expect((await refreshRes.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 VALIDATION_ERROR for invalid property, payment (NaN/<=0), and tenant-portal payloads", async () => {
    const propRes = await propertyPost(
      new NextRequest("http://localhost/api/properties", {
        method: "POST",
        body: JSON.stringify({ address: "123" }),
      }),
    );
    expect(propRes.status).toBe(400);
    expect((await propRes.json()).error.code).toBe("VALIDATION_ERROR");

    const payRes = await paymentPost(
      new NextRequest("http://localhost/api/invoices/inv-1/payments", {
        method: "POST",
        body: JSON.stringify({ amount: -100, method: "cash" }),
      }),
      { params: Promise.resolve({ invoiceId: "inv-1" }) },
    );
    expect(payRes.status).toBe(400);
    expect((await payRes.json()).error.code).toBe("VALIDATION_ERROR");

    const portalRes = await tenantPortalPost(
      new NextRequest("http://localhost/api/tenant-portal", {
        method: "POST",
        body: JSON.stringify({ action: "unknown" }),
      }),
    );
    expect(portalRes.status).toBe(400);
    expect((await portalRes.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 FORBIDDEN when tenant tries non-cancel update on maintenance request", async () => {
    const res = await maintenancePatch(
      new NextRequest("http://localhost/api/maintenance/req-1", {
        method: "PATCH",
        headers: { "x-test-role": "tenant" },
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ requestId: "req-1" }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });
});
