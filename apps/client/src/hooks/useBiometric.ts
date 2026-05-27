import { useCallback, useEffect, useRef, useState } from "react";

type BiometricType = "finger" | "face" | "unknown";

interface BiometricManagerRaw {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: BiometricType;
  isAccessRequested: boolean;
  isAccessGranted: boolean;
  isBiometricTokenSaved: boolean;
  deviceId: string;
  init: (callback?: () => void) => unknown;
  requestAccess: (
    params: { reason?: string },
    callback?: (granted: boolean) => void,
  ) => unknown;
  authenticate: (
    params: { reason?: string },
    callback?: (success: boolean, token?: string) => void,
  ) => unknown;
  updateBiometricToken: (token: string, callback?: (updated: boolean) => void) => unknown;
  openSettings: () => unknown;
}

interface BiometricState {
  isInited: boolean;
  isBiometricAvailable: boolean;
  biometricType: BiometricType;
  isAccessGranted: boolean;
  isBiometricTokenSaved: boolean;
  deviceId: string;
}

interface UseBiometricResult extends BiometricState {
  isSupported: boolean;
  requestAccess: (reason: string) => Promise<boolean>;
  authenticate: (reason: string) => Promise<{ success: boolean; token?: string }>;
  saveToken: (token: string) => Promise<boolean>;
}

const EMPTY_STATE: BiometricState = {
  isInited: false,
  isBiometricAvailable: false,
  biometricType: "unknown",
  isAccessGranted: false,
  isBiometricTokenSaved: false,
  deviceId: "",
};

function getBiometricManager(): BiometricManagerRaw | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.BiometricManager) {
      return tg.BiometricManager as BiometricManagerRaw;
    }
  } catch {
    // Not in Telegram context.
  }
  return null;
}

function snapshot(bm: BiometricManagerRaw): BiometricState {
  return {
    isInited: bm.isInited,
    isBiometricAvailable: bm.isBiometricAvailable,
    biometricType: bm.biometricType,
    isAccessGranted: bm.isAccessGranted,
    isBiometricTokenSaved: bm.isBiometricTokenSaved,
    deviceId: bm.deviceId,
  };
}

/**
 * Hook wrapping Telegram WebApp BiometricManager (Bot API 7.2+).
 *
 * Accesses `window.Telegram.WebApp.BiometricManager` directly to avoid
 * any intermediate typing issues. Falls back gracefully when unavailable.
 */
export function useBiometric(): UseBiometricResult {
  const [state, setState] = useState<BiometricState>(EMPTY_STATE);
  const managerRef = useRef<BiometricManagerRaw | null>(null);

  useEffect(() => {
    const bm = getBiometricManager();
    managerRef.current = bm;

    if (!bm) return;

    // Init must be called before any other method.
    bm.init(() => {
      setState(snapshot(bm));
    });
  }, []);

  const requestAccess = useCallback(
    (reason: string): Promise<boolean> => {
      const bm = managerRef.current;
      if (!bm || !bm.isBiometricAvailable) return Promise.resolve(false);

      return new Promise((resolve) => {
        bm.requestAccess({ reason }, (granted) => {
          setState(snapshot(bm));
          resolve(granted);
        });
      });
    },
    [],
  );

  const authenticate = useCallback(
    (reason: string): Promise<{ success: boolean; token?: string }> => {
      const bm = managerRef.current;
      if (!bm || !bm.isBiometricAvailable) {
        return Promise.resolve({ success: false });
      }

      return new Promise((resolve) => {
        bm.authenticate({ reason }, (success, token) => {
          setState(snapshot(bm));
          resolve({ success, token });
        });
      });
    },
    [],
  );

  const saveToken = useCallback(
    (token: string): Promise<boolean> => {
      const bm = managerRef.current;
      if (!bm) return Promise.resolve(false);

      return new Promise((resolve) => {
        bm.updateBiometricToken(token, (updated) => {
          setState(snapshot(bm));
          resolve(updated);
        });
      });
    },
    [],
  );

  return {
    ...state,
    isSupported: !!managerRef.current,
    requestAccess,
    authenticate,
    saveToken,
  };
}
