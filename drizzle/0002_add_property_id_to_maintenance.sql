ALTER TABLE "maintenance_requests" ADD COLUMN IF NOT EXISTS "property_id" uuid;

DO $$ BEGIN
  ALTER TABLE "maintenance_requests"
    ADD CONSTRAINT "maintenance_requests_property_fk"
    FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

UPDATE "maintenance_requests" m
SET "property_id" = r."property_id"
FROM "rooms" r
WHERE m."room_id" = r."id" AND m."property_id" IS NULL;

ALTER TABLE "maintenance_requests" ALTER COLUMN "property_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "maintenance_requests_property_id_idx" ON "maintenance_requests" ("property_id");
