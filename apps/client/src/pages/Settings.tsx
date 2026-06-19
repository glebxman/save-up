import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { SecurityModal } from "@/components/features/security/SecurityModal";
import { LANGUAGE_FLAG_URLS, LANGUAGE_FLAGS } from "@/components/features/settings/languageMeta";
import { CurrencyModal } from "@/components/features/settings/modals/CurrencyModal";
import {
  LanguageFlag,
  LanguageModal,
} from "@/components/features/settings/modals/LanguageModal";
import { ThemeModal } from "@/components/features/settings/modals/ThemeModal";
import { SettingsRow } from "@/components/features/settings/SettingsRow";
import { SettingsSection } from "@/components/features/settings/SettingsSection";
import {
  BellIcon,
  ChatBubbleLeftRightIcon,
  CreditCardIcon,
  LanguageIcon,
  LockClosedIcon,
  TagIcon,
  ThemeIcon,
} from "@/components/layout/icons";
import { Button } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import { useCurrency } from "@/hooks/useCurrency";
import { useTelegram } from "@/hooks/useTelegram";
import { useLockStore } from "@/stores/lock.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import i18n, { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n";
import { useTheme } from "@/providers/ThemeProvider";
import { getCurrencySymbol } from "@/utils/format";

type ActiveModal = "theme" | "language" | "currency" | "reset" | null;
const SUPPORT_URL = "https://t.me/saveup_support";

/**
 * The Settings landing page is intentionally light: it groups a handful of
 * single-purpose rows into themed sections. Each row jumps to either a modal
 * (for quick toggles) or a dedicated screen (for content-heavy editors like
 * Categories).
 */
export function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const { theme, resolvedTheme } = useTheme();
  const {
    status,
    refreshRatesMutation,
    resetAccountDataMutation,
  } = useFinance();
  const { currency } = useCurrency();
  const restartOnboarding = useOnboardingStore((s) => s.restart);
  const hasPin = useLockStore((s) => s.hasPin);
  const biometricsEnabled = useLockStore((s) => s.biometricsEnabled);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const resolvedLang = (i18n.resolvedLanguage ?? "en").slice(0, 2) as AppLanguage;
  const currentLanguage: AppLanguage = SUPPORTED_LANGUAGES.includes(resolvedLang)
    ? resolvedLang
    : "en";

  const themeLabel = t(`settings.theme${theme.charAt(0).toUpperCase()}${theme.slice(1)}`);
  const themeSummary =
    theme === "auto"
      ? t("settings.themeAutoResolved", {
          mode: t("settings.themeAuto"),
          theme: t(
            `settings.theme${resolvedTheme.charAt(0).toUpperCase()}${resolvedTheme.slice(1)}`,
          ),
        })
      : themeLabel;

  const languageLabel = t(
    `settings.language${currentLanguage.charAt(0).toUpperCase()}${currentLanguage.slice(1)}`,
  );
  const hasSubscriptionAccess = !!status?.user.isAdmin || !!status?.user.subscription.active;

  const openSupport = () => {
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(SUPPORT_URL);
      return;
    }

    window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6 pb-2">
      <div>
        <h1 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {t("settings.title")}
        </h1>
      </div>

      {/* Appearance — theme, language, currency */}
      <SettingsSection title={t("settings.sectionAppearance")}>
        <SettingsRow
          dataOnboarding="settings-theme"
          icon={ThemeIcon}
          iconBg="bg-[var(--settings-green)]"
          onPress={() => setActiveModal("theme")}
          title={t("settings.theme")}
          value={themeSummary}
        />
        <SettingsRow
          dataOnboarding="settings-language"
          icon={LanguageIcon}
          iconBg="bg-[var(--settings-blue)]"
          onPress={() => setActiveModal("language")}
          title={t("settings.language")}
          value={
            <span className="flex items-center gap-2">
              <LanguageFlag language={currentLanguage} size="sm" />
              <span className="truncate">{languageLabel}</span>
            </span>
          }
        />
        <SettingsRow
          dataOnboarding="settings-currency"
          iconBg="bg-rose-500/85"
          iconSlot={<span className="text-sm font-bold">{getCurrencySymbol(currency)}</span>}
          onPress={() => setActiveModal("currency")}
          title={t("settings.currency")}
          value={currency}
        />
      </SettingsSection>

      {/* Privacy & notifications */}
      <SettingsSection title={t("settings.sectionPrivacy")}>
        <SettingsRow
          dataOnboarding="settings-notifications"
          icon={BellIcon}
          iconBg="bg-amber-500/85"
          onPress={() => navigate("/notifications-setup")}
          title={t("settings.notifications")}
          value={
            status?.user.notificationsEnabled
              ? t("settings.notificationsOn")
              : t("settings.notificationsOff")
          }
        />
        <SettingsRow
          dataOnboarding="settings-security"
          icon={LockClosedIcon}
          iconBg="bg-indigo-500/85"
          onPress={() => setShowSecurityModal(true)}
          title={t("settings.security")}
          value={
            hasPin
              ? biometricsEnabled
                ? t("settings.securityPinAndBio")
                : t("settings.securityOn")
              : t("settings.securityOff")
          }
        />
      </SettingsSection>

      {/* Categories — full editor lives on a dedicated screen */}
      <SettingsSection title={t("settings.sectionContent")}>
        <SettingsRow
          icon={CreditCardIcon}
          iconBg="bg-emerald-500/85"
          onPress={() => navigate("/subscription")}
          title={t("settings.subscription")}
          description={t("settings.subscriptionDescription")}
          value={
            status?.user.subscription.active
              ? t("subscription.unlocked")
              : t("subscription.locked")
          }
        />
        <SettingsRow
          dataOnboarding="settings-categories"
          icon={hasSubscriptionAccess ? TagIcon : LockClosedIcon}
          iconBg="bg-pink-500/85"
          onPress={() => navigate(hasSubscriptionAccess ? "/settings/categories" : "/subscription")}
          title={t("settings.categories")}
          description={t("settings.categoriesDescription")}
          value={!hasSubscriptionAccess ? t("subscription.locked") : undefined}
        />
        <SettingsRow
          iconBg="bg-[var(--surface-tertiary)]"
          iconColor="text-[var(--foreground)]"
          iconSlot={
            <svg
              aria-hidden="true"
              className={`h-4 w-4 ${refreshRatesMutation.isPending ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          title={t("settings.exchangeRates")}
          description={
            status?.ratesUpdatedAt
              ? new Date(status.ratesUpdatedAt).toLocaleString(i18n.language, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "..."
          }
          trailing={
            <Button
              className="h-8 min-h-0 px-3 text-xs"
              isDisabled={refreshRatesMutation.isPending}
              onPress={() => refreshRatesMutation.mutate()}
              size="sm"
              variant="secondary"
            >
              {t("settings.refresh")}
            </Button>
          }
        />
      </SettingsSection>

      {/* Help & onboarding */}
      <SettingsSection title={t("settings.sectionHelp")}>
        <SettingsRow
          icon={ChatBubbleLeftRightIcon}
          iconBg="bg-sky-500/85"
          onPress={openSupport}
          title={t("settings.support")}
          description={t("settings.supportDescription")}
        />
        <SettingsRow
          iconBg="bg-[var(--settings-blue)]"
          iconSlot={
            <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.555 7.168A1 1 0 0 0 8 8v4a1 1 0 0 0 1.555.832l3-2a1 1 0 0 0 0-1.664l-3-2Z"
                fillRule="evenodd"
              />
            </svg>
          }
          onPress={() => {
            navigate("/");
            restartOnboarding();
          }}
          title={t("settings.restartTutorial")}
          description={t("settings.restartTutorialDescription")}
        />
      </SettingsSection>

      {/* Account & destructive actions, intentionally last */}
      <SettingsSection title={t("settings.sectionAccount")}>
        {status?.user.isAdmin ? (
          <SettingsRow
            iconBg="bg-[var(--settings-orange)]"
            iconSlot={
              <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.92a1 1 0 0 1 .5.135l7 4A1 1 0 0 1 20 7.92V12c0 4.82-3.192 9.14-7.767 10.513a1 1 0 0 1-.466 0C7.192 21.14 4 16.82 4 12V7.92a1 1 0 0 1 .5-.865l7-4A1 1 0 0 1 12 2.92Zm0 4.58a2.75 2.75 0 1 0 0 5.5a2.75 2.75 0 0 0 0-5.5Zm0 6.75c-2.254 0-4.133 1.458-4.768 3.48a9.13 9.13 0 0 0 4.768 2.77a9.13 9.13 0 0 0 4.768-2.77c-.635-2.022-2.514-3.48-4.768-3.48Z" />
              </svg>
            }
            onPress={() => navigate("/admin")}
            title={t("settings.adminPanel")}
          />
        ) : null}
        <SettingsRow
          dataOnboarding="settings-reset"
          destructive
          iconBg="bg-[var(--settings-red)]"
          iconSlot={
            <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 3.75A.75.75 0 0 1 9.75 3h4.5a.75.75 0 0 1 .75.75V5h3.25a.75.75 0 0 1 0 1.5h-.538l-.697 11.168A2.25 2.25 0 0 1 14.77 19.8H9.23a2.25 2.25 0 0 1-2.245-2.132L6.288 6.5H5.75a.75.75 0 0 1 0-1.5H9V3.75Zm1.5 0V5h3V3.75h-3Zm-.5 5.5a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0v-6Zm4.5-.75a.75.75 0 0 0-.75.75v6a.75.75 0 0 0 1.5 0v-6a.75.75 0 0 0-.75-.75Z" />
            </svg>
          }
          onPress={() => setActiveModal("reset")}
          title={t("settings.resetData")}
        />
      </SettingsSection>

      <ThemeModal isOpen={activeModal === "theme"} onClose={() => setActiveModal(null)} />
      <LanguageModal
        currentLanguage={currentLanguage}
        isOpen={activeModal === "language"}
        onClose={() => setActiveModal(null)}
      />
      <CurrencyModal isOpen={activeModal === "currency"} onClose={() => setActiveModal(null)} />

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={t("settings.resetDataConfirm")}
        description={t("settings.resetDataModalDescription")}
        isOpen={activeModal === "reset"}
        isPending={resetAccountDataMutation.isPending}
        onClose={() => {
          if (!resetAccountDataMutation.isPending) setActiveModal(null);
        }}
        onConfirm={() => {
          void resetAccountDataMutation.mutateAsync().then(() => setActiveModal(null));
        }}
        question={t("settings.resetDataModalQuestion")}
        title={t("settings.resetDataModalTitle")}
      />

      <SecurityModal isOpen={showSecurityModal} onClose={() => setShowSecurityModal(false)} />
    </div>
  );
}
