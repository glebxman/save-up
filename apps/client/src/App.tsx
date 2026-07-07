import { useLocation, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { Debts } from "@/pages/Debts";
import { LockScreen } from "@/pages/LockScreen";
import { Report } from "@/pages/Report";
import { Settings } from "@/pages/Settings";
import { useStatus } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { useLockStore } from "@/stores/lock.store";
import { Spinner } from "@/components/ui";

// Lazy-loaded pages — not needed on initial render.
const Admin = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.Admin })));
const CategoriesSettings = lazy(() => import("@/pages/CategoriesSettings").then((m) => ({ default: m.CategoriesSettings })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const NotificationsSetup = lazy(() => import("@/pages/NotificationsSetup").then((m) => ({ default: m.NotificationsSetup })));
const Subscription = lazy(() => import("@/pages/Subscription").then((m) => ({ default: m.Subscription })));
const Welcome = lazy(() => import("@/pages/Welcome").then((m) => ({ default: m.Welcome })));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

const APP_ROUTES: readonly { path: string; element: ReactNode }[] = [
  { path: "/", element: <Dashboard /> },
  { path: "/admin", element: <Admin /> },
  { path: "/report", element: <Report /> },
  { path: "/debts", element: <Debts /> },
  { path: "/settings", element: <Settings /> },
  { path: "/settings/categories", element: <CategoriesSettings /> },
  { path: "/subscription", element: <Subscription /> },
  { path: "*", element: <NotFound /> },
];

function OfflineBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-[var(--warning)] px-4 py-2 text-sm font-medium text-white">
      <span>📡</span>
      <span>{t("common.offline")}</span>
    </div>
  );
}

const ONBOARDING_PATHS = new Set(["/welcome", "/notifications-setup"]);
const SUBSCRIPTION_LOCKED_PATHS = new Set(["/debts", "/settings/categories"]);

function App() {
  const location = useLocation();
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const { status, statusQuery } = useStatus();
  const { hasPin, unlocked } = useLockStore();

  if (!initData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
        <div className="max-w-md space-y-3">
          <h1 className="m-0 text-2xl font-semibold tracking-normal">
            {t("dashboard.errorTitle")}
          </h1>
          <p className="m-0 text-sm leading-relaxed text-[var(--muted)]">
            {t("dashboard.openInTelegram", {
              defaultValue: "Open this mini app inside Telegram so it can pass Telegram initData.",
            })}
          </p>
        </div>
      </div>
    );
  }

  // Highest priority: locked → show only the lock screen, regardless of route.
  if (hasPin && !unlocked) {
    return <LockScreen />;
  }

  // If user status is loading, wait to prevent flashing / unauthorized routing.
  if (statusQuery.isPending && !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Spinner size="md" />
      </div>
    );
  }

  // If user status load failed (e.g. maintenance mode is on).
  if (statusQuery.isError) {
    const errorMsg = statusQuery.error?.message || "Технические работы. Пожалуйста, зайдите позже.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6 text-center text-white font-sans">
        <div className="max-w-md space-y-4">
          <div className="text-6xl animate-pulse">🔧</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Технические работы
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  const needsSetup = status ? !status.user.notificationsConfigured : false;
  const isOnSetupPath = ONBOARDING_PATHS.has(location.pathname);

  if (needsSetup && !isOnSetupPath) {
    return <Navigate replace to="/welcome" />;
  }

  if (isOnSetupPath) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Routes location={location}>
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/notifications-setup" element={<NotificationsSetup />} />
        </Routes>
      </Suspense>
    );
  }

  const hasSubscriptionAccess = !!status?.user.isAdmin || !!status?.user.subscription.active;
  if (status && SUBSCRIPTION_LOCKED_PATHS.has(location.pathname) && !hasSubscriptionAccess) {
    return <Navigate replace to="/subscription" />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes location={location}>
          {APP_ROUTES.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Routes>
      </Suspense>
      <OfflineBanner />
    </AppShell>
  );
}

export default App;
