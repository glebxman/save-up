import { create } from "zustand";

export interface ToastMessage {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
}

interface UiStoreState {
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

let idCounter = 0;
function createId(): string {
  return `toast-${Date.now()}-${++idCounter}`;
}

export const useToastStore = create<UiStoreState>((set) => ({
  toasts: [],
  pushToast: (toast) => {
    const nextToast: ToastMessage = {
      id: createId(),
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-2), nextToast],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
