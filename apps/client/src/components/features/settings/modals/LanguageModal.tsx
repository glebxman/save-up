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
import i18n, { OTHER_LANGUAGES, PRIMARY_LANGUAGES, type AppLanguage } from "@/i18n";
import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { LANGUAGE_FLAG_URLS, LANGUAGE_FLAGS } from "../languageMeta";

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: AppLanguage;
}

function LanguageFlag({ language, size = "md" }: { language: AppLanguage; size?: "sm" | "md" }) {
  const flagUrl = LANGUAGE_FLAG_URLS[language];
  const sizeClassName = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  if (flagUrl) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex ${sizeClassName} shrink-0 overflow-hidden rounded-full bg-[var(--surface-tertiary)]`}
      >
        <img alt="" className="h-full w-full object-cover" src={flagUrl} />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${sizeClassName} shrink-0 items-center justify-center rounded-full bg-[var(--surface-tertiary)] text-[10px] font-semibold uppercase text-[var(--muted)]`}
    >
      {LANGUAGE_FLAGS[language] || language}
    </span>
  );
}

export function LanguageModal({ isOpen, onClose, currentLanguage }: LanguageModalProps) {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const { updateLanguageMutation } = useFinance();
  const [showOther, setShowOther] = useState(false);

  // Auto-expand "other" panel if the user is currently using one of those.
  useEffect(() => {
    if (!isOpen) return;
    setShowOther(OTHER_LANGUAGES.includes(currentLanguage as (typeof OTHER_LANGUAGES)[number]));
  }, [isOpen, currentLanguage]);

  const selectLanguage = (language: AppLanguage) => {
    void i18n.changeLanguage(language);
    if (initData) updateLanguageMutation.mutate(language);
    onClose();
  };

  const renderButton = (language: AppLanguage) => (
    <Button
      key={language}
      className="h-auto w-full justify-start px-4 py-3 text-left"
      onPress={() => selectLanguage(language)}
      variant={currentLanguage === language ? "primary" : "secondary"}
    >
      <LanguageFlag language={language} />
      <span className="min-w-0 flex-1 truncate">
        {t(`settings.language${language.charAt(0).toUpperCase()}${language.slice(1)}`)}
      </span>
    </Button>
  );

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()} variant="blur">
        <ModalContainer size={showOther ? "md" : "sm"}>
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <div className="flex flex-col gap-2">
                <ModalHeading>{t("settings.languageModalTitle")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">
                  {t("settings.languageModalDescription")}
                </p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid gap-3">
                {PRIMARY_LANGUAGES.map(renderButton)}
                <Button
                  className="w-full"
                  onPress={() => setShowOther((open) => !open)}
                  variant="secondary"
                >
                  {t(showOther ? "settings.languageHideOther" : "settings.languageOther")}
                </Button>
                {showOther ? (
                  <div className="grid max-h-[44vh] gap-3 overflow-y-auto pr-1">
                    {OTHER_LANGUAGES.map(renderButton)}
                  </div>
                ) : null}
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

// Re-export so the Settings page can render the same flag in the row trailer.
export { LanguageFlag };
