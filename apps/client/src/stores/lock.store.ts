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
 * Lock state lives on the client; PIN hashing and verification are server-backed.
 * `unlocked` resets on every full app load, which is what we want for Telegram WebApp.
 */
export const useLockStore = create<LockState>((set) => ({
  hasPin: hasStoredPin(),
  biometricsEnabled: isBiometricsEnabled(),
  unlocked: false,
  refresh: () => set({ hasPin: hasStoredPin(), biometricsEnabled: isBiometricsEnabled() }),
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}));
