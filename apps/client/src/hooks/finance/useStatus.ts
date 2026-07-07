import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import * as api from "@/api/methods";
import { syncLanguageFromServer } from "@/i18n";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { setGlobalRates } from "@/utils/exchange-rates";
import { setStoredCurrency } from "@/utils/currency";
import { syncHasPinFlag } from "@/utils/pin";

import { useFinanceContext } from "./_internal";

/**
 * Wraps the user.init / status query. Splitting it out keeps Dashboard /
 * Settings light: components that only need user data don't pull in mutations.
 */
export function useStatus() {
  const { initData, statusKey, liveStatus } = useFinanceContext();

  const statusQuery = useQuery({
    queryKey: statusKey,
    enabled: !!initData,
    queryFn: () => api.initUser(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 15,
    refetchIntervalInBackground: false,
    retry: 2,
  });

  useEffect(() => {
    if (initData) {
      useOnboardingStore.getState().setInitData(initData);
    }
  }, [initData]);

  useEffect(() => {
    if (statusQuery.data) {
      useOnboardingStore.getState().syncFromServer(
        statusQuery.data.user.onboardingCompleted,
        statusQuery.data.user.notificationsConfigured,
      );
      syncLanguageFromServer(statusQuery.data.user.language);
      setStoredCurrency(statusQuery.data.user.currency);
      setGlobalRates(statusQuery.data.rates);
      syncHasPinFlag(statusQuery.data.user.hasPinConfigured);
    }
  }, [statusQuery.data]);

  return {
    statusQuery,
    status: liveStatus,
  };
}
