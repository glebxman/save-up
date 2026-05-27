import { appendTransaction, ensureUser, saveUser } from "./_db";
import {
  applyImpact,
  buildTransaction,
  ensureNonNegative,
  getTransactionImpact,
  parseRecurringPayload,
  parseTelegramIdFromInitData,
} from "./_helpers";
import { buildStatus } from "./_status";
import type { MockHandler } from "./_types";

export const financeSaveRecurringTransaction: MockHandler<"finance.saveRecurringTransaction"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const nextTemplate = parseRecurringPayload(params.template);
  const index = user.recurringTransactions.findIndex((item) => item.id === nextTemplate.id);

  if (index >= 0) user.recurringTransactions[index] = nextTemplate;
  else user.recurringTransactions.unshift(nextTemplate);

  saveUser(user);
  return await buildStatus(user);
};

export const financeDeleteRecurringTransaction: MockHandler<"finance.deleteRecurringTransaction"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.recurringTransactions = user.recurringTransactions.filter((item) => item.id !== params.templateId);
  saveUser(user);
  return await buildStatus(user);
};

export const financeApplyRecurringTransaction: MockHandler<"finance.applyRecurringTransaction"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const template = user.recurringTransactions.find((item) => item.id === params.templateId);

  if (!template) throw new Error("Recurring transaction not found");

  const transaction = buildTransaction(user.id, {
    type: template.type,
    amount: template.amount,
    savingsAmt: template.savingsAmt,
    category: template.category,
    note: template.note ?? template.title,
  });

  const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);
  ensureNonNegative(nextUser);
  saveUser(nextUser);
  appendTransaction(transaction);

  return await buildStatus(nextUser);
};
