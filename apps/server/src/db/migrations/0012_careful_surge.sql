CREATE TABLE IF NOT EXISTS "accounts" (
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
ALTER TABLE "transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(24, 8);
--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "savings_amt" SET DATA TYPE numeric(24, 8);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "account_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "to_account_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'UZS' NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk') THEN
    ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" USING btree ("user_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_account_id_accounts_id_fk') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_to_account_id_accounts_id_fk') THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fk" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_account_id_idx" ON "transactions" USING btree ("account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_to_account_id_idx" ON "transactions" USING btree ("to_account_id");
--> statement-breakpoint
DO $$
DECLARE
    user_row RECORD;
    new_acc_id uuid;
BEGIN
    FOR user_row IN SELECT id, balance, currency, language, recurring_templates FROM users LOOP
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = user_row.id AND deleted_at IS NULL) THEN
            new_acc_id := gen_random_uuid();
            
            INSERT INTO accounts (id, user_id, name, type, currency, balance, created_at)
            VALUES (
                new_acc_id, 
                user_row.id, 
                CASE WHEN user_row.language = 'ru' THEN 'Основной' ELSE 'Main' END, 
                'cash', 
                user_row.currency, 
                user_row.balance, 
                now()
            );
            
            UPDATE transactions 
            SET account_id = new_acc_id 
            WHERE user_id = user_row.id AND account_id IS NULL;
            
            IF user_row.recurring_templates IS NOT NULL AND jsonb_array_length(user_row.recurring_templates) > 0 THEN
                UPDATE users
                SET recurring_templates = (
                    SELECT jsonb_agg(
                        jsonb_set(elem, '{accountId}', to_jsonb(new_acc_id::text))
                    )
                    FROM jsonb_array_elements(user_row.recurring_templates) AS elem
                )
                WHERE id = user_row.id;
            END IF;
        END IF;
    END LOOP;
END $$;