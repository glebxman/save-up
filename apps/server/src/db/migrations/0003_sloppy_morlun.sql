CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(16) NOT NULL,
	"plan_id" varchar(24) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"provider_transaction_id" varchar(128),
	"provider_prepare_id" varchar(128),
	"payme_state" smallint,
	"payme_create_time" bigint,
	"payme_perform_time" bigint,
	"payme_cancel_time" bigint,
	"payme_reason" smallint,
	"activated_from" timestamp with time zone,
	"activated_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_plan" varchar(24);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_payments_user_id_idx" ON "subscription_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_payments_provider_idx" ON "subscription_payments" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payments_provider_tx_idx" ON "subscription_payments" USING btree ("provider","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "subscription_payments_payme_create_time_idx" ON "subscription_payments" USING btree ("payme_create_time");