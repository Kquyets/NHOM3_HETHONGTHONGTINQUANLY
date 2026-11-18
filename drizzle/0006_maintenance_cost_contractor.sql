-- Migration 0006: Maintenance cost, payer, contractor contact, photo, and internet category
-- 1. Enum: add 'internet' to maintenance_category enum if not exists
ALTER TYPE "maintenance_category" ADD VALUE IF NOT EXISTS 'internet';

-- 2. Maintenance requests: Cost tracking, responsible payer, contractor info, photos
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "cost" integer DEFAULT 0;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "payer" text DEFAULT 'owner';
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "contractor_name" text;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "contractor_phone" text;
ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "photo_url" text;
