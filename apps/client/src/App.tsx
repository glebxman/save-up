import { useLocation, Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useEffect, useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { LockScreen } from "@/pages/LockScreen";
import { useStatus } from "@/hooks/useFinance";
import { useLockStore } from "@/stores/lock.store";
import { Spinner } from "@/components/ui";

// Lazy-loaded pages — not needed on initial render.
const Admin = lazy(() => import("@/pages/Admin").then((m) => ({ default: m.Admin })));
const CategoriesSettings = lazy(() => import("@/pages/CategoriesSettings").then((m) => ({ default: m.CategoriesSettings })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const NotificationsSetup = lazy(() => import("@/pages/NotificationsSetup").then((m) => ({ default: m.NotificationsSetup })));
const Report = lazy(() => import("@/pages/Report").then((m) => ({ default: m.Report })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const Welcome = lazy(() => import("@/pages/Welcome").then((m) => ({ default: m.Welcome })));

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

const PageTransition = ({ children }: PropsWithChildren) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.99 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8, scale: 0.99 }}
    transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
  >
    {children}
  </motion.div>
);

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

function App() {
  const location = useLocation();
  const { status } = useStatus();
  const { hasPin, unlocked } = useLockStore();

  // Highest priority: locked → show only the lock screen, regardless of route.
  if (hasPin && !unlocked) {
    return <LockScreen />;
  }

  // Existing users with no notifications setup must complete it before reaching the app.
  // The guard is one-shot per session: once configured, status updates won't kick them back.
  const needsSetup = status ? !status.user.notificationsConfigured : false;
  const isOnSetupPath = ONBOARDING_PATHS.has(location.pathname);

  if (needsSetup && !isOnSetupPath) {
    return <Navigate replace to="/welcome" />;
  }

  if (isOnSetupPath) {
    // Render setup pages without AppShell so they're truly full-screen.
    return (
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait">
          <Routes key={location.pathname} location={location}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/notifications-setup" element={<NotificationsSetup />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="/admin"
            element={
              <PageTransition>
                <Admin />
              </PageTransition>
            }
          />
          <Route
            path="/report"
            element={
              <PageTransition>
                <Report />
              </PageTransition>
            }
          />
          <Route
            path="/settings"
            element={
              <PageTransition>
                <Settings />
              </PageTransition>
            }
          />
          <Route
            path="/settings/categories"
            element={
              <PageTransition>
                <CategoriesSettings />
              </PageTransition>
            }
          />
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
      </Suspense>
      <OfflineBanner />
    </AppShell>
  );
}

export default App;
