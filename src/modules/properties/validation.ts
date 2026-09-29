import { z } from "zod";

export const propertyInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).nullable().optional(),
});

export const propertyPatchSchema = propertyInputSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "At least one property field is required.");

export const roomInputSchema = z.strictObject({
  roomNumber: z.string().trim().min(1).max(30),
  monthlyRent: z.number().int().min(0).max(2_000_000_000),
  areaM2: z.number().positive().max(100_000).optional(),
  status: z.enum(["ready", "maintenance"]).optional(),
});

export const roomPatchSchema = roomInputSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "At least one room field is required.");
