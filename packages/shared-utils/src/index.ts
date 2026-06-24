import type { DailyLimit } from "@finance-twa/shared-types";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";

export function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

export function getMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export function calculateDailyLimit(balance: number, now = new Date()): DailyLimit {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const daysRemaining = Math.max(lastDay - day + 1, 1);
  const dailyLimit = Number((balance / daysRemaining).toFixed(2));

  return { daysRemaining, dailyLimit };
}

export function normalizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed.slice(0, 240) : null;
}

export function normalizeString(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (amount > MAX_FINANCE_AMOUNT) {
    throw new Error(`Amount is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }
}

function validateNonNegative(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be zero or a positive number`);
  }

  if (value > MAX_FINANCE_AMOUNT) {
    throw new Error(`${fieldName} is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }

  return roundAmount(value);
}

export function normalizeGoal(goal: number): number {
  return validateNonNegative(goal, "Savings goal");
}

export function normalizeBalance(balance: number): number {
  return validateNonNegative(balance, "Balance");
}

export function normalizeSavingsAmount(amount: number, savingsAmt?: number | null): number {
  if (savingsAmt === undefined || savingsAmt === null) {
    return 0;
  }

  if (!Number.isFinite(savingsAmt) || savingsAmt < 0) {
    throw new Error("Savings amount must be zero or a positive number");
  }

  if (savingsAmt > amount) {
    throw new Error("Savings amount cannot exceed income amount");
  }

  return roundAmount(savingsAmt);
}

export function getTelegramUserId(): number {
  if (typeof window !== "undefined") {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id;
    }
  }
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_USE_MOCK_API === "true"
  ) {
    return Number((import.meta as any).env?.VITE_DEMO_TELEGRAM_ID ?? 1);
  }
  return 0;
}

export function getEndOfTomorrow(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  return tomorrow;
}
