import { Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { Admin } from "@/pages/Admin";
import { Dashboard } from "@/pages/Dashboard";
import { NotFound } from "@/pages/NotFound";
import { Report } from "@/pages/Report";
import { Settings } from "@/pages/Settings";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppShell>
  );
}

export default App;
