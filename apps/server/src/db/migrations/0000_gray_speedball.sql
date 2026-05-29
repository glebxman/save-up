CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"category" varchar(50),
	"amount" numeric(24, 8) NOT NULL,
	"savings_amt" numeric(24, 8),
	"note" text,
	"month_key" varchar(7) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"account_id" uuid,
	"to_account_id" uuid
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"type" varchar(30) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"balance" numeric(24, 8) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"first_name" varchar(128),
	"last_name" varchar(128),
	"username" varchar(64),
	"photo_url" text,
	"balance" numeric(15, 2) DEFAULT 0 NOT NULL,
	"savings" numeric(15, 2) DEFAULT 0 NOT NULL,
	"savings_pct" smallint DEFAULT 20 NOT NULL,
	"savings_goal" numeric(15, 2) DEFAULT 0 NOT NULL,
	"recurring_templates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"monthly_exp" numeric(15, 2) DEFAULT 0 NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"language" varchar(5),
	"voice_daily_used" smallint DEFAULT 0 NOT NULL,
	"voice_daily_date" varchar(10),
	"category_customizations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"custom_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notifications_configured" boolean DEFAULT false NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"notification_frequency" jsonb DEFAULT '{"mode":"every_n_days","days":3,"time":"09:00"}'::jsonb NOT NULL,
	"notification_timezone_offset" smallint DEFAULT 0 NOT NULL,
	"last_reminder_slot_key" varchar(32),
	"last_reminder_sent_at" timestamp with time zone,
	"pin_hash" varchar(64),
	"pin_salt" varchar(32),
	"currency" varchar(10) DEFAULT 'UZS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_month_key_idx" ON "transactions" USING btree ("month_key");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "transactions_occurred_at_idx" ON "transactions" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_deleted_at_idx" ON "transactions" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_to_account_id_idx" ON "transactions" USING btree ("to_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_telegram_id_idx" ON "users" USING btree ("telegram_id");