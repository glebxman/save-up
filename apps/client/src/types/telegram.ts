/**
 * Subset of the Telegram WebApp API we rely on. We type only what's used so
 * mismatches surface fast, and we keep the runtime checks (feature detection)
 * for old clients that don't expose BiometricManager.
 */

import type { TelegramUser } from "@finance-twa/shared-types";

export type { TelegramUser } from "@finance-twa/shared-types";

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  secondary_bg_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramHapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
}

export type BiometricType = "finger" | "face" | "unknown";

export interface BiometricRequestAccessParams {
  reason?: string;
}

export interface BiometricAuthenticateParams {
  reason?: string;
}

/**
 * Available since Bot API 7.2. Older clients return `undefined` for the whole
 * manager, so always feature-detect via `webApp.BiometricManager`.
 */
export interface BiometricManager {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: BiometricType;
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  isBiometricTokenSaved: boolean;
  deviceId: string;

  init: (callback?: () => void) => BiometricManager;
  requestAccess: (
    params: BiometricRequestAccessParams,
    callback?: (granted: boolean) => void,
  ) => BiometricManager;
  authenticate: (
    params: BiometricAuthenticateParams,
    callback?: (success: boolean, token?: string) => void,
  ) => BiometricManager;
  updateBiometricToken: (token: string, callback?: (updated: boolean) => void) => BiometricManager;
  openSettings: () => BiometricManager;
}

export interface TelegramWebApp {
  initData?: string;
  themeParams?: TelegramThemeParams;
  initDataUnsafe?: {
    user?: TelegramUser;
  };
  HapticFeedback?: TelegramHapticFeedback;
  BiometricManager?: BiometricManager;
  /** Toggleable from Bot API 6.2+. */
  isClosingConfirmationEnabled?: boolean;
  /** Available since Bot API 7.7. Disables the swipe-to-close gesture. */
  disableVerticalSwipes?: () => void;
  /** Counterpart, included for completeness. */
  enableVerticalSwipes?: () => void;
  /** Opens a Telegram-native link such as https://t.me/username. */
  openTelegramLink?: (url: string) => void;
  /** Opens an external URL inside Telegram's supported browser flow. */
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  ready?: () => void;
  expand?: () => void;
}

export type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
};
