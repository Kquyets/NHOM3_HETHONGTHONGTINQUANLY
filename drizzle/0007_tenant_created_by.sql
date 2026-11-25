-- Migration 0007: Track creator on tenant profiles for multi-landlord isolation of unlinked tenants
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "tenants_created_by_user_id_idx" ON "tenants" ("created_by_user_id");
