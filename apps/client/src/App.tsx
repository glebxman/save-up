import { useLocation, Route, Routes } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { Admin } from "@/pages/Admin";
import { Dashboard } from "@/pages/Dashboard";
import { NotFound } from "@/pages/NotFound";
import { Report } from "@/pages/Report";
import { Settings } from "@/pages/Settings";

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

function App() {
  const location = useLocation();

  return (
    <AppShell>
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
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </AppShell>
  );
}

export default App;

