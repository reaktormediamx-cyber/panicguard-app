import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Store,
  Monitor,
  Settings,
  Radio,
  Users,
  LogOut,
  UserCheck,
  Building,
  KeyRound,
  LayoutDashboard,
  Building2,
  ChevronDown
} from "lucide-react";
import { StoreMetadata, DEFAULT_STORE } from "./types.js";
import { MerchantTerminal } from "./components/merchant/MerchantTerminal.js";
import { MonitoringDashboard } from "./components/dashboard/MonitoringDashboard.js";
import { MasterAdminDashboard } from "./components/superadmin/MasterAdminDashboard.js";
import { StoreConfigModal } from "./components/store/StoreConfigModal.js";
import { TerminalManagerModal } from "./components/admin/TerminalManagerModal.js";
import { AuthModal } from "./components/auth/AuthModal.js";
import { useSocketAlerts } from "./hooks/useSocketAlerts.js";
import { useAuth } from "./context/AuthContext.js";

export default function App() {
  const { appUser, isLoading, logout, terminals, centrales } = useAuth();
  const [store, setStore] = useState<StoreMetadata>(DEFAULT_STORE);
  const [isStoreConfigOpen, setIsStoreConfigOpen] = useState<boolean>(false);
  const [isTerminalManagerOpen, setIsTerminalManagerOpen] = useState<boolean>(false);

  // Active View mode: MASTER_ADMIN, CENTRAL, TERMINAL
  const [currentView, setCurrentView] = useState<"MASTER_ADMIN" | "CENTRAL" | "TERMINAL">("CENTRAL");

  const {
    alerts,
    isConnected,
    activeEmergencyModalAlert,
    setActiveEmergencyModalAlert,
    isAudioAlarmActive,
    acknowledgeAlarmSound,
    updateAlertStatus,
    deleteAlert,
  } = useSocketAlerts();

  // Set current view on global window for socket alert sound filtering
  useEffect(() => {
    (window as any).__panicGuardView = currentView;
  }, [currentView]);

  // Super Admin view: Silent mode & no emergency popup modal window
  useEffect(() => {
    if (currentView === "MASTER_ADMIN") {
      if (isAudioAlarmActive) {
        acknowledgeAlarmSound();
      }
      if (activeEmergencyModalAlert) {
        setActiveEmergencyModalAlert(null);
      }
    }
  }, [currentView, isAudioAlarmActive, activeEmergencyModalAlert, acknowledgeAlarmSound, setActiveEmergencyModalAlert]);
  useEffect(() => {
    if (appUser) {
      if (appUser.role === "SUPER_ADMIN") {
        // Super admin can be anywhere
      } else if (appUser.role === "CENTRAL" || appUser.role === "ADMIN") {
        // Central cannot access MASTER_ADMIN or TERMINAL view under any circumstances
        if (currentView === "MASTER_ADMIN" || currentView === "TERMINAL") {
          setCurrentView("CENTRAL");
        }
      } else {
        // Terminal role can ONLY access TERMINAL view under any circumstances
        if (currentView !== "TERMINAL") {
          setCurrentView("TERMINAL");
        }
      }
    }
  }, [appUser?.role, currentView]);

  // Set default view on user login
  useEffect(() => {
    if (appUser) {
      if (appUser.role === "SUPER_ADMIN") {
        setCurrentView("MASTER_ADMIN");
      } else if (appUser.role === "CENTRAL" || appUser.role === "ADMIN") {
        setCurrentView("CENTRAL");
      } else {
        setCurrentView("TERMINAL");
      }
    }
  }, [appUser?.role]);

  // Sync store settings if current user has a customized store registered
  useEffect(() => {
    if (appUser && (appUser.role === "TERMINAL" || currentView === "TERMINAL")) {
      const match = terminals.find(t => (t?.email || "").toLowerCase() === (appUser.email || "").toLowerCase());
      if (match) {
        setStore({
          storeId: match.storeId,
          storeName: match.storeName,
          ownerName: match.ownerName,
          phone: match.phone,
          address: match.address,
          city: match.city,
          category: match.category,
          coordinates: match.coordinates,
          centralId: match.centralId,
          centralName: match.centralName,
        });
      } else if (appUser.storeName) {
        setStore(prev => ({
          ...prev,
          storeId: appUser.storeId || prev.storeId,
          storeName: appUser.storeName || prev.storeName,
          centralId: appUser.centralId || prev.centralId,
          centralName: appUser.centralName || prev.centralName,
        }));
      }
    }
  }, [appUser, terminals, currentView]);

  // Resolve assigned account name for prominent header display
  const activeAccountName = React.useMemo(() => {
    if (!appUser) return "";
    if (appUser.role === "SUPER_ADMIN" || currentView === "MASTER_ADMIN") {
      return "Super Admin Matriz";
    }
    if (currentView === "CENTRAL" || appUser.role === "CENTRAL") {
      const centralMatch = centrales.find(c => (c.email || "").toLowerCase() === (appUser.email || "").toLowerCase() || c.id === appUser.centralId);
      return centralMatch?.name || appUser.centralName || appUser.displayName || appUser.storeName || "Central de Monitoreo";
    }
    if (currentView === "TERMINAL" || appUser.role === "TERMINAL") {
      const terminalMatch = terminals.find(t => (t.email || "").toLowerCase() === (appUser.email || "").toLowerCase());
      return store.storeName || terminalMatch?.storeName || appUser.storeName || appUser.displayName || "Terminal Comercial";
    }
    return appUser.displayName || appUser.email;
  }, [appUser, centrales, terminals, store.storeName, currentView]);

  const activeAlertsCount = alerts.filter((a) => a.status === "ACTIVE").length;

  // Show loading spinner while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 animate-pulse">
          <ShieldAlert className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-mono text-slate-400">Verificando sesión en PanicGuard Firebase...</p>
      </div>
    );
  }

  // If no user is logged in, present role-aware AuthModal (Master PIN, Google OAuth, Email/Pass)
  if (!appUser) {
    return <AuthModal />;
  }

  const isSuperAdmin = appUser.role === "SUPER_ADMIN";
  const isPrivileged = appUser.role === "SUPER_ADMIN" || appUser.role === "CENTRAL" || appUser.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Navigation Bar with View Switcher */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-md">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Current Role Status */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              currentView === "MASTER_ADMIN"
                ? "bg-gradient-to-br from-red-600 via-red-700 to-slate-950 shadow-red-950"
                : currentView === "CENTRAL" 
                ? "bg-gradient-to-br from-red-600 to-red-800 shadow-red-950"
                : "bg-gradient-to-br from-blue-600 to-blue-800 shadow-blue-950"
            }`}>
              {currentView === "MASTER_ADMIN" ? (
                <ShieldAlert className="w-5 h-5" />
              ) : currentView === "CENTRAL" ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black tracking-tight text-white font-sans">
                  PANIC<span className="text-red-500">GUARD</span>
                </span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border font-bold ${
                  currentView === "MASTER_ADMIN"
                    ? "bg-red-950/90 border-red-700 text-red-300"
                    : currentView === "CENTRAL"
                    ? "bg-red-950/80 border-red-800/50 text-red-300"
                    : "bg-blue-950/80 border-blue-800/50 text-blue-300"
                }`}>
                  {currentView === "MASTER_ADMIN"
                    ? "SUPER ADMIN"
                    : currentView === "CENTRAL"
                    ? "CENTRAL C4/C5"
                    : "TERMINAL"}
                </span>

                {/* Account Name Identification Badge */}
                <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-xs shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Cuenta:</span>
                  <span className="text-amber-300 font-bold max-w-[180px] sm:max-w-[320px] truncate">
                    {activeAccountName}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                {currentView === "MASTER_ADMIN"
                  ? "Panel General de Centrales, Terminales en Tiempo Real y Estadísticas"
                  : currentView === "CENTRAL"
                  ? `Consola Operativa Asignada: ${activeAccountName}`
                  : `Terminal Comercial Asignada: ${activeAccountName} (${store.storeId})`}
              </p>
            </div>
          </div>



          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {isPrivileged && (
              <button
                id="btn-admin-terminals"
                onClick={() => setIsTerminalManagerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all"
                title="Dar de alta roles y terminales con cuentas de Google"
              >
                <Users className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden lg:inline">Gestión Rápida</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300">
                  {terminals.length}
                </span>
              </button>
            )}

            {currentView === "TERMINAL" && (
              <button
                onClick={() => setIsStoreConfigOpen(true)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Configurar Datos de Comercio"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-sm">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-amber-300 max-w-[160px] truncate leading-tight">
                  {activeAccountName}
                </span>
                <span className="text-[10px] text-slate-400 max-w-[160px] truncate font-mono">
                  {appUser.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-400 hover:border-red-800 border border-slate-700 text-slate-400 transition-all cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area with Full Capability Switching */}
      <main className="flex-1 py-6">
        {currentView === "MASTER_ADMIN" && (
          <MasterAdminDashboard
            alerts={alerts}
            isConnected={isConnected}
            activeEmergencyModalAlert={activeEmergencyModalAlert}
            setActiveEmergencyModalAlert={setActiveEmergencyModalAlert}
            isAudioAlarmActive={isAudioAlarmActive}
            acknowledgeAlarmSound={acknowledgeAlarmSound}
            updateAlertStatus={updateAlertStatus}
          />
        )}

        {currentView === "CENTRAL" && (
          <MonitoringDashboard
            alerts={appUser && appUser.role !== "SUPER_ADMIN" && appUser.centralId
              ? alerts.filter((a) => a.centralId === appUser.centralId || a.store?.centralId === appUser.centralId)
              : alerts
            }
            isConnected={isConnected}
            activeEmergencyModalAlert={activeEmergencyModalAlert}
            setActiveEmergencyModalAlert={setActiveEmergencyModalAlert}
            isAudioAlarmActive={isAudioAlarmActive}
            acknowledgeAlarmSound={acknowledgeAlarmSound}
            updateAlertStatus={updateAlertStatus}
            deleteAlert={deleteAlert}
          />
        )}

        {currentView === "TERMINAL" && (
          <MerchantTerminal
            store={store}
            onOpenStoreConfig={() => setIsStoreConfigOpen(true)}
          />
        )}
      </main>

      {/* Store Settings Modal (For Terminals) */}
      <StoreConfigModal
        currentStore={store}
        isOpen={isStoreConfigOpen}
        onClose={() => setIsStoreConfigOpen(false)}
        onSave={(newStore) => setStore(newStore)}
      />

      {/* Terminal Management Modal (For Privileged Roles) */}
      {isPrivileged && (
        <TerminalManagerModal
          isOpen={isTerminalManagerOpen}
          onClose={() => setIsTerminalManagerOpen(false)}
        />
      )}

      {/* Modern Tactical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Base de Datos PanicGuard Firebase Firestore Conectada (panic-guard-e858d)</span>
        </div>
        <div>
          Rol: <span className="text-slate-300 font-bold">{appUser.role}</span> | Vista: <span className="text-slate-400 font-bold">{currentView}</span> | Usuario: <span className="text-slate-400">{appUser.email}</span>
        </div>
      </footer>
    </div>
  );
}
