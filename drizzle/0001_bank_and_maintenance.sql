ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "bank_code" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "bank_account" text;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "account_holder" text;

DO $$ BEGIN
  CREATE TYPE "maintenance_category" AS ENUM ('plumbing', 'electrical', 'appliance', 'structural', 'pest_control', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "maintenance_priority" AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "maintenance_status" AS ENUM ('pending', 'in_progress', 'resolved', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "maintenance_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "room_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "tenant_id" uuid,
  "title" text NOT NULL,
  "category" "maintenance_category" DEFAULT 'plumbing' NOT NULL,
  "priority" "maintenance_priority" DEFAULT 'medium' NOT NULL,
  "status" "maintenance_status" DEFAULT 'pending' NOT NULL,
  "description" text,
  "resolution_notes" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "maintenance_requests_room_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE cascade,
  CONSTRAINT "maintenance_requests_property_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE cascade,
  CONSTRAINT "maintenance_requests_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "maintenance_requests_room_id_idx" ON "maintenance_requests" ("room_id");
CREATE INDEX IF NOT EXISTS "maintenance_requests_property_id_idx" ON "maintenance_requests" ("property_id");
CREATE INDEX IF NOT EXISTS "maintenance_requests_tenant_id_idx" ON "maintenance_requests" ("tenant_id");
CREATE INDEX IF NOT EXISTS "maintenance_requests_status_idx" ON "maintenance_requests" ("status");
