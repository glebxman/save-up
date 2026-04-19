import type { MonthReport, SavingsPct, Status } from "@/types/finance";

import { rpcRequest } from "./client";

export function initUser(initData: string): Promise<Status> {
  return rpcRequest("user.init", { initData });
}

export function getStatus(telegramId: number): Promise<Status> {
  return rpcRequest("user.getStatus", { telegramId });
}

export function addIncome(
  telegramId: number,
  amount: number,
  savingsPct?: SavingsPct,
): Promise<Status> {
  return rpcRequest("finance.addIncome", { telegramId, amount, savingsPct });
}

export function addExpense(telegramId: number, amount: number): Promise<Status> {
  return rpcRequest("finance.addExpense", { telegramId, amount });
}

export function getReport(telegramId: number, monthKey?: string): Promise<MonthReport> {
  return rpcRequest("finance.getReport", { telegramId, monthKey });
}

export function newMonth(telegramId: number): Promise<Status> {
  return rpcRequest("finance.newMonth", { telegramId });
}
