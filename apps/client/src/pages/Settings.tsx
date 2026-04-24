import { Button, Card, CardContent, Modal } from "@heroui/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "@/i18n";
import i18n, { SUPPORTED_LANGUAGES } from "@/i18n";
import { ChevronRightIcon, LanguageIcon, ThemeIcon, WalletIcon } from "@/components/layout/icons";
import { useTheme, type ThemeMode } from "@/providers/ThemeProvider";

type SettingsModal = "theme" | "language" | null;

export function Settings() {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeModal, setActiveModal] = useState<SettingsModal>(null);

  const currentLanguage = (i18n.resolvedLanguage ?? "en").slice(0, 2) as AppLanguage;

  const themeLabels: Record<ThemeMode, string> = {
    auto: t("settings.themeAuto"),
    dark: t("settings.themeDark"),
    light: t("settings.themeLight"),
  };

  const languageLabels: Record<AppLanguage, string> = {
    en: t("settings.languageEn"),
    ru: t("settings.languageRu"),
    uz: t("settings.languageUz"),
  };

  const themeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: "auto", label: themeLabels.auto },
    { value: "light", label: themeLabels.light },
    { value: "dark", label: themeLabels.dark },
  ];

  const themeSummary = theme === "auto"
    ? t("settings.themeAutoResolved", {
      mode: themeLabels.auto,
      theme: themeLabels[resolvedTheme],
    })
    : themeLabels[theme];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t("settings.title")}
        </h1>
        <p className="m-0 text-sm text-[var(--muted)]">
          {t("settings.description")}
        </p>
      </div>

      <Card className="overflow-hidden" variant="default">
        <CardContent className="p-0">
          <button
            className="flex w-full items-center justify-between gap-4 pb-2 text-left"
            onClick={() => setActiveModal("theme")}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-emerald-500/75 text-white">
                <ThemeIcon className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-[var(--foreground)]">
                  {t("settings.theme")}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
              <span className="truncate">{themeSummary}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
            </div>
          </button>

          <div className="mx-4 h-px bg-[var(--separator)]" />

          <button
            className="flex w-full items-center justify-between gap-4 pt-2 text-left"
            onClick={() => setActiveModal("language")}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-blue-500/75 text-white">
                <LanguageIcon className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-[var(--foreground)]">
                  {t("settings.language")}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
              <span className="truncate">{languageLabels[currentLanguage]}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
            </div>
          </button>
        </CardContent>
      </Card>

      <Modal>
        <Modal.Backdrop
          isOpen={activeModal === "theme"}
          onOpenChange={(nextOpen) => !nextOpen && setActiveModal(null)}
          variant="blur"
        >
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />

              <Modal.Header>
                <div className="flex flex-col gap-2">
                  <Modal.Heading>{t("settings.themeModalTitle")}</Modal.Heading>
                  <p className="m-0 text-sm text-[var(--muted)]">
                    {t("settings.themeModalDescription")}
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body>
                <div className="grid gap-3">
                  {themeOptions.map((option) => (
                    <Button
                      key={option.value}
                      className="w-full"
                      onPress={() => {
                        setTheme(option.value);
                        setActiveModal(null);
                      }}
                      variant={theme === option.value ? "primary" : "secondary"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop
          isOpen={activeModal === "language"}
          onOpenChange={(nextOpen) => !nextOpen && setActiveModal(null)}
          variant="blur"
        >
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />

              <Modal.Header>
                <div className="flex flex-col gap-2">
                  <Modal.Heading>{t("settings.languageModalTitle")}</Modal.Heading>
                  <p className="m-0 text-sm text-[var(--muted)]">
                    {t("settings.languageModalDescription")}
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body>
                <div className="grid gap-3">
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <Button
                      key={language}
                      className="w-full"
                      onPress={() => {
                        void i18n.changeLanguage(language);
                        setActiveModal(null);
                      }}
                      variant={currentLanguage === language ? "primary" : "secondary"}
                    >
                      {languageLabels[language]}
                    </Button>
                  ))}
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
