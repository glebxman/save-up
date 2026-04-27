import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AppLanguage } from "@/i18n";
import type { CurrencyCode } from "@finance-twa/shared-types";
import i18n, { OTHER_LANGUAGES, PRIMARY_LANGUAGES, SUPPORTED_LANGUAGES } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { ChevronRightIcon, LanguageIcon, ThemeIcon } from "@/components/layout/icons";
import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { Button, Card, CardContent, Modal } from "@/components/ui";
import { setLanguage } from "@/api/methods";
import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { useTheme, type ThemeMode } from "@/providers/ThemeProvider";
import { useCurrency, SUPPORTED_CURRENCIES } from "@/hooks/useCurrency";
import { getCurrencySymbol } from "@/utils/format";
import ruFlagUrl from "@/assets/ru.svg";
import ukFlagUrl from "@/assets/uk.svg";
import uzbFlagUrl from "@/assets/uzb.svg";

type SettingsModal = "theme" | "language" | "currency" | "reset" | null;

export function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { initData } = useTelegram();
  const { resetAccountDataMutation, status } = useFinance();
  const { currency, setCurrency } = useCurrency();
  const [activeModal, setActiveModal] = useState<SettingsModal>(null);
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);

  const resolvedLanguage = (i18n.resolvedLanguage ?? "en").slice(0, 2);
  const currentLanguage = SUPPORTED_LANGUAGES.includes(resolvedLanguage as AppLanguage)
    ? resolvedLanguage as AppLanguage
    : "en";

  const themeLabels: Record<ThemeMode, string> = {
    auto: t("settings.themeAuto"),
    dark: t("settings.themeDark"),
    light: t("settings.themeLight"),
  };

  const languageLabels: Record<AppLanguage, string> = {
    en: t("settings.languageEn"),
    de: t("settings.languageDe"),
    es: t("settings.languageEs"),
    fr: t("settings.languageFr"),
    ja: t("settings.languageJa"),
    kk: t("settings.languageKk"),
    ko: t("settings.languageKo"),
    ru: t("settings.languageRu"),
    tr: t("settings.languageTr"),
    uz: t("settings.languageUz"),
    zh: t("settings.languageZh"),
  };

  const languageFlags: Record<AppLanguage, string> = {
    en: "🇬🇧",
    de: "🇩🇪",
    es: "🇪🇸",
    fr: "🇫🇷",
    ja: "🇯🇵",
    kk: "🇰🇿",
    ko: "🇰🇷",
    ru: "🇷🇺",
    tr: "🇹🇷",
    uz: "🇺🇿",
    zh: "🇨🇳",
  };

  const languageFlagUrls: Partial<Record<AppLanguage, string>> = {
    en: ukFlagUrl,
    ru: ruFlagUrl,
    uz: uzbFlagUrl,
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

  const closeActiveModal = () => {
    setActiveModal(null);
    setShowOtherLanguages(false);
  };

  const openLanguageModal = () => {
    setShowOtherLanguages(OTHER_LANGUAGES.includes(currentLanguage as (typeof OTHER_LANGUAGES)[number]));
    setActiveModal("language");
  };

  const selectLanguage = (language: AppLanguage) => {
    void i18n.changeLanguage(language);
    if (initData) {
      setLanguage(initData, language).catch(() => {});
    }
    closeActiveModal();
  };

  const renderLanguageFlag = (language: AppLanguage, size: "sm" | "md" = "md") => {
    const flagUrl = languageFlagUrls[language];
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
        {languageFlags[language] || language}
      </span>
    );
  };

  const renderLanguageButton = (language: AppLanguage) => (
    <Button
      key={language}
      className="h-auto w-full justify-start px-4 py-3 text-left"
      onPress={() => selectLanguage(language)}
      variant={currentLanguage === language ? "primary" : "secondary"}
    >
      {renderLanguageFlag(language)}
      <span className="min-w-0 flex-1 truncate">{languageLabels[language]}</span>
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t("settings.title")}
        </h1>
      </div>

      <Card className="overflow-hidden" variant="default">
        <CardContent className="p-0">
          {status?.user.isAdmin ? (
            <>
              <button
                className="flex w-full items-center justify-between gap-4 pb-3 text-left"
                onClick={() => navigate("/admin")}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--settings-orange)] text-white">
                    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.92a1 1 0 0 1 .5.135l7 4A1 1 0 0 1 20 7.92V12c0 4.82-3.192 9.14-7.767 10.513a1 1 0 0 1-.466 0C7.192 21.14 4 16.82 4 12V7.92a1 1 0 0 1 .5-.865l7-4A1 1 0 0 1 12 2.92Zm0 4.58a2.75 2.75 0 1 0 0 5.5a2.75 2.75 0 0 0 0-5.5Zm0 6.75c-2.254 0-4.133 1.458-4.768 3.48a9.13 9.13 0 0 0 4.768 2.77a9.13 9.13 0 0 0 4.768-2.77c-.635-2.022-2.514-3.48-4.768-3.48Z" />
                    </svg>
                  </span>

                  <div className="min-w-0">
                    <p className="m-0 text-base font-semibold text-[var(--foreground)]">
                      {t("settings.adminPanel")}
                    </p>
                  </div>
                </div>

                <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
              </button>

              <div className="mx-4 h-px bg-[var(--separator)]" />
            </>
          ) : null}

          <button
            className="flex w-full items-center justify-between gap-4 pt-3 pb-3 text-left"
            data-onboarding="settings-theme"
            onClick={() => setActiveModal("theme")}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--settings-green)] text-white">
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
            className="flex w-full items-center justify-between gap-4 pb-3 pt-3 text-left"
            data-onboarding="settings-language"
            onClick={openLanguageModal}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--settings-blue)] text-white">
                <LanguageIcon className="h-5 w-5" />
              </span>

              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-[var(--foreground)]">
                  {t("settings.language")}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
              {renderLanguageFlag(currentLanguage, "sm")}
              <span className="truncate">{languageLabels[currentLanguage]}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
            </div>
          </button>

          <div className="mx-4 h-px bg-[var(--separator)]" />

          <button
            className="flex w-full items-center justify-between gap-4 pt-3 text-left"
            data-onboarding="settings-currency"
            onClick={() => setActiveModal("currency")}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-rose-500/85 text-white">
                <span className="text-base font-bold">{getCurrencySymbol(currency)}</span>
              </span>

              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-[var(--foreground)]">
                  {t("settings.currency")}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
              <span className="truncate">{currency}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
            </div>
          </button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden" variant="default">
        <CardContent className="p-0">
          <button
            className="flex w-full items-center justify-between gap-4 text-left"
            data-onboarding="settings-reset"
            onClick={() => setActiveModal("reset")}
            type="button"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--settings-red)] text-white">
                <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75V5h3.25a.75.75 0 0 1 0 1.5h-.538l-.697 11.168A2.25 2.25 0 0 1 14.77 19.8H9.23a2.25 2.25 0 0 1-2.245-2.132L6.288 6.5H5.75a.75.75 0 0 1 0-1.5H9V3.75Zm1.5 0V5h3V3.75h-3Zm-.5 5.5a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm4.5-.75a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Z" />
                </svg>
              </span>

              <div className="min-w-0">
                <p className="m-0 text-base font-semibold text-[var(--settings-red)]">
                  {t("settings.resetData")}
                </p>
              </div>
            </div>

            <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-70" />
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
          onOpenChange={(nextOpen) => !nextOpen && closeActiveModal()}
          variant="blur"
        >
          <Modal.Container placement="center" size={showOtherLanguages ? "md" : "sm"}>
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
                  {PRIMARY_LANGUAGES.map(renderLanguageButton)}

                  <Button
                    className="w-full"
                    onPress={() => setShowOtherLanguages((isOpen) => !isOpen)}
                    variant="secondary"
                  >
                    {t(showOtherLanguages ? "settings.languageHideOther" : "settings.languageOther")}
                  </Button>

                  {showOtherLanguages ? (
                    <div className="grid max-h-[44vh] gap-3 overflow-y-auto pr-1">
                      {OTHER_LANGUAGES.map(renderLanguageButton)}
                    </div>
                  ) : null}
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop
          isOpen={activeModal === "currency"}
          onOpenChange={(nextOpen) => !nextOpen && setActiveModal(null)}
          variant="blur"
        >
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />

              <Modal.Header>
                <div className="flex flex-col gap-2">
                  <Modal.Heading>{t("settings.currencyModalTitle")}</Modal.Heading>
                  <p className="m-0 text-sm text-[var(--muted)]">
                    {t("settings.currencyModalDescription")}
                  </p>
                </div>
              </Modal.Header>

              <Modal.Body>
                <div className="grid gap-3">
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <Button
                      key={curr}
                      className="w-full"
                      onPress={() => {
                        setCurrency(curr);
                        setActiveModal(null);
                      }}
                      variant={currency === curr ? "primary" : "secondary"}
                    >
                      {t(`settings.currency${curr.charAt(0).toUpperCase() + curr.slice(1).toLowerCase()}`)}
                    </Button>
                  ))}
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={t("settings.resetDataConfirm")}
        description={t("settings.resetDataModalDescription")}
        isOpen={activeModal === "reset"}
        isPending={resetAccountDataMutation.isPending}
        onClose={() => {
          if (!resetAccountDataMutation.isPending) {
            setActiveModal(null);
          }
        }}
        onConfirm={() => {
          void resetAccountDataMutation.mutateAsync().then(() => {
            setActiveModal(null);
          });
        }}
        question={t("settings.resetDataModalQuestion")}
        title={t("settings.resetDataModalTitle")}
      />
    </div>
  );
}
