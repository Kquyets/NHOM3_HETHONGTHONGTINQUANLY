-- Migration 0004: Add public listing fields to rooms table for Nhà Tốt explore portal
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_public_listed" boolean DEFAULT false NOT NULL;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "listing_title" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "listing_description" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "district" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "ward" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "floor" integer;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "furnishing" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "amenities" text[];
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "image_urls" text[];
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "contact_phone" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "contact_zalo" text;

CREATE INDEX IF NOT EXISTS "rooms_public_listing_idx" ON "rooms" ("is_public_listed", "city", "district");
