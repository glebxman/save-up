import { extractTransactionFromVoice } from "../ai.service.js";
import { processAiTransaction } from "./ai-transaction.js";

export async function processVoice(telegramId: number, base64Audio: string) {
  return processAiTransaction(telegramId, base64Audio, extractTransactionFromVoice);
}
