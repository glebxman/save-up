import type { TransactionFilters } from "@/types/finance";
import { useQuery } from "@tanstack/react-query";

import * as api from "../api/methods";
import { useTelegram } from "./useTelegram";

export function useTransactionHistory(filters: TransactionFilters) {
  const { initData, user } = useTelegram();
  const telegramId = user?.id ?? Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);

  return useQuery({
    queryKey: ["transactions", telegramId, filters] as const,
    enabled: !!initData,
    queryFn: () => api.getTransactions(initData, filters),
    placeholderData: (previousData) => previousData,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}
