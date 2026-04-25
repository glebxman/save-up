import { useEffect, useRef, useState } from "react";

import { useToastStore, type ToastMessage } from "@/stores/ui.store";

interface RenderedToast extends ToastMessage {
  state: "open" | "closed";
}

const TOAST_EXIT_MS = 220;

function ToastToneIcon({ tone }: { tone: "success" | "error" | "info" }) {
  if (tone === "success") {
    return (
      <span className="finance-toast-icon finance-toast-icon-success" aria-hidden="true">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
          <path d="M4 8.3l2.3 2.3L12 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      </span>
    );
  }

  if (tone === "error") {
    return (
      <span className="finance-toast-icon finance-toast-icon-error" aria-hidden="true">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
          <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </span>
    );
  }

  return (
    <span className="finance-toast-icon finance-toast-icon-info" aria-hidden="true">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
        <path d="M8 6.5v3.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <circle cx="8" cy="4.25" fill="currentColor" r="1" />
      </svg>
    </span>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const timersRef = useRef<Map<string, number>>(new Map());
  const exitTimersRef = useRef<Map<string, number>>(new Map());
  const [renderedToasts, setRenderedToasts] = useState<RenderedToast[]>([]);

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

  useEffect(() => {
    setRenderedToasts((current) => {
      const toastMap = new Map(toasts.map((toast) => [toast.id, toast]));
      const next: RenderedToast[] = [];

      for (const item of current) {
        const liveToast = toastMap.get(item.id);

        if (liveToast) {
          next.push({ ...liveToast, state: "open" });
          toastMap.delete(item.id);
          continue;
        }

        next.push({ ...item, state: "closed" });
      }

      for (const toast of toasts) {
        if (toastMap.has(toast.id)) {
          next.push({ ...toast, state: "open" });
        }
      }

      return next;
    });
  }, [toasts]);

  useEffect(() => {
    for (const toast of renderedToasts) {
      if (toast.state === "closed" && !exitTimersRef.current.has(toast.id)) {
        const timer = window.setTimeout(() => {
          setRenderedToasts((current) => current.filter((item) => item.id !== toast.id));
          exitTimersRef.current.delete(toast.id);
        }, TOAST_EXIT_MS);

        exitTimersRef.current.set(toast.id, timer);
      }

      if (toast.state === "open" && exitTimersRef.current.has(toast.id)) {
        window.clearTimeout(exitTimersRef.current.get(toast.id));
        exitTimersRef.current.delete(toast.id);
      }
    }
  }, [renderedToasts]);

  useEffect(() => {
    return () => {
      for (const timer of exitTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      exitTimersRef.current.clear();
    };
  }, []);

  return (
    <div className="finance-toast-stack">
      {renderedToasts.map((toast) => (
        <div key={toast.id} className="finance-toast" data-state={toast.state} data-tone={toast.tone}>
          <div className="finance-toast-main">
            <ToastToneIcon tone={toast.tone} />
            <div className="finance-toast-copy">
              <p className="finance-toast-title">{toast.message}</p>
            </div>
          </div>

          <button
            aria-label="Close notification"
            className="finance-toast-close"
            onClick={() => removeToast(toast.id)}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
              <path d="M4 4l8 8M12 4 4 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
