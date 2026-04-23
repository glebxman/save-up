import { useEffect, useRef } from "react";

import { useToastStore } from "@/stores/ui.store";

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));

    // Start timer only for new toasts
    for (const toast of toasts) {
      if (!timersRef.current.has(toast.id)) {
        const timer = window.setTimeout(() => {
          removeToast(toast.id);
          timersRef.current.delete(toast.id);
        }, 2600);
        timersRef.current.set(toast.id, timer);
      }
    }

    // Clear timers for removed toasts
    for (const id of timersRef.current.keys()) {
      if (!currentIds.has(id)) {
        window.clearTimeout(timersRef.current.get(id));
        timersRef.current.delete(id);
      }
    }
  }, [toasts, removeToast]);

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
