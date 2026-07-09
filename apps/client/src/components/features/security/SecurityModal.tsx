import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
} from "@/components/ui";
import { useBiometric } from "@/hooks/useBiometric";
import { useTelegram } from "@/hooks/useTelegram";
import { useLockStore } from "@/stores/lock.store";
import { useToastStore } from "@/stores/ui.store";
import { hapticNotification } from "@/utils/haptic";
import {
  hasStoredPin,
  isBiometricsEnabled,
  isPinValid,
  PIN_MAX_LENGTH,
  setBiometricsEnabled,
  setPin as savePin,
  setStoredBioToken,
  removePin,
  verifyPin,
} from "@/utils/pin";

import { PinPad } from "./PinPad";

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "overview" | "verify" | "create" | "confirm";

export function SecurityModal({ isOpen, onClose }: SecurityModalProps) {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const refreshLock = useLockStore((s) => s.refresh);
  const pushToast = useToastStore((s) => s.pushToast);
  const biometric = useBiometric();

  const [step, setStep] = useState<Step>("overview");
  const [pin, setPin] = useState("");
  const [draftPin, setDraftPin] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** What we're going to do once the verification succeeds: change or remove. */
  const [pendingAction, setPendingAction] = useState<"change" | "remove" | null>(null);

  const hasPin = hasStoredPin();
  const biometricsEnabled = isBiometricsEnabled();

  useEffect(() => {
    if (!isOpen) return;
    setStep("overview");
    setPin("");
    setDraftPin("");
    setError(null);
    setPendingAction(null);
  }, [isOpen]);

  const goVerify = (action: "change" | "remove") => {
    if (!hasPin) {
      // Nothing to verify, jump straight to creation.
      setPendingAction(action);
      setStep("create");
      return;
    }
    setPendingAction(action);
    setStep("verify");
    setPin("");
    setError(null);
  };

  const handleVerify = async (value: string) => {
    try {
      const ok = await verifyPin(initData, value);
      if (!ok) {
        hapticNotification("error");
        setShake(true);
        setError(t("security.lockWrong"));
        setTimeout(() => {
          setShake(false);
          setPin("");
        }, 500);
        return;
      }
    } catch {
      hapticNotification("error");
      setShake(true);
      setError(t("security.lockWrong"));
      setTimeout(() => { setShake(false); setPin(""); }, 500);
      return;
    }
    setError(null);
    if (pendingAction === "remove") {
      await removePin(initData, value);
      refreshLock();
      pushToast({ tone: "success", message: t("security.pinRemoved") });
      setStep("overview");
      return;
    }
    // change
    setStep("create");
    setPin("");
    setDraftPin("");
  };

  const handleCreate = (value: string) => {
    if (!isPinValid(value)) {
      setError(t("security.pinTooShort"));
      return;
    }
    setError(null);
    setDraftPin(value);
    setPin("");
    setStep("confirm");
  };

  const enableBiometrics = async (options: { notifyFailures?: boolean } = {}) => {
    const notifyFailures = options.notifyFailures ?? true;

    if (!biometric.isBiometricAvailable) {
      if (notifyFailures) {
        pushToast({ tone: "error", message: t("security.biometricUnavailable") });
      }
      return false;
    }

    try {
      if (!biometric.isAccessGranted) {
        const granted = await biometric.requestAccess(t("security.biometricReason"));
        if (!granted) {
          if (notifyFailures) {
            pushToast({ tone: "error", message: t("security.biometricDenied") });
          }
          return false;
        }
      }

      const token = `bio-${Date.now()}`;
      const saved = await biometric.saveToken(token);
      if (!saved) {
        if (notifyFailures) {
          pushToast({ tone: "error", message: t("feedback.genericError") });
        }
        return false;
      }

      setStoredBioToken(token);
      setBiometricsEnabled(true);
      refreshLock();
      pushToast({ tone: "success", message: t("security.biometricEnabled") });
      return true;
    } catch {
      if (notifyFailures) {
        pushToast({ tone: "error", message: t("feedback.genericError") });
      }
      return false;
    }
  };

  const handleConfirm = async (value: string) => {
    if (value !== draftPin) {
      hapticNotification("error");
      setShake(true);
      setError(t("security.pinMismatch"));
      setTimeout(() => {
        setShake(false);
        setPin("");
      }, 500);
      return;
    }

    await savePin(initData, value);
    refreshLock();
    pushToast({ tone: "success", message: t("security.pinSaved") });

    // Re-bind biometric token if biometrics were on.
    if (biometricsEnabled && biometric.isSupported && biometric.isAccessGranted) {
      // Use a unique token for biometric verification.
      const token = `pin-${Date.now()}`;
      const saved = await biometric.saveToken(token);
      if (saved) setStoredBioToken(token);
    } else if (!biometricsEnabled && biometric.isSupported && biometric.isBiometricAvailable) {
      // Auto-prompt to enable biometrics if it is supported and not enabled yet
      window.setTimeout(() => {
        void enableBiometrics({ notifyFailures: false });
      }, 300);
    }

    setStep("overview");
    setPin("");
    setDraftPin("");
  };

  const toggleBiometrics = async () => {
    if (!hasPin) {
      pushToast({ tone: "error", message: t("security.setPinFirst") });
      return;
    }

    if (biometricsEnabled) {
      // Disable: clear local flag and overwrite token with empty value.
      setBiometricsEnabled(false);
      await biometric.saveToken("");
      refreshLock();
      pushToast({ tone: "success", message: t("security.biometricDisabled") });
      return;
    }

    await enableBiometrics();
  };

  const renderBody = () => {
    if (step === "verify") {
      return (
        <div className="grid place-items-center gap-4 py-2">
          <p className="m-0 text-center text-sm text-[var(--muted)]">{t("security.verifyTitle")}</p>
          {error ? <p className="m-0 text-sm text-[var(--danger)]">{error}</p> : null}
          <PinPad
            ariaLabel={t("security.verifyTitle")}
            autoFocus
            length={PIN_MAX_LENGTH}
            onChange={setPin}
            onSubmit={(v) => void handleVerify(v)}
            shake={shake}
            value={pin}
          />
        </div>
      );
    }

    if (step === "create") {
      return (
        <div className="grid place-items-center gap-4 py-2">
          <p className="m-0 text-center text-sm text-[var(--muted)]">{t("security.createTitle")}</p>
          {error ? <p className="m-0 text-sm text-[var(--danger)]">{error}</p> : null}
          <PinPad
            ariaLabel={t("security.createTitle")}
            autoFocus
            length={PIN_MAX_LENGTH}
            onChange={setPin}
            onSubmit={handleCreate}
            value={pin}
          />
          <p className="m-0 text-xs text-[var(--muted)]">
            {t("security.pinHint", { count: PIN_MAX_LENGTH })}
          </p>
        </div>
      );
    }

    if (step === "confirm") {
      return (
        <div className="grid place-items-center gap-4 py-2">
          <p className="m-0 text-center text-sm text-[var(--muted)]">{t("security.confirmTitle")}</p>
          {error ? <p className="m-0 text-sm text-[var(--danger)]">{error}</p> : null}
          <PinPad
            ariaLabel={t("security.confirmTitle")}
            autoFocus
            length={PIN_MAX_LENGTH}
            onChange={setPin}
            onSubmit={(v) => void handleConfirm(v)}
            shake={shake}
            value={pin}
          />
        </div>
      );
    }

    return (
      <div className="grid gap-2 py-1">
        <button
          className="flex items-center justify-between rounded-[18px] bg-[var(--surface-secondary)] px-4 py-3 text-left transition active:opacity-80"
          onClick={() => goVerify("change")}
          type="button"
        >
          <span>
            <span className="block text-sm font-semibold text-[var(--foreground)]">
              {hasPin ? t("security.changePin") : t("security.setPin")}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {t("security.pinHint", { count: PIN_MAX_LENGTH })}
            </span>
          </span>
          <span aria-hidden="true">›</span>
        </button>

        <button
          className="flex items-center justify-between rounded-[18px] bg-[var(--surface-secondary)] px-4 py-3 text-left transition disabled:opacity-50 active:opacity-80"
          disabled={!hasPin || (!biometric.isInited && biometric.isSupported) || (biometric.isInited && !biometric.isBiometricAvailable)}
          onClick={() => void toggleBiometrics()}
          type="button"
        >
          <span>
            <span className="block text-sm font-semibold text-[var(--foreground)]">
              {biometric.biometricType === "face"
                ? t("security.useFaceId")
                : biometric.biometricType === "finger"
                  ? t("security.useTouchId")
                  : t("security.useBiometric")}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {!hasPin
                ? t("security.setPinFirst")
                : !biometric.isInited
                  ? "..."
                  : !biometric.isBiometricAvailable
                    ? t("security.biometricUnavailable")
                    : biometricsEnabled
                      ? t("security.on")
                      : t("security.off")}
            </span>
          </span>
          <span
            className={`relative inline-block h-6 w-11 rounded-full transition ${
              biometricsEnabled ? "bg-[var(--accent)]" : "bg-[var(--surface-tertiary)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                biometricsEnabled ? "left-[1.4rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>

        {hasPin ? (
          <button
            className="rounded-[18px] bg-[color-mix(in_srgb,var(--danger)_14%,var(--surface-secondary))] px-4 py-3 text-left text-sm font-semibold text-[var(--danger)] transition active:opacity-80"
            onClick={() => goVerify("remove")}
            type="button"
          >
            {t("security.removePin")}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContainer size="md">
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <div className="flex flex-col gap-2">
                <ModalHeading>{t("security.title")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">{t("security.description")}</p>
              </div>
            </ModalHeader>
            <ModalBody>{renderBody()}</ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
