-- Convert transactions.type / .category from PostgreSQL enums to varchar so we
-- can support custom user-defined categories without DB migrations on each
-- new label. Safe to re-run: each step guards against the prior state.

DROP INDEX IF EXISTS transactions_month_key_idx;
DROP INDEX IF EXISTS transactions_user_id_idx;
DROP INDEX IF EXISTS transactions_category_idx;
DROP INDEX IF EXISTS transactions_occurred_at_idx;
DROP INDEX IF EXISTS transactions_deleted_at_idx;

ALTER TABLE transactions ALTER COLUMN type TYPE varchar(30) USING type::varchar;
ALTER TABLE transactions ALTER COLUMN category TYPE varchar(50) USING category::varchar;

CREATE INDEX IF NOT EXISTS transactions_month_key_idx ON transactions(month_key);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category);
CREATE INDEX IF NOT EXISTS transactions_occurred_at_idx ON transactions(occurred_at);
CREATE INDEX IF NOT EXISTS transactions_deleted_at_idx ON transactions(deleted_at);

DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS expense_category;

ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_categories jsonb NOT NULL DEFAULT '[]'::jsonb;
