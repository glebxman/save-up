/**
 * PIN utilities - server-backed.
 *
 * The PIN hash is stored on the server (in `users.pin_hash` / `users.pin_salt`).
 * The client only knows whether a PIN is configured via `Status.user.hasPinConfigured`.
 * Verification happens via RPC `user.verifyPin`.
 *
 * Biometrics flag remains in localStorage because it's a device-local preference
 * (the same user on a different device shouldn't auto-inherit biometric unlock).
 */

import * as api from "@/api/methods";
import { getTelegramUserId } from "@finance-twa/shared-utils";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

const BIOMETRICS_KEY = "pin-biometrics";
const BIOMETRIC_TOKEN_KEY = "bio-token";
const HAS_PIN_KEY = "has-pin";

function getKey(baseKey: string): string {
  const userId = getTelegramUserId();
  return userId ? `save-up:${userId}:${baseKey}` : `save-up:${baseKey}`;
}

export function isPinValid(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN_LENGTH && pin.length <= PIN_MAX_LENGTH;
}

/**
 * Check if user has PIN configured. Reads from the last known status.
 * This is used by the lock store on app load.
 */
export function hasStoredPin(): boolean {
  // We read from a simple localStorage flag that gets synced from Status.
  return localStorage.getItem(getKey(HAS_PIN_KEY)) === "1";
}

/** Called by the status sync to keep the local flag in sync with server state. */
export function syncHasPinFlag(hasPinConfigured: boolean): void {
  const key = getKey(HAS_PIN_KEY);
  if (hasPinConfigured) {
    localStorage.setItem(key, "1");
  } else {
    localStorage.removeItem(key);
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

/** Device-local marker used to compare Telegram's returned biometric token. */
export function getStoredHash(): string | null {
  // The marker is not the PIN. Telegram stores and returns it through
  // BiometricManager so we can reject stale or unrelated biometric prompts.
  return localStorage.getItem(getKey(BIOMETRIC_TOKEN_KEY));
}

export function setStoredBioToken(token: string): void {
  localStorage.setItem(getKey(BIOMETRIC_TOKEN_KEY), token);
}

export function clearStoredBioToken(): void {
  localStorage.removeItem(getKey(BIOMETRIC_TOKEN_KEY));
}

export function clearPin(): void {
  localStorage.removeItem(getKey(HAS_PIN_KEY));
  localStorage.removeItem(getKey(BIOMETRICS_KEY));
  clearStoredBioToken();
}

export function isBiometricsEnabled(): boolean {
  return localStorage.getItem(getKey(BIOMETRICS_KEY)) === "1";
}

export function setBiometricsEnabled(enabled: boolean): void {
  const key = getKey(BIOMETRICS_KEY);
  if (enabled) localStorage.setItem(key, "1");
  else {
    localStorage.removeItem(key);
    clearStoredBioToken();
  }
}
