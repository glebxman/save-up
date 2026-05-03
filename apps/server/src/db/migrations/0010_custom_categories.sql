-- Change transactions.type from enum to varchar
DROP INDEX IF EXISTS transactions_month_key_idx;
DROP INDEX IF EXISTS transactions_user_id_idx;
DROP INDEX IF EXISTS transactions_category_idx;
DROP INDEX IF EXISTS transactions_occurred_at_idx;
DROP INDEX IF EXISTS transactions_deleted_at_idx;

ALTER TABLE transactions ALTER COLUMN type TYPE varchar(30) USING type::varchar;
ALTER TABLE transactions ALTER COLUMN category TYPE varchar(50) USING category::varchar;

CREATE INDEX transactions_month_key_idx ON transactions(month_key);
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_category_idx ON transactions(category);
CREATE INDEX transactions_occurred_at_idx ON transactions(occurred_at);
CREATE INDEX transactions_deleted_at_idx ON transactions(deleted_at);

DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS expense_category;

-- Add custom_categories to users
ALTER TABLE users ADD COLUMN custom_categories jsonb NOT NULL DEFAULT '[]'::jsonb;
