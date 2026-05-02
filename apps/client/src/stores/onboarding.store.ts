import { create } from "zustand";

import { completeOnboarding } from "../api/methods";

const STORAGE_KEY = "save-up:onboarding-completed";

export interface OnboardingStep {
  id: string;
  target: string | null;
  route: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { id: "welcome", target: null, route: "/" },
  { id: "navigation", target: "bottom-nav", route: "/" },
  { id: "balance", target: "balance", route: "/" },
  { id: "amount-input", target: "amount-input", route: "/" },
  { id: "daily-limit", target: "daily-limit", route: "/" },
  { id: "savings", target: "savings", route: "/" },
  { id: "templates", target: "templates", route: "/" },
  { id: "report-tabs", target: "report-tabs", route: "/report" },
  { id: "report-summary", target: "report-summary", route: "/report" },
  { id: "report-details", target: "report-details", route: "/report" },
  { id: "report-new-month", target: "report-new-month", route: "/report" },
  { id: "settings-theme", target: "settings-theme", route: "/settings" },
  { id: "settings-language", target: "settings-language", route: "/settings" },
  { id: "settings-currency", target: "settings-currency", route: "/settings" },
  { id: "done", target: null, route: "/" },
];

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

function readCachedCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCachedCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* noop */
  }
}

interface OnboardingState {
  isCompleted: boolean;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  initData: string | null;
  setInitData: (initData: string) => void;
  syncFromServer: (completed: boolean) => void;
  start: () => void;
  restart: () => void;
  forceRestarted: boolean;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
}

function markDone(initData: string | null) {
  writeCachedCompleted();
  if (initData) {
    completeOnboarding(initData).catch(() => { });
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isCompleted: readCachedCompleted(),
  isActive: false,
  forceRestarted: false,
  currentStep: 0,
  totalSteps: ONBOARDING_STEPS.length,
  initData: null,

  setInitData: (initData: string) => {
    set({ initData });
  },

  syncFromServer: (completed: boolean) => {
    const { isCompleted, isActive, forceRestarted } = get();

    if (completed) {
      writeCachedCompleted();
      if (!forceRestarted) {
        set({ isCompleted: true, isActive: false });
      }
    } else if (!isCompleted && !isActive) {
      set({ isCompleted: false });
      setTimeout(() => useOnboardingStore.getState().start(), 0);
    }
  },

  start: () => {
    const { isCompleted, isActive } = get();
    if (!isCompleted && !isActive) {
      set({ isActive: true, currentStep: 0 });
    }
  },

  restart: () => {
    // Clear localStorage so it won't be treated as completed on next reload
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    set({ isCompleted: false, isActive: true, currentStep: 0, forceRestarted: true });
  },

  next: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep < totalSteps - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      get().complete();
    }
  },

  prev: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skip: () => {
    markDone(get().initData);
    set({ isActive: false, isCompleted: true, forceRestarted: false });
  },

  complete: () => {
    markDone(get().initData);
    set({ isActive: false, isCompleted: true, forceRestarted: false });
  },
}));
