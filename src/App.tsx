import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Shield,
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
  ChevronDown,
  Smartphone,
} from "lucide-react";
import { StoreMetadata, DEFAULT_STORE } from "./types.js";
import { MerchantTerminal } from "./components/merchant/MerchantTerminal.js";
import { MonitoringDashboard } from "./components/dashboard/MonitoringDashboard.js";
import { MasterAdminDashboard } from "./components/superadmin/MasterAdminDashboard.js";
import { GuardPortal } from "./components/guard/GuardPortal.js";
import { StoreConfigModal } from "./components/store/StoreConfigModal.js";
import { TerminalManagerModal } from "./components/admin/TerminalManagerModal.js";
import { AuthModal } from "./components/auth/AuthModal.js";
import { useSocketAlerts } from "./hooks/useSocketAlerts.js";
import { useAuth } from "./context/AuthContext.js";

// Helper to detect if current URL is for the Guard mobile view via QR or direct link
const isGuardUrl = () => {
  if (typeof window === "undefined") return false;
  const search = (window.location.search || "").toLowerCase();
  const hash = (window.location.hash || "").toLowerCase();
  
  // Search string (query params after ?) or hash fragment (after #) containing guard or store parameters
  return (
    search.includes("guard") ||
    search.includes("storeid") ||
    search.includes("store_id") ||
    search.includes("sname") ||
    hash.includes("guard") ||
    hash.includes("storeid") ||
    hash.includes("store_id") ||
    hash.includes("sname")
  );
};

export default function App() {
  const { appUser, isLoading, logout, terminals, centrales } = useAuth();
  const [store, setStore] = useState<StoreMetadata>(DEFAULT_STORE);
  const [isStoreConfigOpen, setIsStoreConfigOpen] = useState<boolean>(false);
  const [isTerminalManagerOpen, setIsTerminalManagerOpen] = useState<boolean>(false);

  // Active View mode: MASTER_ADMIN, CENTRAL, TERMINAL, GUARD
  const [currentView, setCurrentView] = useState<"MASTER_ADMIN" | "CENTRAL" | "TERMINAL" | "GUARD">(() => {
    if (isGuardUrl()) {
      return "GUARD";
    }
    return "CENTRAL";
  });

  // Listen for hash/URL changes so scanning QR code immediately opens the guard view
  useEffect(() => {
    const handleUrlChange = () => {
      if (isGuardUrl()) {
        setCurrentView("GUARD");
      }
    };
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  const {
    alerts,
    isConnected,
    latencyMs,
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
    if (isGuardUrl()) {
      if (currentView !== "GUARD") {
        setCurrentView("GUARD");
      }
      return;
    }

    if (appUser) {
      if (appUser.role === "SUPER_ADMIN") {
        // Super admin can inspect any view
      } else if (appUser.role === "GUARD") {
        if (currentView !== "GUARD") {
          setCurrentView("GUARD");
        }
      } else if (appUser.role === "CENTRAL" || appUser.role === "ADMIN") {
        // Central operator is locked strictly to CENTRAL view
        if (currentView !== "CENTRAL") {
          setCurrentView("CENTRAL");
        }
      } else if (appUser.role === "TERMINAL") {
        // Terminal merchant is locked strictly to TERMINAL view
        if (currentView !== "TERMINAL") {
          setCurrentView("TERMINAL");
        }
      }
    }
  }, [appUser?.role, currentView]);

  // Set default view on user login
  useEffect(() => {
    if (isGuardUrl()) {
      setCurrentView("GUARD");
      return;
    }
    if (appUser) {
      if (appUser.role === "SUPER_ADMIN") {
        setCurrentView("MASTER_ADMIN");
      } else if (appUser.role === "GUARD") {
        setCurrentView("GUARD");
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
      // 1. Coincidencia directa por correo de terminal
      let match = terminals.find(t => (t?.email || "").toLowerCase() === (appUser.email || "").toLowerCase());

      // 2. Coincidencia por storeId del usuario
      if (!match && appUser.storeId) {
        match = terminals.find(t => t.storeId === appUser.storeId);
      }

      // 3. Si un operador de Central o Admin cambia a la vista Terminal, vincular a su terminal registrada
      if (!match && (appUser.role === "CENTRAL" || appUser.role === "ADMIN")) {
        match = terminals.find(t => t.centralId === appUser.centralId) || terminals[0];
      } else if (!match && appUser.role === "SUPER_ADMIN" && terminals.length > 0) {
        match = terminals[0];
      }

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
    if (currentView === "GUARD" || appUser.role === "GUARD") {
      return appUser.displayName || localStorage.getItem("pg_guard_name") || "Oficial en Turno (Guardia)";
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
      <div className="relative min-h-screen bg-[#121215] flex flex-col items-center justify-center text-white space-y-4 overflow-hidden">
        <div className="absolute w-[450px] h-[450px] bg-gradient-to-r from-[#dc2626]/20 to-[#be123c]/20 blur-[120px] rounded-full animate-pulse" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#be123c] border border-[#881337] flex items-center justify-center text-white shadow-xl shadow-[#4c0519]/60">
          <ShieldAlert className="w-7 h-7 animate-pulse" />
        </div>
        <p className="text-sm font-mono text-[#a1a1aa] relative z-10">Iniciando PanicGuard...</p>
      </div>
    );
  }

  // Direct instant access for Security Guards accessing via Terminal QR code / Guard URL / Guard role
  if (isGuardUrl() || currentView === "GUARD" || appUser?.role === "GUARD") {
    return (
      <div className="min-h-screen bg-[#121215] text-[#f4f4f5] flex flex-col selection:bg-[#dc2626] selection:text-white">
        <GuardPortal
          alerts={alerts}
          isConnected={isConnected}
          updateAlertStatus={updateAlertStatus}
          onOpenStoreConfig={() => setIsStoreConfigOpen(true)}
        />
      </div>
    );
  }

  // If no user is logged in, show AuthModal
  if (!appUser) {
    return <AuthModal />;
  }

  const isSuperAdmin = appUser.role === "SUPER_ADMIN";
  const isPrivileged = appUser.role === "SUPER_ADMIN" || appUser.role === "CENTRAL" || appUser.role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#121215] text-[#f4f4f5] flex flex-col selection:bg-[#dc2626] selection:text-white">
      {/* Top Navigation Bar with View Switcher */}
      <header className="sticky top-0 z-40 bg-[#18181b]/95 backdrop-blur-md border-b border-[#27272a] shadow-lg shadow-black/40">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Current Role Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#dc2626] to-[#be123c] border border-[#881337] shadow-lg shadow-[#4c0519]/60 shrink-0">
              <ShieldAlert className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base sm:text-lg font-black tracking-tight text-white font-sans">
                  PANIC<span className="text-[#dc2626]">GUARD</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-lg border font-bold bg-[#4c0519] border-[#9f1239] text-[#fda4af]">
                  {currentView === "MASTER_ADMIN"
                    ? "SUPER ADMIN"
                    : currentView === "GUARD"
                    ? "GUARDIA MÓVIL"
                    : currentView === "CENTRAL"
                    ? "CENTRAL"
                    : "TERMINAL"}
                </span>

                {/* Account Name Identification Badge */}
                <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] px-2.5 py-0.5 rounded-lg text-xs shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#a1a1aa] uppercase font-semibold">Cuenta:</span>
                  <span className="text-[#f4f4f5] font-bold max-w-[180px] sm:max-w-[320px] truncate">
                    {activeAccountName}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[#a1a1aa] font-medium hidden md:block">
                {currentView === "MASTER_ADMIN"
                  ? "Panel General de Centrales, Terminales en Tiempo Real y Estadísticas"
                  : currentView === "GUARD"
                  ? "Portal Táctico del Guardia: Alarma Sonora, Fotos y Despacho Rápido (0 Créditos)"
                  : currentView === "CENTRAL"
                  ? `Consola Operativa Asignada: ${activeAccountName}`
                  : `Terminal Comercial Asignada: ${activeAccountName} (${store.storeId})`}
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Super Admin Full View Switcher */}
            {isSuperAdmin && (
              <div className="hidden xl:flex items-center bg-[#121215] p-1 rounded-xl border border-[#27272a] text-xs">
                <button
                  onClick={() => setCurrentView("MASTER_ADMIN")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === "MASTER_ADMIN"
                      ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                  }`}
                >
                  Matriz
                </button>
                <button
                  onClick={() => setCurrentView("CENTRAL")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === "CENTRAL"
                      ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                  }`}
                >
                  Central
                </button>
                <button
                  onClick={() => setCurrentView("TERMINAL")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentView === "TERMINAL"
                      ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                  }`}
                >
                  Terminal
                </button>
                <button
                  onClick={() => setCurrentView("GUARD")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    currentView === "GUARD"
                      ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] text-white shadow-md shadow-[#4c0519]/60"
                      : "text-[#a1a1aa] hover:text-white hover:bg-[#18181b]"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  Guardia
                </button>
              </div>
            )}

            {isPrivileged && (
              <button
                id="btn-admin-terminals"
                onClick={() => setIsTerminalManagerOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                title="Dar de alta roles y terminales con cuentas de Google"
              >
                <Users className="w-3.5 h-3.5 text-[#ef4444]" />
                <span className="hidden lg:inline">Gestión Rápida</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#121215] text-[#a1a1aa] border border-[#27272a]">
                  {terminals.length}
                </span>
              </button>
            )}

            {currentView === "TERMINAL" && (
              <button
                onClick={() => setIsStoreConfigOpen(true)}
                className="p-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                title="Configurar Datos de Comercio"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#18181b] border border-[#27272a] text-xs shadow-sm">
              <UserCheck className="w-3.5 h-3.5 text-[#34d399] flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-white max-w-[160px] truncate leading-tight">
                  {activeAccountName}
                </span>
                <span className="text-[10px] text-[#71717a] max-w-[160px] truncate font-mono">
                  {appUser.email}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-[#18181b] hover:bg-[#4c0519] hover:text-[#fda4af] hover:border-[#9f1239] border border-[#27272a] text-[#a1a1aa] transition-all cursor-pointer"
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
              ? alerts.filter((a) =>
                  !a.centralId ||
                  a.centralId === appUser.centralId ||
                  a.store?.centralId === appUser.centralId ||
                  a.triggerType === "VOLUME_BUTTON" ||
                  a.triggerType === "GUARD_PANIC" ||
                  Boolean(a.guardName)
                )
              : alerts
            }
            isConnected={isConnected}
            latencyMs={latencyMs}
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
            alerts={alerts}
          />
        )}

        {currentView === "GUARD" && (
          <GuardPortal
            alerts={alerts}
            isConnected={isConnected}
            updateAlertStatus={updateAlertStatus}
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
      <footer className="border-t border-[#27272a] bg-[#18181b]/95 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#a1a1aa] font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#34d399]" />
          <span>Base de Datos Conectada.</span>
        </div>
        <div>
          Rol: <span className="text-[#f4f4f5] font-bold">{appUser.role}</span> | Vista: <span className="text-[#a1a1aa] font-bold">{currentView}</span> | Usuario: <span className="text-[#a1a1aa]">{appUser.email}</span>
        </div>
      </footer>
    </div>
  );
}
