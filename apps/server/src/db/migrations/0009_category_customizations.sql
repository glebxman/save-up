ALTER TABLE "users" ADD COLUMN "category_customizations" jsonb NOT NULL DEFAULT '{}'::jsonb;
