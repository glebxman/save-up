import type { CustomCategory, TransactionExtraction } from "@finance-twa/shared-types";
import { EXPENSE_CATEGORIES } from "@finance-twa/shared-types";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ service: "ai" });

export type { TransactionExtraction } from "@finance-twa/shared-types";

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

const BUILTIN_CATEGORIES = EXPENSE_CATEGORIES;

const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

function buildSystemPrompt(customCategories: CustomCategory[] = [], lang?: string): string {
  const customList = customCategories.map((c) => `"${c.id}" (${c.emoji} ${c.name})`);
  const allCategories = [
    ...BUILTIN_CATEGORIES.map((c) => `"${c}"`),
    ...customList,
  ];

  const langInstruction = lang && lang !== "en"
    ? `\nThe user speaks ${lang}. You MUST respond in ${lang} language. The note field MUST be in ${lang}.`
    : "";

  return `
You are a helpful financial assistant for a Telegram Mini App.
The user will provide a transcribed text from a voice message about a financial transaction.
Your job is to extract the transaction details into JSON.
${langInstruction}
RULES:
1. Identify if it's an "expense" (e.g., потратил, купил, расход, оплатил, harajdim, xarid qildim, sattım, ausgegeben, dépensé) or "income" (e.g., получил, заработал, доход, пришли деньги, oldim, ishladim, verdIncome, empfangen, reçu).
2. Extract the "amount" as a positive number. Ignore currency symbols or text, just get the numeric value.
3. For expenses, categorize into one of: ${allCategories.join(", ")}.
4. For income, use "other" for category.
5. Provide a brief "note" describing the transaction in the same language as the user.
6. Respond ONLY with raw JSON. No markdown.

SCHEMA:
{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "note": "string"
}
`;
}

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, init);
      if (res.ok || res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_RETRIES) {
      const jitter = Math.random() * 500;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1) + jitter));
    }
  }
  throw lastError;
}

function validateExtraction(data: unknown): TransactionExtraction | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  if (obj.type !== "expense" && obj.type !== "income") return null;
  if (typeof obj.amount !== "number" || obj.amount <= 0 || !Number.isFinite(obj.amount)) return null;
  if (typeof obj.category !== "string" || obj.category.length === 0) return null;

  return {
    type: obj.type,
    amount: Math.round(obj.amount * 100) / 100,
    category: obj.category,
    note: typeof obj.note === "string" ? obj.note : undefined,
  };
}

export async function extractTransactionFromVoice(
  base64Audio: string,
  customCategories: CustomCategory[] = [],
  lang?: string,
): Promise<TransactionExtraction | null> {
  if (!env.OPENAI_API_KEY) {
    log.error("OPENAI_API_KEY is missing");
    return null;
  }

  try {
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/ogg" });
    const formData = new FormData();

    formData.append("file", blob, "voice.ogg");
    formData.append("model", "whisper-1");

    const transcribeRes = await fetchWithRetry("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcribeRes.ok) {
      log.error({ status: transcribeRes.status }, "OpenAI Whisper error");
      return null;
    }

    const transcribeData = await transcribeRes.json() as { text: string };
    const transcription = transcribeData.text;

    if (!transcription || transcription.trim().length === 0) {
      log.warn("Empty transcription from Whisper");
      return null;
    }

    const chatPayload = {
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: buildSystemPrompt(customCategories, lang) },
        { role: "user", content: transcription },
      ],
    };

    const chatRes = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatPayload),
    });

    if (!chatRes.ok) {
      log.error({ status: chatRes.status }, "OpenAI Chat error");
      return null;
    }

    const chatData = await chatRes.json() as OpenAIChatResponse;
    const rawContent = chatData.choices?.[0]?.message?.content;

    if (!rawContent) {
      log.warn("No content in OpenAI response");
      return null;
    }

    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    return validateExtraction(parsed);
  } catch (error) {
    log.error({ err: error }, "Failed to extract transaction from voice");
    return null;
  }
}

function buildReceiptPrompt(customCategories: CustomCategory[] = []): string {
  const customList = customCategories.map((c) => `"${c.id}" (${c.emoji} ${c.name})`);
  const allCategories = [
    ...BUILTIN_CATEGORIES.map((c) => `"${c}"`),
    ...customList,
  ];

  return `
You are a receipt scanning assistant for a Telegram Mini App.
The user has sent a photo of a receipt or bill.
Analyze the image and extract the transaction details into JSON.

RULES:
1. Extract the total amount from the receipt.
2. Identify the merchant/store name if visible.
3. Categorize the expense into one of: ${allCategories.join(", ")}.
4. Create a brief note describing the purchase (use the store name if available).
5. Respond ONLY with raw JSON. No markdown.

SCHEMA:
{
  "amount": number,
  "category": string,
  "note": "string"
}
`;
}

export async function extractTransactionFromReceipt(
  base64Photo: string,
  customCategories: CustomCategory[] = [],
  lang?: string,
): Promise<TransactionExtraction | null> {
  if (!env.OPENAI_API_KEY) {
    log.error("OPENAI_API_KEY is missing");
    return null;
  }

  try {
    const photoBuffer = Buffer.from(base64Photo, "base64");
    const dataUrl = `data:image/jpeg;base64,${base64Photo}`;

    const chatPayload = {
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: buildReceiptPrompt(customCategories) },
        {
          role: "user",
          content: [
            { type: "text", text: `Extract the transaction details from this receipt. The note should be in ${lang ?? "English"}.` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    };

    const chatRes = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatPayload),
    });

    if (!chatRes.ok) {
      log.error({ status: chatRes.status }, "OpenAI Chat error for receipt");
      return null;
    }

    const chatData = await chatRes.json() as OpenAIChatResponse;
    const rawContent = chatData.choices?.[0]?.message?.content;

    if (!rawContent) {
      log.warn("No content in OpenAI response for receipt");
      return null;
    }

    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed.amount !== "number" || parsed.amount <= 0) {
      return null;
    }

    return {
      type: "expense",
      amount: Math.round(parsed.amount * 100) / 100,
      category: typeof parsed.category === "string" ? parsed.category : "other",
      note: typeof parsed.note === "string" ? parsed.note : undefined,
    };
  } catch (error) {
    log.error({ err: error }, "Failed to extract transaction from receipt");
    return null;
  }
}
