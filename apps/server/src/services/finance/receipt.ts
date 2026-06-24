import { extractTransactionFromReceipt } from "../ai.service.js";
import { processAiTransaction } from "./ai-transaction.js";

export async function processReceipt(telegramId: number, base64Photo: string) {
  return processAiTransaction(telegramId, base64Photo, extractTransactionFromReceipt);
}
