import type { ExpenseCategory } from "@finance-twa/shared-types";
import { env } from "../config/env.js";

export interface TransactionExtraction {
  type: "expense" | "income";
  amount: number;
  category: ExpenseCategory;
  note?: string;
}

interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}


const SYSTEM_PROMPT = `
You are a helpful financial assistant for a Telegram Mini App.
The user will provide a transcribed text from a voice message about a financial transaction.
Your job is to extract the transaction details into JSON.

RULES:
1. Identify if it's an "expense" (e.g., потратил, купил, расход, оплатил) or "income" (e.g., получил, заработал, доход, пришли деньги).
2. Extract the "amount" as a number. Ignore currency symbols or text, just get the numeric value.
3. For expenses, categorize it into exactly one of: food, taxi, entertainment, shopping, utilities, health, education, other.
4. For income, use "other" for category.
5. Provide a brief "note" in the same language as the user (mostly Russian or Uzbek).
6. Respond ONLY with raw JSON. No markdown.

SCHEMA:
{
  "type": "expense" | "income",
  "amount": number,
  "category": "food" | "taxi" | "entertainment" | "shopping" | "utilities" | "health" | "education" | "other",
  "note": "string"
}
`;


export async function extractTransactionFromVoice(base64Audio: string): Promise<TransactionExtraction | null> {
  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing");
    return null;
  }

  try {
    const audioBuffer = Buffer.from(base64Audio, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/ogg" });
    const formData = new FormData();

    formData.append("file", blob, "voice.ogg");
    formData.append("model", "whisper-1");

    const transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!transcribeRes.ok) {
      console.error("OpenAI Whisper error:", await transcribeRes.text());
      return null;
    }

    const transcribeData = await transcribeRes.json() as { text: string };
    const transcription = transcribeData.text;

    if (!transcription || transcription.trim().length === 0) {
      console.error("Empty transcription");
      return null;
    }

    const chatPayload = {
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcription }
      ]
    };

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(chatPayload)
    });

    if (!chatRes.ok) {
      console.error("OpenAI Chat error:", await chatRes.text());
      return null;
    }

    const chatData = await chatRes.json() as OpenAIChatResponse;
    const rawContent = chatData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No content in OpenAI response");
      return null;
    }

    const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(jsonStr) as TransactionExtraction;
  } catch (error) {
    console.error("Failed to extract transaction from voice:", error);
    return null;
  }
}
