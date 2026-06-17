import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { BiometricIcon } from "@/components/features/security/biometricIcons";
import { PinPad } from "@/components/features/security/PinPad";
import { LockClosedIcon } from "@/components/layout/icons";
import { useBiometric } from "@/hooks/useBiometric";
import { useTelegram } from "@/hooks/useTelegram";
import { useLockStore } from "@/stores/lock.store";
import { hapticNotification } from "@/utils/haptic";
import { getStoredHash, isBiometricsEnabled, PIN_MAX_LENGTH, verifyPin } from "@/utils/pin";

const FAILURE_RESET_MS = 600;

export function LockScreen() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const unlock = useLockStore((s) => s.unlock);
  const biometric = useBiometric();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const biometricTriedRef = useRef(false);
  const verifyingRef = useRef(false);

  const biometricAvailable =
    isBiometricsEnabled() &&
    biometric.isSupported &&
    biometric.isBiometricAvailable &&
    biometric.isAccessGranted &&
    biometric.isBiometricTokenSaved;

  const handleBiometric = useCallback(async () => {
    if (!biometric.isSupported || !biometric.isBiometricAvailable) return;

    // Request access if not yet granted
    if (!biometric.isAccessGranted) {
      const granted = await biometric.requestAccess(t("security.biometricReason"));
      if (!granted) return;
    }

    const result = await biometric.authenticate(t("security.biometricReason"));
    if (result.success && result.token && result.token === getStoredHash()) {
      hapticNotification("success");
      unlock();
    }
  }, [biometric, t, unlock]);

  // Auto-prompt biometrics once when the screen mounts.
  useEffect(() => {
    if (biometricTriedRef.current) return;
    if (!biometricAvailable || !biometric.isInited) return;
    biometricTriedRef.current = true;
    void handleBiometric();
  }, [biometricAvailable, biometric.isInited, handleBiometric]);

  const handleSubmit = async (value: string) => {
    if (verifyingRef.current) return;
    if (!initData) return;
    verifyingRef.current = true;
    try {
      const ok = await verifyPin(initData, value);
      if (ok) {
        hapticNotification("success");
        unlock();
        return;
      }
    } catch {
      // Network error — treat as wrong PIN.
    } finally {
      verifyingRef.current = false;
    }
    hapticNotification("error");
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin("");
    }, FAILURE_RESET_MS);
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-[var(--background)] px-6 text-[var(--foreground)]"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]"
        >
          <LockClosedIcon className="h-8 w-8" />
        </span>
        <h1 className="m-0 text-xl font-semibold tracking-[-0.02em]">
          {t("security.lockTitle")}
        </h1>
        <p className="m-0 text-sm text-[var(--muted)]">
          {shake
            ? t("security.lockWrong")
            : t("security.lockHint", {
                count: PIN_MAX_LENGTH,
                defaultValue: `Введите ${PIN_MAX_LENGTH}-значный PIN`,
              })}
        </p>
      </div>

      <PinPad
        ariaLabel={t("security.lockTitle")}
        autoFocus
        length={PIN_MAX_LENGTH}
        onChange={setPin}
        onSubmit={handleSubmit}
        shake={shake}
        value={pin}
      />

      {biometricAvailable ? (
        <button
          className="flex items-center gap-2 rounded-[18px] bg-[var(--surface-secondary)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition active:scale-[0.97]"
          onClick={() => void handleBiometric()}
          type="button"
        >
          <BiometricIcon className="h-5 w-5" type={biometric.biometricType} />
          {biometric.biometricType === "face"
            ? t("security.useFaceId")
            : biometric.biometricType === "finger"
              ? t("security.useTouchId")
              : t("security.useBiometric")}
        </button>
      ) : null}
    </motion.div>
  );
}
