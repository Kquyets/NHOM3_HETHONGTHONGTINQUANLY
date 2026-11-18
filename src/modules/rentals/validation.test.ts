import { describe, expect, it } from "vitest";

import { contractInputSchema, invoiceInputSchema, meterInputSchema, paymentInputSchema } from "./validation";
import { calculateUtilityAmount } from "./billing";

describe("rental and billing request validation", () => {
  it("requires at least one contract tenant and nonnegative deposit", () => {
    const base = { roomId: "d6c72ff9-c144-4707-b05f-02520fc637af", startDate: "2026-09-01", deposit: 0 };
    expect(contractInputSchema.safeParse({ ...base, tenantIds: [] }).success).toBe(false);
    expect(contractInputSchema.safeParse({ ...base, deposit: -1, tenantIds: ["b9365b1a-4687-4d31-88ef-e3e4f82673f0"] }).success).toBe(false);
  });

  it("accepts only a first-of-month meter and invoice period", () => {
    expect(meterInputSchema.safeParse({ roomId: "d6c72ff9-c144-4707-b05f-02520fc637af", utilityType: "water", billingPeriod: "2026-09-02", previousValue: 0, currentValue: 2, utilityRateId: "b9365b1a-4687-4d31-88ef-e3e4f82673f0" }).success).toBe(false);
    expect(invoiceInputSchema.safeParse({ contractId: "d6c72ff9-c144-4707-b05f-02520fc637af", billingPeriodStart: "2026-09-01", dueDate: "2026-09-05" }).success).toBe(true);
  });

  it("requires a positive payment amount", () => {
    expect(paymentInputSchema.safeParse({ invoiceId: "d6c72ff9-c144-4707-b05f-02520fc637af", amount: 0, method: "cash" }).success).toBe(false);
  });
});

describe("utility invoice calculations", () => {
  it("rounds fractional usage to integer VND using the saved unit-price snapshot", () => {
    expect(calculateUtilityAmount("10.000", "12.375", 3_500)).toBe(8_313);
  });
});
