-- Migration 0005: Management system enhancements from lỗi.docx
-- 1. Rooms: Spatial hierarchy, max occupants, archived state, furniture checklist
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "max_occupants" integer DEFAULT 2;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false NOT NULL;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "furniture_list" text[];

-- 2. Tenants: Hometown for temporary residence declaration, vehicles, emergency contact, CCCD photos
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "hometown" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "vehicle_number" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "emergency_contact_name" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "id_card_front_url" text;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "id_card_back_url" text;

-- 3. Contracts: Flexible payment cycle, handover inventory, liquidation & deposit refund flow
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "payment_cycle_months" integer DEFAULT 1 NOT NULL;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "handover_inventory" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "damage_deduction" integer DEFAULT 0;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "utility_deduction" integer DEFAULT 0;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "deposit_refund_amount" integer;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "liquidation_notes" text;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "liquidated_at" timestamp with time zone;
