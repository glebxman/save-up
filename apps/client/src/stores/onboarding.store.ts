import { create } from "zustand";

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
  { id: "settings-theme", target: "settings-theme", route: "/settings" },
  { id: "settings-language", target: "settings-language", route: "/settings" },
  { id: "settings-currency", target: "settings-currency", route: "/settings" },
  { id: "done", target: null, route: "/" },
];

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

function readCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCompleted(): void {
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
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isCompleted: readCompleted(),
  isActive: false,
  currentStep: 0,
  totalSteps: ONBOARDING_STEPS.length,

  start: () => {
    if (!get().isCompleted) {
      set({ isActive: true, currentStep: 0 });
    }
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
    writeCompleted();
    set({ isActive: false, isCompleted: true });
  },

  complete: () => {
    writeCompleted();
    set({ isActive: false, isCompleted: true });
  },
}));
