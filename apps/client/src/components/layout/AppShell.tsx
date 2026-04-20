import type { PropsWithChildren } from "react";
import { Avatar, Button, Card, CardContent } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useTelegram } from "@/hooks/useTelegram";
import { BellIcon, DashboardIcon, ReportIcon, SettingsIcon } from "./icons";

function getInitials(name?: string): string {
  if (!name) {
    return "SU";
  }

  return name.slice(0, 2).toUpperCase();
}

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
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-1 ring-[rgba(190,255,102,0.28)]">
                <Avatar.Image src={AVATAR_URL} />
              </Avatar>
            </div>

            <div>
              <p className="m-0 text-lg font-semibold text-[var(--foreground)]">{t("shell.greeting", { name: firstName })}</p>
              <p className="m-0 text-sm text-[var(--muted)]">{t("shell.welcomeBack")}</p>
            </div>
          </div>
        </header>

        <main className="finance-main flex-1">{children}</main>
      </div>

      <div className="finance-bottom-nav-wrap">
        <Card className="finance-bottom-nav rounded-full" variant="transparent">
          <CardContent>
            <div className="flex items-center gap-2">
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive =
                  href === "/"
                    ? location.pathname === href
                    : location.pathname.startsWith(href);

                return (
                  <Button
                    key={href}
                    aria-label={label}
                    className="finance-nav-button h-14 w-14 min-w-0 rounded-full p-0"
                    data-active={isActive}
                    onPress={() => navigate(href)}
                    variant={isActive ? "primary" : "secondary"}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
