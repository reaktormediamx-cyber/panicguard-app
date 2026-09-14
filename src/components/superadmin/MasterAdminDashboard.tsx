import React, { useState } from "react";
import {
  Shield,
  Building2,
  Store,
  Radio,
  AlertTriangle,
  Users,
  PlusCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  BarChart3,
  MapPin,
  Phone,
  Mail,
  Clock,
  Eye,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Power,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Brain,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  Edit2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.js";
import { CentralStation, TerminalRegistration, PanicAlert, AlertStatus } from "../../types.js";
import { BurstViewer } from "../dashboard/BurstViewer.js";
import { TacticalMap } from "../dashboard/TacticalMap.js";
import { AiVerdictPanel } from "../dashboard/AiVerdictPanel.js";
import { EmergencyModal } from "../dashboard/EmergencyModal.js";

interface MasterAdminDashboardProps {
  alerts: PanicAlert[];
  isConnected: boolean;
  activeEmergencyModalAlert: PanicAlert | null;
  setActiveEmergencyModalAlert: (alert: PanicAlert | null) => void;
  isAudioAlarmActive: boolean;
  acknowledgeAlarmSound: () => void;
  updateAlertStatus: (
    alertId: string,
    status: AlertStatus,
    operatorName?: string,
    notes?: string,
    unit?: string
  ) => void;
}

export const MasterAdminDashboard: React.FC<MasterAdminDashboardProps> = ({
  alerts,
  isConnected,
  activeEmergencyModalAlert,
  setActiveEmergencyModalAlert,
  isAudioAlarmActive,
  acknowledgeAlarmSound,
  updateAlertStatus,
}) => {
  const {
    centrales,
    terminals,
    createCentral,
    updateCentral,
    updateCentralStatus,
    deleteCentral,
    createTerminal,
    updateTerminal,
    updateTerminalStatus,
    deleteTerminal,
    appUser,
    systemSettings,
    updateAiSetting,
    clearSampleData,
  } = useAuth();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"CENTRALES" | "TERMINALS" | "ALERTS" | "STATS">("CENTRALES");

  // Filter states
  const [centralSearch, setCentralSearch] = useState("");
  const [terminalSearch, setTerminalSearch] = useState("");
  const [selectedCentralFilter, setSelectedCentralFilter] = useState<string>("ALL");
  const [alertStatusFilter, setAlertStatusFilter] = useState<string>("ALL");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alerts.length > 0 ? alerts[0].id : null
  );

  // Modal / Form States
  const [showAddCentralModal, setShowAddCentralModal] = useState(false);
  const [showAddTerminalModal, setShowAddTerminalModal] = useState(false);
  const [selectedCentralForStats, setSelectedCentralForStats] = useState<CentralStation | null>(null);
  const [expandedCentralId, setExpandedCentralId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Inline Confirmation States to avoid blocked window.confirm in iframe preview
  const [confirmingDeactivateCentralId, setConfirmingDeactivateCentralId] = useState<string | null>(null);
  const [confirmingDeleteCentralId, setConfirmingDeleteCentralId] = useState<string | null>(null);
  const [confirmingDeactivateTerminalId, setConfirmingDeactivateTerminalId] = useState<string | null>(null);
  const [confirmingDeleteTerminalId, setConfirmingDeleteTerminalId] = useState<string | null>(null);

  // Form State: New Central
  const [centralName, setCentralName] = useState("");
  const [centralCode, setCentralCode] = useState("");
  const [centralResponsible, setCentralResponsible] = useState("");
  const [centralEmail, setCentralEmail] = useState("");
  const [centralPassword, setCentralPassword] = useState("rockomx83");
  const [centralPhone, setCentralPhone] = useState("");
  const [centralCity, setCentralCity] = useState("Ciudad de México");
  const [centralState, setCentralState] = useState("CDMX");
  const [centralAddress, setCentralAddress] = useState("");
  const [centralNotes, setCentralNotes] = useState("");
  const [isSubmittingCentral, setIsSubmittingCentral] = useState(false);

  // Form State: New Terminal
  const [termGoogleEmail, setTermGoogleEmail] = useState("");
  const [termPassword, setTermPassword] = useState("rockomx83");
  const [termCentralId, setTermCentralId] = useState(centrales[0]?.id || "");
  const [termStoreName, setTermStoreName] = useState("");
  const [termOwnerName, setTermOwnerName] = useState("");
  const [termPhone, setTermPhone] = useState("");
  const [termAddress, setTermAddress] = useState("");
  const [termCity, setTermCity] = useState("Ciudad de México, CDMX");
  const [termCategory, setTermCategory] = useState("Joyería y Artículos de Lujo");
  const [isSubmittingTerminal, setIsSubmittingTerminal] = useState(false);

  // Form State: Edit Central
  const [editingCentral, setEditingCentral] = useState<any | null>(null);
  const [editCentralName, setEditCentralName] = useState("");
  const [editCentralCode, setEditCentralCode] = useState("");
  const [editCentralResponsible, setEditCentralResponsible] = useState("");
  const [editCentralEmail, setEditCentralEmail] = useState("");
  const [editCentralPassword, setEditCentralPassword] = useState("");
  const [editCentralPhone, setEditCentralPhone] = useState("");
  const [editCentralCity, setEditCentralCity] = useState("Ciudad de México");
  const [editCentralState, setEditCentralState] = useState("CDMX");
  const [editCentralAddress, setEditCentralAddress] = useState("");
  const [editCentralNotes, setEditCentralNotes] = useState("");
  const [isSubmittingEditCentral, setIsSubmittingEditCentral] = useState(false);

  // Form State: Edit Terminal
  const [editingTerminal, setEditingTerminal] = useState<any | null>(null);
  const [editTermGoogleEmail, setEditTermGoogleEmail] = useState("");
  const [editTermPassword, setEditTermPassword] = useState("");
  const [editTermCentralId, setEditTermCentralId] = useState("");
  const [editTermStoreName, setEditTermStoreName] = useState("");
  const [editTermOwnerName, setEditTermOwnerName] = useState("");
  const [editTermPhone, setEditTermPhone] = useState("");
  const [editTermAddress, setEditTermAddress] = useState("");
  const [editTermCity, setEditTermCity] = useState("Ciudad de México, CDMX");
  const [editTermCategory, setEditTermCategory] = useState("Joyería y Artículos de Lujo");
  const [isSubmittingEditTerminal, setIsSubmittingEditTerminal] = useState(false);

  // Notifications
  const [actionNotice, setActionNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Trigger Multi-Central Simulation
  const handleTriggerSimulation = async (targetCentralId?: string) => {
    try {
      setIsSimulating(true);
      const target = centrales.find((c) => c.id === targetCentralId);
      await fetch("/api/alerts/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "armed",
          targetCentral: target ? { id: target.id, name: target.name } : undefined,
        }),
      });
      showNotification("🚨 Simulación de pánico enviada al centro de monitoreo.");
    } catch (e: any) {
      showNotification("Error en simulación: " + e.message, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  // Submit New Central
  const handleCreateCentralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centralName || !centralEmail) return;

    setIsSubmittingCentral(true);
    try {
      const generatedCode = centralCode || `C4-${centralCity.substring(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
      await createCentral({
        name: centralName,
        code: generatedCode,
        responsibleName: centralResponsible || "Encargado de Operaciones",
        email: centralEmail.trim().toLowerCase(),
        password: centralPassword || "rockomx83",
        phone: centralPhone || "+52 55 0000 0000",
        city: centralCity,
        state: centralState,
        address: centralAddress || "Sede Central",
        notes: centralNotes,
        status: "ACTIVE",
        coordinates: {
          latitude: 19.4326 + (Math.random() - 0.5) * 0.1,
          longitude: -99.1332 + (Math.random() - 0.5) * 0.1,
          accuracy: 5,
        },
      });

      showNotification(`Central "${centralName}" dada de alta exitosamente con acceso habilitado.`);
      setCentralName("");
      setCentralCode("");
      setCentralResponsible("");
      setCentralEmail("");
      setCentralPassword("rockomx83");
      setCentralPhone("");
      setCentralAddress("");
      setCentralNotes("");
      setShowAddCentralModal(false);
    } catch (err: any) {
      showNotification("Error al dar de alta la central: " + err.message, "error");
    } finally {
      setIsSubmittingCentral(false);
    }
  };

  // Submit New Terminal
  const handleCreateTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termGoogleEmail) return;

    setIsSubmittingTerminal(true);
    try {
      const selectedCentral = centrales.find((c) => c.id === termCentralId) || centrales[0];
      const cleanEmail = termGoogleEmail.trim().toLowerCase();
      const generatedStoreId = "STR-" + Math.floor(1000 + Math.random() * 9000);

      await createTerminal({
        email: cleanEmail,
        password: termPassword || "rockomx83",
        storeId: generatedStoreId,
        storeName: termStoreName || `Comercio ${cleanEmail.split("@")[0]}`,
        ownerName: termOwnerName || "Titular de Sucursal",
        phone: termPhone || "+52 55 1234 5678",
        address: termAddress || "Av. Principal #100",
        city: termCity,
        category: termCategory,
        assignedRole: "TERMINAL",
        status: "ACTIVE",
        centralId: selectedCentral?.id || "",
        centralName: selectedCentral?.name || "Sin Central Asignada",
        coordinates: {
          latitude: 19.4326 + (Math.random() - 0.5) * 0.08,
          longitude: -99.1332 + (Math.random() - 0.5) * 0.08,
          accuracy: 5,
        },
      });

      showNotification(`Terminal vinculada a ${cleanEmail} y asignada a ${selectedCentral?.name || "la Central"}.`);
      setTermGoogleEmail("");
      setTermStoreName("");
      setTermOwnerName("");
      setTermPhone("");
      setTermAddress("");
      setShowAddTerminalModal(false);
    } catch (err: any) {
      showNotification("Error al dar de alta la terminal: " + err.message, "error");
    } finally {
      setIsSubmittingTerminal(false);
    }
  };

  // Start Edit Central
  const startEditCentral = (central: any) => {
    setEditingCentral(central);
    setEditCentralName(central.name || "");
    setEditCentralCode(central.code || "");
    setEditCentralResponsible(central.responsibleName || "");
    setEditCentralEmail(central.email || "");
    setEditCentralPassword(central.password || "");
    setEditCentralPhone(central.phone || "");
    setEditCentralCity(central.city || "Ciudad de México");
    setEditCentralState(central.state || "CDMX");
    setEditCentralAddress(central.address || "");
    setEditCentralNotes(central.notes || "");
  };

  const handleEditCentralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCentral || !editCentralName || !editCentralEmail) return;

    setIsSubmittingEditCentral(true);
    try {
      await updateCentral(editingCentral.id, {
        name: editCentralName,
        code: editCentralCode,
        responsibleName: editCentralResponsible,
        email: editCentralEmail.trim().toLowerCase(),
        password: editCentralPassword,
        phone: editCentralPhone,
        city: editCentralCity,
        state: editCentralState,
        address: editCentralAddress,
        notes: editCentralNotes,
      });
      showNotification(`Central "${editCentralName}" actualizada con éxito.`);
      setEditingCentral(null);
    } catch (err: any) {
      showNotification("Error al actualizar la central: " + err.message, "error");
    } finally {
      setIsSubmittingEditCentral(false);
    }
  };

  // Start Edit Terminal
  const startEditTerminal = (terminal: any) => {
    setEditingTerminal(terminal);
    setEditTermGoogleEmail(terminal.email || "");
    setEditTermPassword(terminal.password || "");
    setEditTermCentralId(terminal.centralId || "");
    setEditTermStoreName(terminal.storeName || "");
    setEditTermOwnerName(terminal.ownerName || "");
    setEditTermPhone(terminal.phone || "");
    setEditTermAddress(terminal.address || "");
    setEditTermCity(terminal.city || "Ciudad de México, CDMX");
    setEditTermCategory(terminal.category || "Joyería y Artículos de Lujo");
  };

  const handleEditTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerminal || !editTermGoogleEmail) return;

    setIsSubmittingEditTerminal(true);
    try {
      const selectedCentral = centrales.find((c) => c.id === editTermCentralId);
      await updateTerminal(editingTerminal.id, {
        email: editTermGoogleEmail.trim().toLowerCase(),
        password: editTermPassword,
        storeName: editTermStoreName,
        ownerName: editTermOwnerName,
        phone: editTermPhone,
        address: editTermAddress,
        city: editTermCity,
        category: editTermCategory,
        centralId: selectedCentral?.id || editingTerminal.centralId,
        centralName: selectedCentral?.name || editingTerminal.centralName,
      });
      showNotification(`Terminal "${editTermStoreName}" actualizada con éxito.`);
      setEditingTerminal(null);
    } catch (err: any) {
      showNotification("Error al actualizar la terminal: " + err.message, "error");
    } finally {
      setIsSubmittingEditTerminal(false);
    }
  };

  // Derived Metrics
  const activeCentralesCount = centrales.filter((c) => c.status === "ACTIVE").length;
  const inactiveCentralesCount = centrales.filter((c) => c.status !== "ACTIVE").length;

  const activeTerminalsCount = terminals.filter((t) => t.status === "ACTIVE").length;
  const inactiveTerminalsCount = terminals.filter((t) => t.status !== "ACTIVE").length;

  const activeAlertsCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const resolvedAlertsCount = alerts.filter((a) => a.status === "RESOLVED").length;

  // Filtered Centrales
  const filteredCentrales = centrales.filter((c) => {
    const q = (centralSearch || "").toLowerCase();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.responsibleName || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  });

  // Filtered Terminals
  const filteredTerminals = terminals.filter((t) => {
    const q = (terminalSearch || "").toLowerCase();
    const matchesSearch =
      (t.email || "").toLowerCase().includes(q) ||
      (t.storeName || "").toLowerCase().includes(q) ||
      (t.storeId || "").toLowerCase().includes(q) ||
      (t.ownerName || "").toLowerCase().includes(q) ||
      (t.city || "").toLowerCase().includes(q);

    const matchesCentral =
      selectedCentralFilter === "ALL" || t.centralId === selectedCentralFilter;

    return matchesSearch && matchesCentral;
  });

  // Filtered Alerts
  const filteredAlerts = alerts.filter((a) => {
    const matchesStatus = alertStatusFilter === "ALL" || a.status === alertStatusFilter;
    const matchesCentral =
      selectedCentralFilter === "ALL" || a.centralId === selectedCentralFilter || a.store?.centralId === selectedCentralFilter;
    return matchesStatus && matchesCentral;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || filteredAlerts[0] || alerts[0];

  // Helper for Central stats
  const getCentralStats = (centralId: string) => {
    const assignedTerminals = terminals.filter((t) => t.centralId === centralId);
    const assignedAlerts = alerts.filter(
      (a) => a.centralId === centralId || a.store?.centralId === centralId
    );
    const activeAlerts = assignedAlerts.filter((a) => a.status === "ACTIVE");
    return {
      terminalsCount: assignedTerminals.length,
      activeTerminalsCount: assignedTerminals.filter((t) => t.status === "ACTIVE").length,
      alertsCount: assignedAlerts.length,
      activeAlertsCount: activeAlerts.length,
      terminals: assignedTerminals,
      alerts: assignedAlerts,
    };
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Super Admin view operates quietly without intrusive popup modal windows */}

      {/* Floating Action Notice */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xl transition-all ${
            actionNotice.type === "success"
              ? "bg-emerald-950 border border-emerald-500/50 text-emerald-300"
              : "bg-red-950 border border-red-500/50 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-slate-950 border border-red-500/40 flex items-center justify-center text-white shadow-xl shadow-red-950/60">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  PANEL MATRIZ & SUPER ADMINISTRADOR
                </h1>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 font-mono font-bold">
                  MULTI-CENTRAL HQ
                </span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1.5 ${
                    isConnected
                      ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                      : "bg-red-950 border border-red-500/40 text-red-400"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    }`}
                  />
                  {isConnected ? "Socket Multi-Nodo Activo" : "Reconectando..."}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Monitoreo consolidado de todas las Centrales (C4/C5), registro y baja de terminales, e identificación de origen de pánico.
              </p>
            </div>
          </div>

          {/* Quick simulation / action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTriggerSimulation()}
              disabled={isSimulating}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSimulating ? "Emitiendo..." : "Simular Pánico Multi-Central"}</span>
            </button>

            <button
              onClick={() => setShowAddCentralModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              <span>+ Alta Central</span>
            </button>

            <button
              onClick={() => setShowAddTerminalModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Alta Terminal</span>
            </button>

            <button
              onClick={async () => {
                if (confirm("¿Estás seguro de que deseas restablecer toda la información del sistema? Esto eliminará las centrales y terminales de muestra y desactivará el análisis global.")) {
                  await clearSampleData();
                  alert("Sistema restablecido con éxito. El análisis global ha sido desactivado.");
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-red-950/80 hover:text-red-400 border border-slate-700 hover:border-red-900 text-slate-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Restablecer Datos / Limpiar Centrales y Terminales de Muestra"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer Datos</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          {/* KPI 1: Centrales */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Centrales de Monitoreo</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-white">{centrales.length}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {activeCentralesCount} Activas
                </span>
                {inactiveCentralesCount > 0 && (
                  <span className="text-[10px] text-red-400 font-mono">
                    ({inactiveCentralesCount} Bajas)
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          {/* KPI 2: Terminals */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Terminales / Comercios</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-white">{terminals.length}</span>
                <span className="text-[10px] text-blue-400 font-mono font-bold">
                  {activeTerminalsCount} Operativas
                </span>
                {inactiveTerminalsCount > 0 && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({inactiveTerminalsCount} Bajas)
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Store className="w-4 h-4" />
            </div>
          </div>

          {/* KPI 3: Panic Alerts */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Alertas Totales</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-red-400">{alerts.length}</span>
                <span className="text-[10px] text-red-400 font-mono font-bold animate-pulse">
                  {activeAlertsCount} En Curso
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          {/* KPI 4: Forensics Engine with Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                systemSettings?.aiEnabled 
                  ? "bg-purple-600/15 border border-purple-500/40 text-purple-400" 
                  : "bg-slate-800/40 border border-slate-700/50 text-slate-500"
              }`}>
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Análisis de Video Automatizado</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs font-bold font-mono transition-all ${
                    systemSettings?.aiEnabled ? "text-purple-300" : "text-slate-500"
                  }`}>
                    {systemSettings?.aiEnabled ? "ACTIVADO" : "DESACTIVADO"}
                  </span>
                  {systemSettings?.aiEnabled && (
                    <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                      En Línea
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-3 mt-1 md:mt-0 pt-2 md:pt-0 border-t border-slate-800/40 md:border-t-0">
              <span className="text-[10px] text-slate-400 font-medium md:hidden">Estado Global del Análisis:</span>
              <button
                onClick={async () => {
                  try {
                    await updateAiSetting(!systemSettings?.aiEnabled);
                  } catch (err: any) {
                    alert(err.message || "Error al actualizar configuración de análisis");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  systemSettings?.aiEnabled
                    ? "bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30"
                    : "bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700"
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{systemSettings?.aiEnabled ? "Pausar Análisis" : "Activar Análisis"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3 overflow-x-auto">
          {[
            { id: "CENTRALES", label: "🛰️ Registro de Centrales (Alta / Baja & Stats)", count: centrales.length },
            { id: "ALERTS", label: "🚨 Monitor Global de Pánicos (Multi-Central)", count: alerts.length },
            { id: "STATS", label: "📊 Estadísticas Matriz", count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? "bg-red-600 text-white shadow-lg shadow-red-950"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === tab.id ? "bg-red-800 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CENTRALES DE MONITOREO (ALTA / BAJA & ESTADÍSTICAS) */}
      {/* ========================================================= */}
      {activeTab === "CENTRALES" && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Catálogo de Centrales de Monitoreo ({filteredCentrales.length})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar central, ciudad, encargado..."
                  value={centralSearch}
                  onChange={(e) => setCentralSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={() => setShowAddCentralModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Dar de Alta Central</span>
              </button>
            </div>
          </div>

          {/* Centrales List View (Interactive Click-to-Expand / Despliegue de Información) */}
          <div className="space-y-3">
            {filteredCentrales.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs">
                No se encontraron centrales con el criterio de búsqueda "{centralSearch}".
              </div>
            ) : (
              filteredCentrales.map((central) => {
                const stats = getCentralStats(central.id);
                const isActive = central.status === "ACTIVE";
                const isExpanded = expandedCentralId === central.id;

                const activeCentralAlerts = stats.alerts.filter((a) => a.status === "ACTIVE" || a.status === "IN_REVIEW");
                const dispatchedCentralAlerts = stats.alerts.filter((a) => a.status === "DISPATCHED" || a.status === "RESOLVED" || a.status === "FALSE_ALARM");
                const hasActiveAlert = activeCentralAlerts.length > 0;
                const hasDispatchedAlert = !hasActiveAlert && dispatchedCentralAlerts.length > 0;

                return (
                  <div
                    key={central.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      hasActiveAlert
                        ? "bg-slate-900 border-red-500 shadow-xl shadow-red-950/30"
                        : isActive
                        ? isExpanded
                          ? "bg-slate-900 border-slate-700 shadow-2xl shadow-black/70"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                        : "bg-slate-950/80 border-red-950/40 opacity-80"
                    }`}
                  >
                    {/* Main Clickable Summary Row */}
                    <div
                      onClick={() => setExpandedCentralId(isExpanded ? null : central.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center text-white shadow ${
                            hasActiveAlert
                              ? "bg-red-600 animate-pulse text-white shadow-red-600/50"
                              : isActive
                              ? isExpanded
                                ? "bg-gradient-to-br from-red-600 to-red-800 border border-red-500/50"
                                : "bg-slate-800 border border-slate-700 text-red-400"
                              : "bg-slate-900 border border-slate-800 text-slate-500"
                          }`}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">
                              {central.name}
                            </h3>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                              {central.code}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                isActive
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : "bg-red-950 text-red-400 border border-red-800"
                              }`}
                            >
                              {isActive ? "ACTIVA" : "DADA DE BAJA"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {central.city}, {central.state}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {central.responsibleName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right KPIs & Flashing Alert Status Button */}
                      <div className="flex items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-800/80">
                        {/* Flashing Red or Solid Green Button next to the listing */}
                        {hasActiveAlert ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCentralId(isExpanded ? null : central.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-red-600/50 border border-red-400 animate-pulse cursor-pointer transition-all shrink-0"
                            title="Alerta de pánico activa. Haz clic para expandir detalles."
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                            <ShieldAlert className="w-4 h-4 text-white" />
                            <span>ALERTA ACTIVA ({activeCentralAlerts.length})</span>
                          </button>
                        ) : hasDispatchedAlert ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCentralId(isExpanded ? null : central.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-950/60 border border-emerald-400 cursor-pointer transition-all shrink-0"
                            title="Emergencia despachada / atendida por la central."
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                            <span>DESPACHADA</span>
                          </button>
                        ) : null}

                        <div className="flex items-center gap-3 text-xs">
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 block">Terminales</span>
                            <span className="font-mono font-bold text-blue-400">
                              {stats.terminalsCount}{" "}
                              <span className="text-[10px] text-emerald-400">
                                ({stats.activeTerminalsCount} act)
                              </span>
                            </span>
                          </div>
                          <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 block">Alertas</span>
                            <span className="font-mono font-bold text-red-400">
                              {stats.alertsCount}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 sm:hidden">
                            {isExpanded ? "Ocultar" : "Ver detalle"}
                          </span>
                          <div
                            className={`p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 bg-red-950 border-red-800 text-red-300" : ""
                            }`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unfolded Information Panel (Despliegue de Información) */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800 bg-slate-950/70 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Col 1: Operational Contacts */}
                          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              Datos de Contacto & Operación
                            </span>
                            <div className="space-y-1.5 text-xs text-slate-300">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-slate-400">Encargado:</span>
                                <span className="text-white font-medium">{central.responsibleName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-slate-400">Email:</span>
                                <span className="text-white font-mono">{central.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-slate-400">Teléfono:</span>
                                <span className="text-white font-mono">{central.phone}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-slate-400">Dirección: </span>
                                  <span className="text-white">{central.address || "Sede C4/C5"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Operational Protocols & Notes */}
                          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              Protocolos & Especificaciones
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {central.notes ||
                                "Operación regular 24/7 con enlace directo a cuerpos de seguridad pública y unidades de respuesta táctica."}
                            </p>
                            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                              <span>
                                ID Base: <strong className="text-slate-200 font-mono">{central.id}</strong>
                              </span>
                              <span>
                                Turnos: <strong className="text-emerald-400">24/7 Monitoreo</strong>
                              </span>
                            </div>
                          </div>

                          {/* Col 3: Statistics KPIs */}
                          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              Métricas de la Central
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Terminales</span>
                                <span className="text-xl font-black text-blue-400 font-mono">
                                  {stats.terminalsCount}
                                </span>
                                <span className="text-[9px] text-emerald-400 block font-mono">
                                  {stats.activeTerminalsCount} Activas
                                </span>
                              </div>

                              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">Alertas</span>
                                <span className="text-xl font-black text-red-400 font-mono">
                                  {stats.alertsCount}
                                </span>
                                <span className="text-[9px] text-red-400 block font-mono">
                                  {stats.activeAlertsCount} En Curso
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCentralForStats(central);
                              }}
                              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Ver Estadísticas Completas</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Actions Row */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerSimulation(central.id);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                              <span>Simular Pánico en esta Central</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditCentral(central);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                              title="Editar información registrada de la Central"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Editar</span>
                            </button>

                            {isActive ? (
                              confirmingDeactivateCentralId === central.id ? (
                                <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/60 p-1 px-2 rounded-xl">
                                  <span className="text-[10px] text-red-400 font-bold">¿Dar de baja?</span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await updateCentralStatus(central.id, "INACTIVE");
                                      showNotification(`Central "${central.name}" dada de baja.`);
                                      setConfirmingDeactivateCentralId(null);
                                    }}
                                    className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black cursor-pointer"
                                  >
                                    Sí
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmingDeactivateCentralId(null);
                                    }}
                                    className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-black cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmingDeactivateCentralId(central.id);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold cursor-pointer transition-all"
                                >
                                  Dar de Baja Central
                                </button>
                              )
                            ) : (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await updateCentralStatus(central.id, "ACTIVE");
                                  showNotification(`Central "${central.name}" reactivada exitosamente.`);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold cursor-pointer transition-all"
                              >
                                Reactivar Central
                              </button>
                            )}

                            {confirmingDeleteCentralId === central.id ? (
                              <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-800/60 p-1 px-2 rounded-xl">
                                <span className="text-[10px] text-red-400 font-bold">¿Eliminar?</span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await deleteCentral(central.id, true);
                                    showNotification(`Central eliminada definitivamente.`);
                                    setConfirmingDeleteCentralId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black cursor-pointer"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmingDeleteCentralId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-black cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingDeleteCentralId(central.id);
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                                title="Eliminar de Firestore"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TERMINALES & COMERCIOS VINCULADOS (ALTA / BAJA) */}
      {/* ========================================================= */}
      {activeTab === "TERMINALS" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Terminales en Tiempo Real ({filteredTerminals.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Central Filter Dropdown */}
              <select
                value={selectedCentralFilter}
                onChange={(e) => setSelectedCentralFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="ALL">Todas las Centrales ({centrales.length})</option>
                {centrales.map((c) => (
                  <option key={c.id} value={c.id}>
                    📍 {c.name}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="relative flex-1 md:w-60">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar correo, tienda o ID..."
                  value={terminalSearch}
                  onChange={(e) => setTerminalSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                onClick={() => setShowAddTerminalModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Dar de Alta Terminal</span>
              </button>
            </div>
          </div>

          {/* Terminal Cards Table */}
          {filteredTerminals.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Store className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No se encontraron terminales registradas</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay terminales que coincidan con la búsqueda o la Central seleccionada. Puedes dar de alta una nueva con el botón superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerminals.map((t) => {
                const isActive = t.status === "ACTIVE";
                const parentCentral = centrales.find((c) => c.id === t.centralId);

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-3xl border transition-all space-y-3 flex flex-col justify-between ${
                      isActive
                        ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-xl"
                        : "bg-slate-950/70 border-red-950/40 opacity-75"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Row: Store & Role */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight truncate max-w-[170px]">
                              {t.storeName}
                            </h4>
                            <span className="font-mono text-[10px] text-slate-400">
                              ID: {t.storeId}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            isActive
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {isActive ? "HABILITADA" : "DADA DE BAJA"}
                        </span>
                      </div>

                      {/* Parent Central Tag (Key requirement!) */}
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-[11px]">
                        <Building2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="text-slate-400">Central Asignada:</span>
                        <span className="text-white font-bold truncate">
                          {t.centralName || parentCentral?.name || "C4 Poniente CDMX"}
                        </span>
                      </div>

                      {/* Contact & Location Info */}
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-white font-semibold truncate">{t.email}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                          <Users className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{t.ownerName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{t.address}, {t.city}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="font-mono">{t.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Dar de baja / Reactivar / Eliminar */}
                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono text-[10px]">
                        Reg: {new Date(t.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isActive ? (
                          confirmingDeactivateTerminalId === t.id ? (
                            <div className="flex items-center gap-1 bg-red-950/50 border border-red-900/40 px-1.5 py-0.5 rounded-lg">
                              <span className="text-[9px] text-red-400 font-bold mr-0.5">¿Baja?</span>
                              <button
                                onClick={async () => {
                                  await updateTerminalStatus(t.id, "INACTIVE");
                                  showNotification(`Terminal "${t.storeName}" dada de baja.`);
                                  setConfirmingDeactivateTerminalId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmingDeactivateTerminalId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-black cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingDeactivateTerminalId(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-300 font-bold text-[10px] cursor-pointer"
                            >
                              Dar de Baja
                            </button>
                          )
                        ) : (
                          <button
                            onClick={async () => {
                              await updateTerminalStatus(t.id, "ACTIVE");
                              showNotification(`Terminal "${t.storeName}" reactivada.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 font-bold text-[10px] cursor-pointer"
                          >
                            Reactivar
                          </button>
                        )}

                        <button
                          onClick={() => startEditTerminal(t)}
                          className="p-1 text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                          title="Editar información de la terminal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {confirmingDeleteTerminalId === t.id ? (
                          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800 animate-pulse">
                            <span className="text-[9px] text-red-400 font-bold">¿Eliminar?</span>
                            <button
                              onClick={async () => {
                                await deleteTerminal(t.id, true);
                                showNotification("Terminal eliminada.");
                                setConfirmingDeleteTerminalId(null);
                              }}
                              className="px-1 py-0.5 rounded bg-red-600 text-white text-[9px] font-black cursor-pointer"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmingDeleteTerminalId(null)}
                              className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-black cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteTerminalId(t.id)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                            title="Eliminar de Firestore"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MONITOR GLOBAL DE PÁNICOS (IDENTIFICANDO CENTRAL) */}
      {/* ========================================================= */}
      {activeTab === "ALERTS" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Monitor Multi-Central en Vivo ({filteredAlerts.length} Incidentes)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Central Filter Dropdown */}
              <select
                value={selectedCentralFilter}
                onChange={(e) => setSelectedCentralFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="ALL">Todas las Centrales de Origen</option>
                {centrales.map((c) => (
                  <option key={c.id} value={c.id}>
                    📍 {c.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: "ALL", label: "Todas" },
                  { id: "ACTIVE", label: "Activas 🚨" },
                  { id: "DISPATCHED", label: "Despachadas" },
                  { id: "RESOLVED", label: "Cerradas" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setAlertStatusFilter(s.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      alertStatusFilter === s.id
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Master Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Alerts Feed (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2 max-h-[680px] overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No hay alertas con los filtros seleccionados.
                  </div>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isSelected = alert.id === selectedAlert?.id;
                    const originCentral = alert.centralName || alert.store?.centralName || "C4 Poniente CDMX";

                    return (
                      <button
                        key={alert.id}
                        onClick={() => setSelectedAlertId(alert.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative space-y-2 ${
                          isSelected
                            ? "bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/50"
                            : alert.status === "ACTIVE"
                            ? "bg-red-950/30 border-red-900/60 hover:bg-slate-800/60"
                            : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {alert.store.storeName}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${
                              alert.status === "ACTIVE"
                                ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                                : alert.status === "DISPATCHED"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>

                        {/* Origin Central Tag */}
                        <div className="flex items-center gap-1.5 text-[10px] text-red-300 font-mono bg-red-950/40 px-2 py-1 rounded-lg border border-red-900/40 truncate">
                          <Building2 className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="font-bold truncate">Central: {originCentral}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                          <span>{alert.triggerType}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Alert Detail (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {selectedAlert ? (
                <>
                  {/* Alert Header Banner */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-bold text-white">
                            {selectedAlert.store.storeName}
                          </h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 font-mono text-slate-300">
                            {selectedAlert.id}
                          </span>
                        </div>

                        {/* Highlighted Central Origin */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-2.5 py-1 rounded-xl bg-gradient-to-r from-red-950 to-slate-900 border border-red-800/80 text-red-300 font-mono font-bold flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-red-400" />
                            CENTRAL RECEPTORA: {selectedAlert.centralName || selectedAlert.store?.centralName || "C4 Centro Poniente CDMX"}
                          </span>
                        </div>
                      </div>

                      {/* Operator Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedAlert.status === "ACTIVE" && (
                          <button
                            onClick={() =>
                              updateAlertStatus(
                                selectedAlert.id,
                                "DISPATCHED",
                                appUser?.displayName || "Super Admin",
                                "Patrulla despachada desde comando matriz",
                                "UNIDAD-MATRIZ-01"
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow cursor-pointer"
                          >
                            🚓 Despachar Patrulla
                          </button>
                        )}

                        {selectedAlert.status !== "RESOLVED" && (
                          <button
                            onClick={() =>
                              updateAlertStatus(
                                selectedAlert.id,
                                "RESOLVED",
                                appUser?.displayName || "Super Admin",
                                "Incidente resuelto y cerrado por la central"
                              )
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer"
                          >
                            ✓ Cerrar Incidente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visualizer & Map Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BurstViewer
                      images={selectedAlert.images}
                    />
                    <TacticalMap
                      coordinates={selectedAlert.store.coordinates}
                      storeName={selectedAlert.store.storeName}
                      address={selectedAlert.store.address}
                    />
                  </div>

                  {/* AI Forensics */}
                  <AiVerdictPanel
                    verdict={selectedAlert.aiVerdict}
                    aiStatus={selectedAlert.aiStatus}
                    aiError={selectedAlert.aiError}
                    onReanalyze={() => {}}
                  />
                </>
              ) : (
                <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-slate-500">
                  Selecciona una alerta para inspeccionar el dictamen forense y la videoverificación.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ESTADÍSTICAS MATRIZ & ANÁLISIS DE RENDIMIENTO */}
      {/* ========================================================= */}
      {activeTab === "STATS" && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-400" />
                  Rendimiento Operativo por Central de Monitoreo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Métricas de cobertura, incidentes gestionados y efectividad en tiempo real
                </p>
              </div>
            </div>

            {/* Centrales Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-3 font-semibold">CENTRAL</th>
                    <th className="pb-3 font-semibold">CÓDIGO</th>
                    <th className="pb-3 font-semibold">CIUDAD</th>
                    <th className="pb-3 font-semibold text-center">TERMINALES</th>
                    <th className="pb-3 font-semibold text-center">ALERTAS RECIBIDAS</th>
                    <th className="pb-3 font-semibold text-center">ESTADO</th>
                    <th className="pb-3 font-semibold text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {centrales.map((c) => {
                    const st = getCentralStats(c.id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pr-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-red-400 shrink-0" />
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-slate-400">{c.code}</td>
                        <td className="py-3.5 px-2 text-slate-300">{c.city}, {c.state}</td>
                        <td className="py-3.5 px-2 text-center font-mono font-bold text-blue-400">
                          {st.terminalsCount} ({st.activeTerminalsCount} act.)
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono font-bold text-red-400">
                          {st.alertsCount}
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-2 text-right">
                          <button
                            onClick={() => setSelectedCentralForStats(c)}
                            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                          >
                            Detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DAR DE ALTA CENTRAL DE MONITOREO */}
      {/* ========================================================= */}
      {showAddCentralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dar de Alta Central de Monitoreo</h3>
                  <p className="text-xs text-slate-400">
                    Registra una nueva sede u organismo de respuesta (C4, C5, Policía, Privada).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCentralModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCentralSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre de la Central <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={centralName}
                    onChange={(e) => setCentralName(e.target.value)}
                    placeholder="Ej: C4 Centro de Comando Oriente - CDMX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Código Táctico / Clave:
                  </label>
                  <input
                    type="text"
                    value={centralCode}
                    onChange={(e) => setCentralCode(e.target.value)}
                    placeholder="Ej: C4-CDMX-ORI"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Titular / Comandante Responsable:
                  </label>
                  <input
                    type="text"
                    value={centralResponsible}
                    onChange={(e) => setCentralResponsible(e.target.value)}
                    placeholder="Ej: Cmdte. Alejandro Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Oficial de Acceso Táctico <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="email"
                    required
                    value={centralEmail}
                    onChange={(e) => setCentralEmail(e.target.value)}
                    placeholder="monitoreo@c4oriente.gob.mx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contraseña de Acceso Operativo <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={centralPassword}
                    onChange={(e) => setCentralPassword(e.target.value)}
                    placeholder="Contraseña de inicio de sesión"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-red-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono de Despacho Táctico:
                  </label>
                  <input
                    type="text"
                    value={centralPhone}
                    onChange={(e) => setCentralPhone(e.target.value)}
                    placeholder="+52 55 5000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ciudad / Municipio:
                  </label>
                  <input
                    type="text"
                    value={centralCity}
                    onChange={(e) => setCentralCity(e.target.value)}
                    placeholder="Ciudad de México"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estado / Región:
                  </label>
                  <input
                    type="text"
                    value={centralState}
                    onChange={(e) => setCentralState(e.target.value)}
                    placeholder="CDMX / Jalisco / Nuevo León..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dirección Física / Ubicación:
                  </label>
                  <input
                    type="text"
                    value={centralAddress}
                    onChange={(e) => setCentralAddress(e.target.value)}
                    placeholder="Av. Principal 1000, Edificio de Seguridad Pública"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Notas y Protocolos Operativos:
                  </label>
                  <textarea
                    rows={2}
                    value={centralNotes}
                    onChange={(e) => setCentralNotes(e.target.value)}
                    placeholder="Ej: Zona conurbada, despacho con 6 unidades activas 24/7..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCentralModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCentral}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingCentral ? "Registrando en Firestore..." : "Guardar y Habilitar Central"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DAR DE ALTA TERMINAL CON ASIGNACIÓN DE CENTRAL */}
      {/* ========================================================= */}
      {showAddTerminalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Dar de Alta Terminal con Google</h3>
                  <p className="text-xs text-slate-400">
                    Vincular correo de Google a un comercio y asignar su Central receptora correspondiente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTerminalModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTerminalSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo de Acceso Autorizado <span className="text-red-400">*</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={termGoogleEmail}
                      onChange={(e) => setTermGoogleEmail(e.target.value)}
                      placeholder="tienda@gmail.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contraseña de Acceso <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="password"
                    required
                    value={termPassword}
                    onChange={(e) => setTermPassword(e.target.value)}
                    placeholder="Contraseña (ej. rockomx83)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                {/* Central Assignment Selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Asignar a Central de Monitoreo <span className="text-red-400">*</span>:
                  </label>
                  <select
                    value={termCentralId}
                    onChange={(e) => setTermCentralId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {centrales.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre del Comercio / Negocio <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={termStoreName}
                    onChange={(e) => setTermStoreName(e.target.value)}
                    placeholder="Ej: Joyería Oro Real Polanco"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Titular o Encargado:
                  </label>
                  <input
                    type="text"
                    value={termOwnerName}
                    onChange={(e) => setTermOwnerName(e.target.value)}
                    placeholder="Ej: Lic. Mauricio Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono de Contacto:
                  </label>
                  <input
                    type="text"
                    value={termPhone}
                    onChange={(e) => setTermPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Giro / Categoría:
                  </label>
                  <select
                    value={termCategory}
                    onChange={(e) => setTermCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Joyería y Artículos de Lujo">Joyería y Artículos de Lujo</option>
                    <option value="Casa de Cambio y Divisas">Casa de Cambio y Divisas</option>
                    <option value="Tienda Departamental / Retail">Tienda Departamental / Retail</option>
                    <option value="Farmacia y Salud">Farmacia y Salud</option>
                    <option value="Comercio General">Comercio General</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dirección Física:
                  </label>
                  <input
                    type="text"
                    value={termAddress}
                    onChange={(e) => setTermAddress(e.target.value)}
                    placeholder="Av. Presidente Masaryk #340, Polanco"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTerminalModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTerminal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingTerminal ? "Guardando..." : "Vincular y Habilitar"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR CENTRAL DE MONITOREO */}
      {/* ========================================================= */}
      {editingCentral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Central de Monitoreo</h3>
                  <p className="text-xs text-slate-400">
                    Modifica los datos registrados de la sede (C4, C5, Policía, Privada).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCentral(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditCentralSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre de la Central <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={editCentralName}
                    onChange={(e) => setEditCentralName(e.target.value)}
                    placeholder="Ej: C4 Centro de Comando Oriente - CDMX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Código Táctico / Clave:
                  </label>
                  <input
                    type="text"
                    value={editCentralCode}
                    onChange={(e) => setEditCentralCode(e.target.value)}
                    placeholder="Ej: C4-CDMX-ORI"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Titular / Comandante Responsable:
                  </label>
                  <input
                    type="text"
                    value={editCentralResponsible}
                    onChange={(e) => setEditCentralResponsible(e.target.value)}
                    placeholder="Ej: Cmdte. Alejandro Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Oficial de Acceso Táctico <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="email"
                    required
                    value={editCentralEmail}
                    onChange={(e) => setEditCentralEmail(e.target.value)}
                    placeholder="monitoreo@c4oriente.gob.mx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contraseña de Acceso Operativo:
                  </label>
                  <input
                    type="text"
                    value={editCentralPassword}
                    onChange={(e) => setEditCentralPassword(e.target.value)}
                    placeholder="Dejar vacía para mantener actual"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-red-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono de Despacho Táctico:
                  </label>
                  <input
                    type="text"
                    value={editCentralPhone}
                    onChange={(e) => setEditCentralPhone(e.target.value)}
                    placeholder="+52 55 5000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ciudad / Municipio:
                  </label>
                  <input
                    type="text"
                    value={editCentralCity}
                    onChange={(e) => setEditCentralCity(e.target.value)}
                    placeholder="Ciudad de México"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estado / Región:
                  </label>
                  <input
                    type="text"
                    value={editCentralState}
                    onChange={(e) => setEditCentralState(e.target.value)}
                    placeholder="CDMX / Jalisco / Nuevo León..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dirección Física / Ubicación:
                  </label>
                  <input
                    type="text"
                    value={editCentralAddress}
                    onChange={(e) => setEditCentralAddress(e.target.value)}
                    placeholder="Av. Principal 1000, Edificio de Seguridad Pública"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Notas y Protocolos Operativos:
                  </label>
                  <textarea
                    rows={2}
                    value={editCentralNotes}
                    onChange={(e) => setEditCentralNotes(e.target.value)}
                    placeholder="Ej: Zona conurbada, despacho con 6 unidades activas 24/7..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCentral(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditCentral}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingEditCentral ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR TERMINAL */}
      {/* ========================================================= */}
      {editingTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Terminal / Comercio</h3>
                  <p className="text-xs text-slate-400">
                    Modifica los datos del comercio o la central a la que reporta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTerminal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTerminalSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo de Google Autorizado <span className="text-red-400">*</span>:
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={editTermGoogleEmail}
                      onChange={(e) => setEditTermGoogleEmail(e.target.value)}
                      placeholder="ejemplo@gmail.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Contraseña de Acceso Operativo:
                  </label>
                  <input
                    type="text"
                    value={editTermPassword}
                    onChange={(e) => setEditTermPassword(e.target.value)}
                    placeholder="Clave de acceso para la terminal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-red-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-sans">
                    Asignar Central Receptora <span className="text-red-400">*</span>:
                  </label>
                  <select
                    required
                    value={editTermCentralId}
                    onChange={(e) => setEditTermCentralId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-sans"
                  >
                    <option value="">-- Seleccionar Central --</option>
                    {centrales.map((c) => (
                      <option key={c.id} value={c.id}>
                        🏢 {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre del Establecimiento / Razón Social <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    value={editTermStoreName}
                    onChange={(e) => setEditTermStoreName(e.target.value)}
                    placeholder="Ej: Joyería El Destello - CDMX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 font-sans">
                    Categoría / Giro Comercial <span className="text-red-400">*</span>:
                  </label>
                  <select
                    required
                    value={editTermCategory}
                    onChange={(e) => setEditTermCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-sans"
                  >
                    <option value="Joyería y Artículos de Lujo">Joyería y Artículos de Lujo</option>
                    <option value="Casa de Cambio y Divisas">Casa de Cambio y Divisas</option>
                    <option value="Tienda Departamental / Retail">Tienda Departamental / Retail</option>
                    <option value="Farmacia y Salud">Farmacia y Salud</option>
                    <option value="Comercio General">Comercio General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Propietario / Representante Legal:
                  </label>
                  <input
                    type="text"
                    value={editTermOwnerName}
                    onChange={(e) => setEditTermOwnerName(e.target.value)}
                    placeholder="Ej: Lic. Martín Rosas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Teléfono de Contacto Directo:
                  </label>
                  <input
                    type="text"
                    value={editTermPhone}
                    onChange={(e) => setEditTermPhone(e.target.value)}
                    placeholder="+52 55 1234 5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Dirección Completa del Comercio:
                  </label>
                  <input
                    type="text"
                    value={editTermAddress}
                    onChange={(e) => setEditTermAddress(e.target.value)}
                    placeholder="Av. Paseo de la Reforma #120, Col. Juárez"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ciudad / Municipio / Alcaldía:
                  </label>
                  <input
                    type="text"
                    value={editTermCity}
                    onChange={(e) => setEditTermCity(e.target.value)}
                    placeholder="Ej: Miguel Hidalgo, CDMX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTerminal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditTerminal}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmittingEditTerminal ? "Guardando..." : "Guardar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ESTADÍSTICAS DETALLADAS DE UNA CENTRAL ESPECÍFICA */}
      {/* ========================================================= */}
      {selectedCentralForStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Estadísticas: {selectedCentralForStats.name}
                  </h3>
                  <span className="font-mono text-[10px] text-slate-400">
                    Código: {selectedCentralForStats.code} • {selectedCentralForStats.city}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCentralForStats(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {(() => {
                const st = getCentralStats(selectedCentralForStats.id);
                return (
                  <>
                    {/* Top KPI row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Terminales Asignadas</span>
                        <div className="text-xl font-black text-blue-400 font-mono mt-1">
                          {st.terminalsCount}
                        </div>
                        <span className="text-[9px] text-emerald-400 block mt-0.5">
                          {st.activeTerminalsCount} Activas
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Alertas Totales</span>
                        <div className="text-xl font-black text-red-400 font-mono mt-1">
                          {st.alertsCount}
                        </div>
                        <span className="text-[9px] text-red-400 block mt-0.5">
                          {st.activeAlertsCount} En Curso
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-400 font-medium">Estado Operativo</span>
                        <div className="text-sm font-bold text-emerald-400 font-mono mt-2">
                          {selectedCentralForStats.status}
                        </div>
                      </div>
                    </div>

                    {/* Assigned Terminals List */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-blue-400" />
                        Terminales Vinculadas a esta Central ({st.terminals.length})
                      </h4>

                      {st.terminals.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-center">
                          No hay terminales asignadas a esta central.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {st.terminals.map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-white">{t.storeName}</span>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {t.email} • {t.address}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                  t.status === "ACTIVE"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-red-950 text-red-400 border border-red-800"
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedCentralForStats(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
