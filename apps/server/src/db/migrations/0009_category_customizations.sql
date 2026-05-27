ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "category_customizations" jsonb NOT NULL DEFAULT '{}'::jsonb;
