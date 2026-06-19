import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findEnvFile(): string | undefined {
  const candidates = [
    path.resolve(__dirname, "../../../../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

const envPath = findEnvFile();

if (envPath) {
  dotenv.config({ path: envPath });
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  WEBAPP_URL: z.string().optional(),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  PAYMENT_CALLBACK_BASE_URL: z.string().url().optional(),
  CLICK_MERCHANT_ID: z.string().default(""),
  CLICK_SERVICE_ID: z.string().default(""),
  CLICK_SECRET_KEY: z.string().default(""),
  PAYME_MERCHANT_ID: z.string().default(""),
  PAYME_SECRET_KEY: z.string().default(""),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),
  OPENAI_API_KEY: z.string().optional(),
  // Comma-separated list of Telegram IDs that always have admin access.
  SUPER_ADMIN_TELEGRAM_IDS: z
    .string()
    .default("8246152069")
    .transform((value) =>
      value
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((id) => Number.isFinite(id)),
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${parsed.error.issues
      .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("\n")}`,
  );
}

export const env = parsed.data;
