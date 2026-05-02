ALTER TABLE "users" ADD COLUMN "voice_daily_used" smallint NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "voice_daily_date" varchar(10);
