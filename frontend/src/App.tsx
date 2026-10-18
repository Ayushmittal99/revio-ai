import { Route, Routes } from "react-router-dom";
import { DataProvider } from "./hooks/DataContext";
import AppLayout from "./layouts/AppLayout";
import Analyze from "./pages/Analyze";
import Explorer from "./pages/Explorer";
import Insights from "./pages/Insights";
import Overview from "./pages/Overview";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="explorer" element={<Explorer />} />
          <Route path="insights" element={<Insights />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
