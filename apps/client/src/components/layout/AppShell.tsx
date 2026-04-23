import type { PropsWithChildren } from "react";
import { Avatar, Button } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { ToastViewport } from "@/components/feedback/ToastViewport";
import { useTelegram } from "@/hooks/useTelegram";
import { DashboardIcon, ReportIcon, SettingsIcon } from "./icons";

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useTelegram();
  const firstName = user?.first_name || user?.username || t("common.defaultUser");
  const AVATAR_URL = user?.photo_url || "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg";
  const navItems = [
    { icon: DashboardIcon, label: t("shell.nav.dashboard"), href: "/" },
    { icon: ReportIcon, label: t("shell.nav.report"), href: "/report" },
    { icon: SettingsIcon, label: t("shell.nav.settings"), href: "/settings" },
  ] as const;

  return (
    <div className="finance-app-shell">
      <div className="finance-shell-frame mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-4 pt-[calc(20px+var(--safe-top))]">
        <header className="mb-5 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <Avatar.Image src={AVATAR_URL} />
          </Avatar>

          <div>
            <p className="m-0 text-base font-semibold text-[var(--foreground)]">{t("shell.greeting", { name: firstName })}</p>
            <p className="m-0 text-xs text-[var(--muted)]">{t("shell.welcomeBack")}</p>
          </div>
        </header>

        <main className="finance-main flex-1">{children}</main>
      </div>

      <div className="finance-bottom-nav-wrap">
        <nav className="finance-bottom-nav flex items-center gap-1 rounded-full px-2 py-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === "/"
                ? location.pathname === href
                : location.pathname.startsWith(href);

            return (
              <Button
                key={href}
                aria-label={label}
                className="finance-nav-button flex h-14 min-w-[72px] flex-col items-center justify-center gap-1 rounded-full px-3 py-2"
                data-active={isActive}
                onPress={() => navigate(href)}
                variant={isActive ? "primary" : "secondary"}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      <ToastViewport />
    </div>
  );
}
