import type { MonthReport, SavingsPct, Status } from "@/types/finance";

import { rpcRequest } from "./client";

export function initUser(initData: string): Promise<Status> {
  return rpcRequest("user.init", { initData });
}

export function getStatus(initData: string): Promise<Status> {
  return rpcRequest("user.getStatus", { initData });
}

export function addIncome(
  initData: string,
  amount: number,
  savingsPct?: SavingsPct,
): Promise<Status> {
  return rpcRequest("finance.addIncome", { initData, amount, savingsPct });
}

export function addExpense(initData: string, amount: number): Promise<Status> {
  return rpcRequest("finance.addExpense", { initData, amount });
}

export function getReport(initData: string, monthKey?: string): Promise<MonthReport> {
  return rpcRequest("finance.getReport", { initData, monthKey });
}

export function newMonth(initData: string): Promise<Status> {
  return rpcRequest("finance.newMonth", { initData });
}
