ALTER TYPE "public"."transaction_type" ADD VALUE 'transfer_to_savings';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'transfer_from_savings';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "occurred_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "transactions" SET "occurred_at" = "created_at";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "savings_goal" numeric(15, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "category_limits" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recurring_templates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "transactions_occurred_at_idx" ON "transactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_deleted_at_idx" ON "transactions" USING btree ("deleted_at");
