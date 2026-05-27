import { create } from "zustand";

import { hasStoredPin, isBiometricsEnabled } from "@/utils/pin";

interface LockState {
  /** True when PIN protection is configured (the lock screen will show on launch). */
  hasPin: boolean;
  /** Whether the user has opted into biometric unlock. */
  biometricsEnabled: boolean;
  /** Once unlocked, the rest of the app is reachable until full reload. */
  unlocked: boolean;
  refresh: () => void;
  unlock: () => void;
  lock: () => void;
}

/**
 * Lock state lives entirely on the client; the server never sees the PIN.
 * `unlocked` resets on every full app load — opening Telegram WebApp anew is
 * effectively that, which is what we want.
 */
export const useLockStore = create<LockState>((set) => ({
  hasPin: hasStoredPin(),
  biometricsEnabled: isBiometricsEnabled(),
  unlocked: false,
  refresh: () => set({ hasPin: hasStoredPin(), biometricsEnabled: isBiometricsEnabled() }),
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}));
