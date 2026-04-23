import type { Status } from "@/types/finance";

import { create } from "zustand";

interface FinanceStoreState {
  optimisticStatus: Status | null;
  setOptimisticStatus: (status: Status | null) => void;
}

export const useFinanceStore = create<FinanceStoreState>((set) => ({
  optimisticStatus: null,
  setOptimisticStatus: (status) => {
    set({ optimisticStatus: status });
  },
}));
