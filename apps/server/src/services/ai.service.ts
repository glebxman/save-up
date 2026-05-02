import { env } from "../config/env.js";

export interface TransactionExtraction {
  type: "expense" | "income";
  amount: number;
  category: "food" | "taxi" | "entertainment" | "shopping" | "utilities" | "health" | "education" | "other" | "salary" | "investment" | "gift" | "other_income";
  note?: string;
}

const SYSTEM_PROMPT = `
You are a helpful financial assistant processing voice messages from a Telegram bot.
The user is speaking about a financial transaction (either an expense or an income).
Your job is to transcribe the audio and extract the transaction details into JSON.

IMPORTANT RULES:
1. Identify if it's an "expense" (потратил, купил, расход) or "income" (получил, заработал, доход).
2. Extract the exact "amount" as a number.
3. For expenses, categorize it into exactly one of these categories: food, taxi, entertainment, shopping, utilities, health, education, other. If it's income, use "other" for category.
4. Provide a brief "note" capturing what the transaction was for (e.g. "на обед", "зарплата", "купил продукты").
5. Respond ONLY with a valid JSON object matching the schema below. No markdown formatting, no code blocks, just raw JSON.

SCHEMA:
{
  "type": "expense" | "income",
  "amount": number,
  "category": "food" | "taxi" | "entertainment" | "shopping" | "utilities" | "health" | "education" | "other",
  "note": "string"
}
`;

export async function extractTransactionFromVoice(base64Audio: string): Promise<TransactionExtraction | null> {
  if (!env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is missing");
    return null;
  }

  try {
    const payload = {
      model: "google/gemini-2.5-flash",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:audio/ogg;base64,${base64Audio}`
              }
            }
          ]
        }
      ]
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.text());
      return null;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No content in OpenRouter response");
      return null;
    }

    const jsonStr = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(jsonStr) as TransactionExtraction;
  } catch (error) {
    console.error("Failed to extract transaction from voice:", error);
    return null;
  }
}
