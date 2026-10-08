-- Add profile columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;

-- Notification types and notifications table
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM ('invoice', 'maintenance', 'payment', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" "notification_type" DEFAULT 'system' NOT NULL,
  "link" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_is_read_idx" ON "notifications" ("user_id", "is_read");
