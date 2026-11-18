import { z } from "zod";

const uuid = z.uuid();
const date = z.iso.date();
const monthStart = date.refine((value) => value.endsWith("-01"), "Date must be the first day of a month.");

export const tenantInputSchema = z.strictObject({
  propertyId: uuid,
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  birthDate: date.nullable().optional(),
});

export const tenantPatchSchema = z.strictObject({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  birthDate: date.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one tenant field is required.");

export const contractInputSchema = z.strictObject({
  roomId: uuid,
  tenantIds: z.array(uuid).min(1).max(10),
  startDate: date,
  endDate: date.optional(),
  deposit: z.number().int().min(0).max(2_000_000_000),
  status: z.enum(["draft", "active"]).default("active"),
}).refine((value) => !value.endDate || value.endDate > value.startDate, {
  path: ["endDate"],
  message: "End date must be after start date.",
});

export const contractPatchSchema = z.strictObject({
  status: z.enum(["active", "ended", "cancelled"]),
  endDate: date.optional(),
});

export const utilityRateInputSchema = z.strictObject({
  propertyId: uuid,
  utilityType: z.enum(["electricity", "water"]),
  unitPrice: z.number().int().min(0).max(2_000_000_000),
  effectiveFrom: date,
  effectiveTo: date.nullable().optional(),
}).refine((value) => !value.effectiveTo || value.effectiveTo > value.effectiveFrom, {
  path: ["effectiveTo"],
  message: "Rate end date must be after start date.",
});

export const meterInputSchema = z.strictObject({
  roomId: uuid,
  utilityType: z.enum(["electricity", "water"]),
  billingPeriod: monthStart,
  previousValue: z.number().min(0).max(1_000_000_000),
  currentValue: z.number().min(0).max(1_000_000_000),
  utilityRateId: uuid,
}).refine((value) => value.currentValue >= value.previousValue, {
  path: ["currentValue"],
  message: "Current reading cannot be less than the previous reading.",
});

export const invoiceInputSchema = z.strictObject({
  contractId: uuid,
  billingPeriodStart: monthStart,
  dueDate: date.optional(),
});

export const paymentInputSchema = z.strictObject({
  invoiceId: uuid,
  amount: z.number().int().positive().max(2_000_000_000),
  method: z.enum(["cash", "bank_transfer", "other"]),
  paidAt: z.iso.datetime().optional(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});
