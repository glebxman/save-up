import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type { NotificationFrequency } from "@/types/finance";

import { useFinanceContext } from "./_internal";

export function useNotifications() {
  const { initData, syncStatus, notifySuccess, notifyError } = useFinanceContext();
  const { t } = useTranslation();

  const setNotificationSettingsMutation = useMutation({
    mutationFn: (variables: {
      enabled: boolean;
      frequency: NotificationFrequency;
      timezoneOffset: number;
    }) =>
      api.setNotificationSettings(
        initData,
        variables.enabled,
        variables.frequency,
        variables.timezoneOffset,
      ),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.notificationsSaved", { defaultValue: "Notifications saved" }));
    },
    onError: (error) => notifyError(error),
  });

  return { setNotificationSettingsMutation };
}
