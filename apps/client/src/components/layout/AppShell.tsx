import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { ToastViewport } from "@/components/feedback/ToastViewport";
import { OnboardingOverlay } from "@/components/features/onboarding/OnboardingOverlay";
import { Avatar, Button } from "@/components/ui";
import { useTelegram } from "@/hooks/useTelegram";
import { DashboardIcon, ReportIcon, SettingsIcon } from "./icons";
import { MenuIcon, SearchIcon } from "./icons";

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useTelegram();
  const firstName = user?.first_name || user?.username || t("common.defaultUser");
  const AVATAR_URL = user?.photo_url || "https://api.dicebear.com/9.x/initials/svg?seed=Save%20Up";
  const navItems = [
    { icon: DashboardIcon, label: t("shell.nav.dashboard"), href: "/" },
    { icon: ReportIcon, label: t("shell.nav.report"), href: "/report" },
    { icon: SettingsIcon, label: t("shell.nav.settings"), href: "/settings" },
  ] as const;

  return (
    <div className="finance-app-shell">
      <div className="finance-shell-frame mx-auto flex min-h-screen w-full max-w-[980px] flex-col px-4 pt-[var(--app-top-padding)] md:px-6 xl:px-8">
        <header className="mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 ring-2 [box-shadow:0_0_0_2px_var(--avatar-ring)]">
              <Avatar.Image src={AVATAR_URL} />
            </Avatar>

            <div className="min-w-0 space-y-1">
              <p className="m-0 text-[18px] font-medium tracking-[-0.03em] text-[var(--muted)]">
                {t("shell.welcomeBack")}
              </p>
              <h1 className="m-0 truncate text-[2rem] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--foreground)]">
                {t("shell.greeting", { name: firstName })}
              </h1>
            </div>
          </div>
        </header>

        <main className="finance-main flex-1">{children}</main>
      </div>

      <div className="finance-bottom-nav-wrap">
        <nav className="finance-bottom-nav flex items-center gap-2 rounded-full px-2.5 py-2.5">
          {navItems.map(({ href, icon: Icon }) => {
            const isActive =
              href === "/"
                ? location.pathname === href
                : location.pathname.startsWith(href);

            return (
              <Button
                key={href}
                className="finance-nav-button flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-full px-3 py-2"
                data-active={isActive}
                onPress={() => navigate(href)}
                variant={isActive ? "primary" : "secondary"}
              >
                <Icon className="h-5 w-5" />
              </Button>
            );
          })}
        </nav>
      </div>

      <ToastViewport />
      <OnboardingOverlay />
    </div>
  );
}
