import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginScreen from "./components/Auth/LoginScreen";
import LogTab from "./components/Log/LogTab";
import TrendsTab from "./components/Trends/TrendsTab";
import FoodsTab from "./components/Foods/FoodsTab";
import SettingsTab from "./components/Settings/SettingsTab";
import { getStoredUnitSystem, setStoredUnitSystem, type UnitSystem } from "./lib/units";

type Tab = "log" | "trends" | "foods" | "settings";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "log", label: "Log", icon: "📝" },
  { key: "trends", label: "Trends", icon: "📈" },
  { key: "foods", label: "Foods", icon: "🍎" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

function AppShell() {
  const [tab, setTab] = useState<Tab>("log");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(getStoredUnitSystem());

  function handleUnitSystemChange(u: UnitSystem) {
    setUnitSystem(u);
    setStoredUnitSystem(u);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          bite<span>track</span>
        </div>
      </header>

      <main className="app-main">
        {tab === "log" && <LogTab unitSystem={unitSystem} />}
        {tab === "trends" && <TrendsTab unitSystem={unitSystem} />}
        {tab === "foods" && <FoodsTab />}
        {tab === "settings" && (
          <SettingsTab unitSystem={unitSystem} onUnitSystemChange={handleUnitSystemChange} />
        )}
      </main>

      <nav className="tab-nav">
        <div className="tab-nav-inner">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spinner" />
      </div>
    );
  }

  return session ? <AppShell /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
