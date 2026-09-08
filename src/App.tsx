import { useState, type JSX } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LiftAuthProvider } from "./context/LiftAuthContext";
import { EnergyUnitProvider } from "./context/EnergyUnitContext";
import LoginScreen from "./components/Auth/LoginScreen";
import LogTab from "./components/Log/LogTab";
import TrendsTab from "./components/Trends/TrendsTab";
import FoodsTab from "./components/Foods/FoodsTab";
import SettingsTab from "./components/Settings/SettingsTab";
import QuickAddModal from "./components/QuickAddModal";
import { IconLog, IconTrends, IconFoods, IconSettings, IconPlus } from "./components/icons";
import { getStoredUnitSystem, setStoredUnitSystem, type UnitSystem } from "./lib/units";
import { getStoredWaterTarget, setStoredWaterTarget } from "./lib/waterTarget";
import { todayStr } from "./lib/dates";
import type { Meal } from "./lib/types";

type Tab = "log" | "trends" | "foods" | "settings";

const TABS: { key: Tab; label: string; Icon: (props: { className?: string }) => JSX.Element }[] = [
  { key: "log", label: "Log", Icon: IconLog },
  { key: "trends", label: "Progress", Icon: IconTrends },
  { key: "foods", label: "Foods", Icon: IconFoods },
  { key: "settings", label: "Settings", Icon: IconSettings },
];

function AppShell() {
  const [tab, setTab] = useState<Tab>("log");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(getStoredUnitSystem());
  const [waterTarget, setWaterTarget] = useState(getStoredWaterTarget());
  const [logDate, setLogDate] = useState(todayStr());
  const [modalMeal, setModalMeal] = useState<Meal | null>(null);

  function handleUnitSystemChange(u: UnitSystem) {
    setUnitSystem(u);
    setStoredUnitSystem(u);
  }

  function handleWaterTargetChange(litres: number) {
    setWaterTarget(litres);
    setStoredWaterTarget(litres);
  }

  function handleQuickAdd() {
    // Just open the food search overlay - stay on whatever tab the user is
    // currently viewing instead of yanking them to Log.
    setModalMeal("breakfast");
  }

  return (
    <div className="app-shell">
      <div className="status-bar-fill" aria-hidden="true" />
      <main className="app-main">
        {tab === "log" && (
          <LogTab
            date={logDate}
            onDateChange={setLogDate}
            modalMeal={modalMeal}
            onModalMealChange={setModalMeal}
            waterTarget={waterTarget}
            onGoToTrends={() => setTab("trends")}
          />
        )}
        {tab === "trends" && <TrendsTab unitSystem={unitSystem} />}
        {tab === "foods" && <FoodsTab />}
        {tab === "settings" && (
          <SettingsTab
            unitSystem={unitSystem}
            onUnitSystemChange={handleUnitSystemChange}
            waterTarget={waterTarget}
            onWaterTargetChange={handleWaterTargetChange}
          />
        )}
      </main>

      <div className="bottom-bar">
        <nav className="tab-nav-inner">
          <div
            className="tab-nav-indicator"
            style={{ transform: `translateX(${TABS.findIndex((t) => t.key === tab) * 58}px)` }}
          />
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "active" : ""}
              onClick={() => setTab(t.key)}
              aria-label={t.label}
              title={t.label}
            >
              <t.Icon />
            </button>
          ))}
        </nav>
        <button className="quick-add-fab" onClick={handleQuickAdd} aria-label="Quick add">
          <IconPlus className="icon" />
        </button>
      </div>

      {tab !== "log" && modalMeal && (
        <QuickAddModal initialMeal={modalMeal} onClose={() => setModalMeal(null)} />
      )}
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
      <LiftAuthProvider>
        <EnergyUnitProvider>
          <Gate />
        </EnergyUnitProvider>
      </LiftAuthProvider>
    </AuthProvider>
  );
}
