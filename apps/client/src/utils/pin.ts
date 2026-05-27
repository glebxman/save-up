/**
 * PIN utilities — server-backed.
 *
 * The PIN hash is stored on the server (in `users.pin_hash` / `users.pin_salt`).
 * The client only knows whether a PIN is configured via `Status.user.hasPinConfigured`.
 * Verification happens via RPC `user.verifyPin`.
 *
 * Biometrics flag remains in localStorage because it's a device-local preference
 * (the same user on a different device shouldn't auto-inherit biometric unlock).
 */

import * as api from "@/api/methods";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

const BIOMETRICS_KEY = "save-up:pin-biometrics";

export function isPinValid(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH;
}

/**
 * Check if user has PIN configured. Reads from the last known status.
 * This is used by the lock store on app load.
 */
export function hasStoredPin(): boolean {
  // We read from a simple localStorage flag that gets synced from Status.
  return localStorage.getItem("save-up:has-pin") === "1";
}

/** Called by the status sync to keep the local flag in sync with server state. */
export function syncHasPinFlag(hasPinConfigured: boolean): void {
  if (hasPinConfigured) {
    localStorage.setItem("save-up:has-pin", "1");
  } else {
    localStorage.removeItem("save-up:has-pin");
  }
}

export async function setPin(initData: string, pin: string): Promise<void> {
  await api.setPin(initData, pin);
  syncHasPinFlag(true);
}

export async function verifyPin(initData: string, pin: string): Promise<boolean> {
  const result = await api.verifyPin(initData, pin);
  return result.ok;
}

export async function removePin(initData: string, pin: string): Promise<void> {
  await api.removePin(initData, pin);
  syncHasPinFlag(false);
  setBiometricsEnabled(false);
}

/** Used to compare the biometric token — we store the PIN itself (encrypted by Telegram). */
export function getStoredHash(): string | null {
  // For biometric token we use a simple marker. The actual "token" stored in
  // Telegram's BiometricManager is opaque — we just need it to match.
  return localStorage.getItem("save-up:bio-token");
}

export function setStoredBioToken(token: string): void {
  localStorage.setItem("save-up:bio-token", token);
}

export function clearPin(): void {
  localStorage.removeItem("save-up:has-pin");
  localStorage.removeItem(BIOMETRICS_KEY);
  localStorage.removeItem("save-up:bio-token");
}

export function isBiometricsEnabled(): boolean {
  return localStorage.getItem(BIOMETRICS_KEY) === "1";
}

export function setBiometricsEnabled(enabled: boolean): void {
  if (enabled) localStorage.setItem(BIOMETRICS_KEY, "1");
  else localStorage.removeItem(BIOMETRICS_KEY);
}
