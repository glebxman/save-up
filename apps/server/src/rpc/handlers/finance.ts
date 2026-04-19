import type { RpcHandler } from "../types.js";

import { addExpense, addIncome, getReport, newMonth } from "../../services/finance.service.js";

export const addIncomeHandler: RpcHandler<"finance.addIncome"> = async ({
  telegramId,
  amount,
  savingsPct,
}) => {
  return addIncome(telegramId, amount, savingsPct);
};

export const addExpenseHandler: RpcHandler<"finance.addExpense"> = async ({ telegramId, amount }) => {
  return addExpense(telegramId, amount);
};

export const getReportHandler: RpcHandler<"finance.getReport"> = async ({ telegramId, monthKey }) => {
  return getReport(telegramId, monthKey);
};

export const newMonthHandler: RpcHandler<"finance.newMonth"> = async ({ telegramId }) => {
  return newMonth(telegramId);
};
