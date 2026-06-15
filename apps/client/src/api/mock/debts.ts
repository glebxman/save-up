import type { Debt, RpcMethodMap } from "@finance-twa/shared-types";

import { parseTelegramIdFromInitData } from "./_helpers";

const mockDebts: Map<string, Debt[]> = new Map();

function getDebtsForUser(telegramId: number): Debt[] {
  if (!mockDebts.has(String(telegramId))) {
    mockDebts.set(String(telegramId), []);
  }
  return mockDebts.get(String(telegramId))!;
}

export function financeAddDebt(
  params: RpcMethodMap["finance.addDebt"]["params"],
): RpcMethodMap["finance.addDebt"]["result"] {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const debts = getDebtsForUser(telegramId);

  const debt: Debt = {
    id: `debt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: `user-${telegramId}`,
    name: params.name,
    amount: params.amount,
    note: params.note ?? null,
    direction: params.direction,
    dueDate: params.dueDate ?? null,
    settled: false,
    settledAt: null,
    createdAt: new Date().toISOString(),
  };

  debts.unshift(debt);
  return debt;
}

export function financeGetDebts(
  params: RpcMethodMap["finance.getDebts"]["params"],
): RpcMethodMap["finance.getDebts"]["result"] {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  return getDebtsForUser(telegramId).filter((d) => !d.settled);
}

export function financeSettleDebt(
  params: RpcMethodMap["finance.settleDebt"]["params"],
): RpcMethodMap["finance.settleDebt"]["result"] {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const debts = getDebtsForUser(telegramId);
  const debt = debts.find((d) => d.id === params.debtId);

  if (debt) {
    debt.settled = true;
    debt.settledAt = new Date().toISOString();
  }

  return { ok: true as const };
}

export function financeDeleteDebt(
  params: RpcMethodMap["finance.deleteDebt"]["params"],
): RpcMethodMap["finance.deleteDebt"]["result"] {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const debts = getDebtsForUser(telegramId);
  const index = debts.findIndex((d) => d.id === params.debtId);

  if (index >= 0) {
    debts.splice(index, 1);
  }

  return { ok: true as const };
}
