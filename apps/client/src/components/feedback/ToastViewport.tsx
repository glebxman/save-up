import { useEffect } from "react";

import { useToastStore } from "@/stores/ui.store";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 2600));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [removeToast, toasts]);

  return (
    <div className="finance-toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className="finance-toast" data-tone={toast.tone}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
