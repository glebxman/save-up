import type { DailyLimit } from "@finance-twa/shared-types";

export interface DailyLimitInput {
  balance: number;
  now?: Date;
}

export function getMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}`;
}

export function calculateDailyLimit({
  balance,
  now = new Date(),
}: DailyLimitInput): DailyLimit {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(lastDay - day + 1, 1);
  const dailyLimit = Number((balance / daysRemaining).toFixed(2));

  return {
    daysRemaining,
    dailyLimit,
  };
}
