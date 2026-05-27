import type { Status } from "@finance-twa/shared-types";

import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "../user.service.js";
import { getExchangeRates } from "../currency.service.js";
import { persistStatus } from "./_shared.js";

export async function refreshRates(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  await getExchangeRates(true);
  await invalidateStatusCache(telegramId);
  return persistStatus(user);
}
