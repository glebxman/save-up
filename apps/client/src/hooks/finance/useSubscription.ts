import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type { PaymentProvider, Status, SubscriptionPlanId } from "@/types/finance";
import { useTelegram } from "@/hooks/useTelegram";

import { useFinanceContext } from "./_internal";

export function useSubscription() {
  const { initData, statusKey, syncStatus, notifyError, notifySuccess } = useFinanceContext();
  const { webApp } = useTelegram();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const startTrialMutation = useMutation({
    mutationFn: () => api.startSubscriptionTrial(initData),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("subscription.trialStarted"));
    },
    onError: (error) => notifyError(error),
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ provider, planId }: { provider: PaymentProvider; planId: SubscriptionPlanId }) =>
      api.createSubscriptionPayment(initData, provider, planId),
    onSuccess: (payment) => {
      if (webApp?.openLink) {
        webApp.openLink(payment.url);
      } else {
        window.open(payment.url, "_blank", "noopener,noreferrer");
      }

      queryClient.invalidateQueries({ queryKey: statusKey }).catch(() => undefined);
    },
    onError: (error) => notifyError(error),
  });

  function syncPaidStatus(status: Status) {
    syncStatus(status);
  }

  return {
    startTrialMutation,
    createPaymentMutation,
    syncPaidStatus,
  };
}

