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
  areaM2: z.number().positive().max(100_000).optional().nullable(),
  status: z.enum(["ready", "maintenance"]).optional(),
  isPublicListed: z.boolean().optional(),
  listingTitle: z.string().trim().max(200).optional().nullable(),
  listingDescription: z.string().trim().max(4000).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  ward: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  floor: z.number().int().min(0).max(200).optional().nullable(),
  maxOccupants: z.number().int().min(1).max(50).optional().nullable(),
  isArchived: z.boolean().optional(),
  furnitureList: z.array(z.string()).optional().nullable(),
  furnishing: z.enum(["full", "basic", "empty"]).optional().nullable(),
  amenities: z.array(z.string()).optional().nullable(),
  imageUrls: z.array(z.string()).optional().nullable(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  contactZalo: z.string().trim().max(30).optional().nullable(),
});

export const roomPatchSchema = roomInputSchema.partial()
  .refine((value) => Object.keys(value).length > 0, "At least one room field is required.");
