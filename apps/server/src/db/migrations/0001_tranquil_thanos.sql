CREATE TYPE "public"."expense_category" AS ENUM('food', 'taxi', 'entertainment', 'shopping', 'utilities', 'health', 'education', 'other');--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category" "expense_category";--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");