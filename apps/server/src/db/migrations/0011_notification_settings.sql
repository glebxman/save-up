-- Per-user notification preferences (frequency, time of day, timezone) plus a
-- dedupe key so the scheduler doesn't send the same slot twice.
-- Idempotent: every statement uses IF NOT EXISTS so a re-run on a partially
-- migrated database (e.g. someone applied the legacy 0008 by hand) is safe.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notifications_configured" boolean NOT NULL DEFAULT false;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notifications_enabled" boolean NOT NULL DEFAULT true;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notification_frequency" jsonb NOT NULL
  DEFAULT '{"mode":"every_n_days","days":3,"time":"09:00"}'::jsonb;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notification_timezone_offset" smallint NOT NULL DEFAULT 0;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "last_reminder_slot_key" varchar(32);

-- Speeds up the reminder scheduler's "did we already send this slot?" check.
CREATE INDEX IF NOT EXISTS users_last_reminder_slot_key_idx
  ON users(last_reminder_slot_key);
