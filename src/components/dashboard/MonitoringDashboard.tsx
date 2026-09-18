import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  Radio,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  Eye,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  Filter,
  Flame,
  Brain,
  Activity,
  Building2,
  Search,
  Store,
  Mail,
  Users,
  Lock,
  Trash2,
  Camera,
  Pencil,
} from "lucide-react";
import { PanicAlert, AlertStatus } from "../../types.js";
import { BurstViewer } from "./BurstViewer.js";
import { TacticalMap } from "./TacticalMap.js";
import { AiVerdictPanel } from "./AiVerdictPanel.js";
import { EmergencyModal } from "./EmergencyModal.js";
import { alarmSound } from "../../utils/audio.js";
import { useAuth } from "../../context/AuthContext.js";

interface MonitoringDashboardProps {
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
  deleteAlert: (alertId: string) => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  alerts,
  isConnected,
  activeEmergencyModalAlert,
  setActiveEmergencyModalAlert,
  isAudioAlarmActive,
  acknowledgeAlarmSound,
  updateAlertStatus,
  deleteAlert,
}) => {
  const { centrales, systemSettings, appUser, terminals, updateTerminalStatus, deleteTerminal, updateTerminal } = useAuth();

  // Edit Terminal State
  const [editingTerminal, setEditingTerminal] = useState<any | null>(null);
  const [editTermGoogleEmail, setEditTermGoogleEmail] = useState("");
  const [editTermPassword, setEditTermPassword] = useState("");
  const [editTermCentralId, setEditTermCentralId] = useState("");
  const [editTermStoreName, setEditTermStoreName] = useState("");
  const [editTermOwnerName, setEditTermOwnerName] = useState("");
  const [editTermPhone, setEditTermPhone] = useState("");
  const [editTermAddress, setEditTermAddress] = useState("");
  const [editTermCity, setEditTermCity] = useState("");
  const [editTermCategory, setEditTermCategory] = useState("");
  const [editTermPanicHotkey, setEditTermPanicHotkey] = useState("P");
  const [editTermPanicHotkeyMode, setEditTermPanicHotkeyMode] = useState<"DIRECT" | "ALT_COMBINATION">("DIRECT");
  const [isSubmittingEditTerminal, setIsSubmittingEditTerminal] = useState(false);

  const startEditTerminal = (terminal: any) => {
    setEditingTerminal(terminal);
    setEditTermGoogleEmail(terminal.email || "");
    setEditTermPassword(terminal.password || "");
    setEditTermCentralId(terminal.centralId || appUser?.centralId || "");
    setEditTermStoreName(terminal.storeName || "");
    setEditTermOwnerName(terminal.ownerName || "");
    setEditTermPhone(terminal.phone || "");
    setEditTermAddress(terminal.address || "");
    setEditTermCity(terminal.city || "Ciudad de México, CDMX");
    setEditTermCategory(terminal.category || "Comercio General");
    setEditTermPanicHotkey(terminal.panicHotkey || "P");
    setEditTermPanicHotkeyMode(terminal.panicHotkeyMode || "DIRECT");
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
        panicHotkey: editTermPanicHotkey,
        panicHotkeyMode: editTermPanicHotkeyMode,
        centralId: selectedCentral?.id || editingTerminal.centralId || appUser?.centralId,
        centralName: selectedCentral?.name || editingTerminal.centralName || appUser?.centralName,
      });
      setEditingTerminal(null);
    } catch (err: any) {
      console.error("Error al actualizar la terminal:", err);
    } finally {
      setIsSubmittingEditTerminal(false);
    }
  };

  const assignedCentralName = React.useMemo(() => {
    if (!appUser) return "Central de Monitoreo";
    const match = centrales.find(c => (c.email || "").toLowerCase() === (appUser.email || "").toLowerCase() || c.id === appUser.centralId);
    return match?.name || appUser.centralName || appUser.displayName || appUser.storeName || "Central de Monitoreo";
  }, [appUser, centrales]);
  const [activeTab, setActiveTab] = useState<"VERIFICATION" | "TERMINALS">("TERMINALS");
  const [terminalSearch, setTerminalSearch] = useState("");
  const [liveCameraTerminalId, setLiveCameraTerminalId] = useState<string | null>(null);
  const liveCameraTerminal = terminals.find(t => t.id === liveCameraTerminalId);
  const [liveStreamFrames, setLiveStreamFrames] = useState<Record<string, string>>({});

  useEffect(() => {
    const socket = (window as any).__panicSocket;
    if (!socket) return;
    const handleFrameUpdate = ({ terminalId, frameData }: { terminalId: string; frameData: string }) => {
      setLiveStreamFrames(prev => ({ ...prev, [terminalId]: frameData }));
    };
    socket.on("terminal:frame:update", handleFrameUpdate);
    return () => {
      socket.off("terminal:frame:update", handleFrameUpdate);
    };
  }, []);
  const [confirmingDeactivateTerminalId, setConfirmingDeactivateTerminalId] = useState<string | null>(null);
  const [confirmingDeleteTerminalId, setConfirmingDeleteTerminalId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCentral, setFilterCentral] = useState<string>("ALL");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alerts.length > 0 ? alerts[0].id : null
  );
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Filter terminals for the current Central (or all if Super Admin on this view)
  const myTerminals = terminals.filter((t) => {
    if (appUser && appUser.role !== "SUPER_ADMIN" && t.centralId !== appUser.centralId) {
      return false;
    }
    return true;
  });

  const filteredTerminals = myTerminals.filter((t) => {
    const q = (terminalSearch || "").toLowerCase().trim();
    if (!q) return true;
    return (
      (t.storeName || "").toLowerCase().includes(q) ||
      (t.storeId || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.ownerName || "").toLowerCase().includes(q) ||
      (t.address || "").toLowerCase().includes(q) ||
      (t.city || "").toLowerCase().includes(q)
    );
  });

  // Toggle audio mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    alarmSound.setMuted(nextMute);
  };

  // Test sound button
  const handleTestSound = () => {
    alarmSound.playAlertNotification();
  };

  // Run synthetic test alert on the server
  const handleTriggerSimulation = async (scenario: "armed" | "silent" | "drill") => {
    try {
      setIsSimulating(true);
      await fetch("/api/alerts/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered alerts list
  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus = filterStatus === "ALL" || alert.status === filterStatus;
    const matchesCentral =
      filterCentral === "ALL" ||
      alert.centralId === filterCentral ||
      alert.store?.centralId === filterCentral;
    return matchesStatus && matchesCentral;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || filteredAlerts[0] || alerts[0];

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const dispatchedCount = alerts.filter((a) => a.status === "DISPATCHED").length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Pop-up Emergency Modal when alert arrives */}
      {activeEmergencyModalAlert && (
        <EmergencyModal
          alert={activeEmergencyModalAlert}
          isAudioAlarmActive={isAudioAlarmActive}
          onAcknowledgeAlarm={acknowledgeAlarmSound}
          onClose={() => setActiveEmergencyModalAlert(null)}
          onUpdateStatus={updateAlertStatus}
        />
      )}

      {/* Audio Alarm Active Floating Banner */}
      {isAudioAlarmActive && (
        <div className="bg-red-600 border-2 border-red-400 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 animate-spin" />
            <div>
              <h4 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                🚨 ALERTA DE PÁNICO EN TRANSMISIÓN INMEDIATA
              </h4>
              <p className="text-xs text-red-100">
                Se detectó una nueva activación de botón de pánico con ráfaga fotográfica.
              </p>
            </div>
          </div>
          <button
            onClick={acknowledgeAlarmSound}
            className="px-4 py-2 rounded-xl bg-white text-red-700 font-bold text-xs hover:bg-red-50 transition-all shadow cursor-pointer"
          >
            Reconocer y Silenciar
          </button>
        </div>
      )}

      {/* Top Console Header */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-950">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
                  CENTRAL: {assignedCentralName}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 ${
                    isConnected
                      ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                      : "bg-red-950 border border-red-500/40 text-red-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    }`}
                  />
                  {isConnected ? "Socket Enlace Activo" : "Reconectando..."}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {assignedCentralName}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Consola Operativa de Monitoreo C4/C5 & Videoverificación Forense.
            </p>
          </div>
        </div>

        {/* Audio & Quick Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isMuted
                ? "bg-slate-800 border-slate-700 text-slate-400"
                : "bg-blue-950/60 border-blue-500/30 text-blue-300"
            }`}
            title="Silenciar / Activar sonido de alarma"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {isMuted ? "Sonido Desactivado" : "Audio Alarma Listo"}
          </button>

          <button
            onClick={handleTestSound}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Probar Tono
          </button>

          <button
            onClick={() => handleTriggerSimulation("armed")}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isSimulating ? "Simulando..." : "Simular Alerta"}
          </button>
        </div>
      </div>

      {/* Top Operational Metrics Bar */}
      <div className={`grid gap-4 ${
        systemSettings?.aiEnabled 
          ? "grid-cols-2 sm:grid-cols-4" 
          : "grid-cols-1 sm:grid-cols-3"
      }`}>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Emergencias Activas</div>
            <div className="text-2xl font-black text-red-400 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Patrullas Despachadas</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{dispatchedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Latencia Transmisión</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">&lt; 150 ms</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {systemSettings?.aiEnabled && (
          <div className="border rounded-2xl p-4 flex items-center justify-between transition-all duration-300 bg-slate-900/80 border-slate-800">
            <div>
              <div className="text-xs text-slate-400 font-medium">Motor Forense</div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-bold font-mono text-purple-300">
                  Verificación Activa
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-slate-800 gap-6 pt-2">
        <button
          onClick={() => setActiveTab("TERMINALS")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "TERMINALS"
              ? "border-blue-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-400" />
          <span>🏪 Terminales de tu Central</span>
          <span className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {myTerminals.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("VERIFICATION")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "VERIFICATION"
              ? "border-red-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4 text-red-500" />
          <span>Registro de Alertas</span>
          {activeCount > 0 && (
            <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse font-mono font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "VERIFICATION" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Alerts Inbox List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Bitácora de Alertas ({filteredAlerts.length})
              </h3>
            </div>

            {/* Filter Tabs & Central Filter */}
            <div className="space-y-2 pb-1">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ALL", label: "Todas" },
                  { id: "ACTIVE", label: "Activas 🚨" },
                  { id: "DISPATCHED", label: "Despachadas" },
                  { id: "RESOLVED", label: "Cerradas" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      filterStatus === tab.id
                        ? "bg-slate-100 text-slate-950"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Central Filter Dropdown */}
              {appUser?.role === "SUPER_ADMIN" && centrales.length > 0 && (
                <div className="pt-1">
                  <select
                    value={filterCentral}
                    onChange={(e) => setFilterCentral(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-red-500 font-mono"
                  >
                    <option value="ALL">Todas las Centrales ({centrales.length})</option>
                    {centrales.map((c) => (
                      <option key={c.id} value={c.id}>
                        📍 {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Alert Cards Feed */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredAlerts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No hay alertas registradas con este filtro.
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const isSelected = alert.id === selectedAlert?.id;
                  const originCentral = alert.centralName || alert.store?.centralName || "C4 Poniente CDMX";
                  return (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden space-y-1.5 ${
                        isSelected
                          ? "bg-slate-800/90 border-blue-500/80 shadow-md ring-1 ring-blue-500/50"
                          : alert.status === "ACTIVE"
                          ? "bg-red-950/30 border-red-900/60 hover:bg-slate-800/60"
                          : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/40"
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {alert.store.storeName}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                            alert.status === "ACTIVE"
                              ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                              : alert.status === "DISPATCHED"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>

                      {/* Origin Central Tag Badge */}
                      <div className="flex items-center gap-1.5 text-[10px] text-red-300 font-mono bg-red-950/50 px-2 py-0.5 rounded-md border border-red-900/40 truncate">
                        <Building2 className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">Central: {originCentral}</span>
                      </div>

                      {/* Store & Time */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[150px]">{alert.store.city}</span>
                        <span className="font-mono text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Image thumbnails strip */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {alert.images.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                            <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>

                      {/* Threat pill bottom */}
                      {systemSettings?.aiEnabled && alert.aiVerdict && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Brain className="w-3 h-3 text-purple-400" />
                            Análisis Forense:
                          </span>
                          <span
                            className={`font-black uppercase px-2 py-0.5 rounded ${
                              alert.aiVerdict.threatLevel === "CRITICAL"
                                ? "bg-red-950 text-red-300"
                                : alert.aiVerdict.threatLevel === "HIGH"
                                ? "bg-orange-950 text-orange-300"
                                : "bg-purple-950 text-purple-300"
                            }`}
                          >
                            {alert.aiVerdict.threatLevel} ({alert.aiVerdict.confidenceScore}%)
                          </span>
                        </div>
                      )}

                      {/* Delete individual record button */}
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="font-mono text-slate-500">ID: {alert.id}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Eliminar registro de alerta ${alert.id}?`)) {
                              deleteAlert(alert.id);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-900/50 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Eliminar este registro de alerta"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Borrar</span>
                        </button>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Detailed Inspection & Dispatch Terminal (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedAlert ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
              {/* Header for selected alert */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {selectedAlert.id}
                    </span>
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {selectedAlert.store.storeName}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Recibido: {new Date(selectedAlert.timestamp).toLocaleString()}
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedAlert.store.address}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveEmergencyModalAlert(selectedAlert)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-blue-400" />
                    Modo Pantalla Completa
                  </button>
                </div>
              </div>

              {/* Grid: 3-Frame Burst Viewer & GPS Map */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                    Ráfaga Fotográfica de Videoverificación:
                  </h4>
                  <BurstViewer
                    images={selectedAlert.images}
                    evidenceTimeline={selectedAlert.aiVerdict?.evidenceTimeline}
                  />
                </div>

                <div className="md:col-span-5 space-y-4">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                    Ubicación Satelital GPS:
                  </h4>
                  <TacticalMap
                    coordinates={selectedAlert.store.coordinates}
                    storeName={selectedAlert.store.storeName}
                    address={selectedAlert.store.address}
                  />

                  {/* Store Contact card */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contacto Directo:</span>
                      <span className="font-semibold text-white">{selectedAlert.store.ownerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Teléfono:</span>
                      <a href={`tel:${selectedAlert.store.phone}`} className="font-mono text-emerald-400 font-bold hover:underline">
                        {selectedAlert.store.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Verification Verdict */}
              <AiVerdictPanel
                verdict={selectedAlert.aiVerdict}
                aiStatus={selectedAlert.aiStatus}
                aiError={selectedAlert.aiError}
              />

              {/* Event Logs Timeline */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Bitácora de Eventos y Trazabilidad en Tiempo Real:
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedAlert.logs
                    .filter((log) => !log.action.includes("Análisis Automatizado Desactivado"))
                    .map((log, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs py-1 border-b border-slate-900">
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <div className="flex-1 text-slate-300">
                          <span className="font-medium text-slate-200">{log.action}</span>
                          {log.operator && (
                            <span className="text-blue-400 ml-1.5">[{log.operator}]</span>
                          )}
                          {log.details && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-500">
              Selecciona una alerta en la lista izquierda para inspeccionar fotogramas y dictamen analítico.
            </div>
          )}
        </div>
      </div>
    ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-450" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Terminales de tu Central ({filteredTerminals.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                onClick={() => {
                  const btn = document.getElementById("btn-admin-terminals");
                  if (btn) btn.click();
                }}
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
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No se encontraron terminales registradas</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No hay terminales afiliadas a tu central que coincidan con la búsqueda. Puedes dar de alta una nueva con el botón superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTerminals.map((t) => {
                const isActive = t.status === "ACTIVE";

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

                        <div className="flex items-center gap-1.5">
                          {t.isOnline && (
                            <button
                              onClick={() => setLiveCameraTerminalId(t.id)}
                              className="text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 cursor-pointer animate-pulse hover:bg-emerald-600/40"
                              title="Ver transmisión en tiempo real de la terminal abierta"
                              type="button"
                            >
                              <Radio className="w-2.5 h-2.5" />
                              <span>EN VIVO</span>
                            </button>
                          )}
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
                      </div>

                      {/* Contact & Location Info */}
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-white font-semibold truncate">{t.email}</span>
                        </div>

                        {t.password && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="text-slate-500 font-mono font-bold">Contraseña:</span>
                            <span className="font-mono text-emerald-400 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded font-bold select-all text-[11px]">
                              {t.password}
                            </span>
                          </div>
                        )}

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
                        <button
                          onClick={() => startEditTerminal(t)}
                          className="px-2 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 text-blue-300 font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-colors"
                          title="Editar información de la terminal"
                          type="button"
                        >
                          <Pencil className="w-3 h-3 text-blue-400" />
                          <span>Editar</span>
                        </button>

                        {isActive ? (
                          confirmingDeactivateTerminalId === t.id ? (
                            <div className="flex items-center gap-1 bg-red-950/50 border border-red-900/40 px-1.5 py-0.5 rounded-lg">
                              <span className="text-[9px] text-red-400 font-bold mr-0.5">¿Baja?</span>
                              <button
                                onClick={async () => {
                                  await updateTerminalStatus(t.id, "INACTIVE");
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
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 font-bold text-[10px] cursor-pointer"
                          >
                            Reactivar
                          </button>
                        )}

                        {confirmingDeleteTerminalId === t.id ? (
                          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-800 animate-pulse">
                            <span className="text-[9px] text-red-400 font-bold">¿Eliminar?</span>
                            <button
                              onClick={async () => {
                                await deleteTerminal(t.id, true);
                                setConfirmingDeleteTerminalId(null);
                              }}
                              className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black cursor-pointer"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmingDeleteTerminalId(null)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-black cursor-pointer"
                              type="button"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteTerminalId(t.id)}
                            className="p-1 text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                            title="Eliminar terminal definitivamente"
                            type="button"
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

      {/* Live Camera Modal for Open Terminals */}
      {liveCameraTerminal && (() => {
        const isEmergencyActive = alerts.some(
          (a) => a.store.storeId === liveCameraTerminal.storeId && a.status === "ACTIVE"
        );
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${isEmergencyActive ? "bg-red-500 animate-ping" : "bg-blue-500"}`} />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-slate-300" />
                      <span>Cámara en Tiempo Real: {liveCameraTerminal.storeName}</span>
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {liveCameraTerminal.storeId} — {isEmergencyActive ? "🔴 Transmisión de Emergencia" : "🔒 Canal Seguro (Modo de Privacidad)"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setLiveCameraTerminalId(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  type="button"
                >
                  Cerrar
                </button>
              </div>

              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                {isEmergencyActive ? (
                  liveStreamFrames[liveCameraTerminal.id] ? (
                    <>
                      <img
                        src={liveStreamFrames[liveCameraTerminal.id]}
                        alt="Transmisión en vivo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-red-950/90 backdrop-blur px-2.5 py-1 rounded-lg border border-red-500/30 flex items-center gap-1.5 text-[10px] font-mono text-red-400 font-bold animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>EMERGENCIA ACTIVA - TRANSMISIÓN DE SEGURIDAD (5 MINS)</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-3 p-6 max-w-sm">
                      <Radio className="w-10 h-10 animate-pulse text-red-500 mx-auto" />
                      <p className="text-xs font-bold text-red-400 uppercase">Sincronizando con la terminal...</p>
                      <p className="text-[11px] text-slate-500">Conectando canal de videoverificación prioritario de 8 FPS.</p>
                    </div>
                  )
                ) : (
                  <div className="text-center p-6 max-w-md space-y-3">
                    <ShieldCheck className="w-12 h-12 text-blue-500 mx-auto opacity-80" />
                    <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">Cámara en Modo de Privacidad / Espera</p>
                    <p className="text-xs text-slate-400 px-4">
                      Por políticas de privacidad del comercio y optimización de datos, la cámara del comercio permanece apagada en tiempo de paz.
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Transmisión activa únicamente durante un pánico (5 minutos máximo)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>Titular: <span className="text-white">{liveCameraTerminal.ownerName}</span></div>
                <div>Ubicación: <span className="text-white">{liveCameraTerminal.address}, {liveCameraTerminal.city}</span></div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: EDITAR TERMINAL (CENTRAL OPERATOR) */}
      {editingTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Datos de Terminal</h3>
                  <p className="text-xs text-slate-400">
                    Modifica los datos operativos de esta terminal de comercio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTerminal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditTerminalSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correo Autorizado de Terminal <span className="text-red-400">*</span>:
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
                    Contraseña / PIN de Acceso:
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editTermPassword}
                      onChange={(e) => setEditTermPassword(e.target.value)}
                      placeholder="Clave para la terminal"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-red-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nombre del Comercio <span className="text-red-400">*</span>:
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
                    Propietario / Encargado:
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
                    Teléfono Directo:
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
                    Dirección del Establecimiento:
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
                    Ciudad / Municipio:
                  </label>
                  <input
                    type="text"
                    value={editTermCity}
                    onChange={(e) => setEditTermCity(e.target.value)}
                    placeholder="Ej: Miguel Hidalgo, CDMX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-800 space-y-3">
                  <label className="block text-slate-300 font-semibold">Configuración de Tecla de Pánico (Teclado de Terminal):</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Tecla Asociada:</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={editTermPanicHotkey}
                        onChange={(e) => setEditTermPanicHotkey(e.target.value)}
                        placeholder="Ej. p, space, f9"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Modo de Activación:</label>
                      <select
                        value={editTermPanicHotkeyMode}
                        onChange={(e) => setEditTermPanicHotkeyMode(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-red-500"
                      >
                        <option value="DIRECT">Directa (Ej. Presionar tecla)</option>
                        <option value="ALT_COMBINATION">Combinación (ALT + Tecla)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Define la tecla rápida que el operador o comerciante presionará en su teclado físico para disparar la alerta de pánico instantáneamente.
                  </p>
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
    </div>
  );
};
