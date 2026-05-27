import { useMutation } from "@tanstack/react-query";

import * as api from "@/api/methods";

import { useFinanceContext } from "./_internal";

export function useVoice() {
  const { initData, notifyError } = useFinanceContext();

  const processVoiceMutation = useMutation({
    mutationFn: ({ base64Audio }: { base64Audio: string }) =>
      api.processVoice(initData, base64Audio),
    onError: (error) => notifyError(error),
  });

  return { processVoiceMutation };
}
