import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldAlert,
  Shield,
  ShieldCheck,
  Radio,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  User,
  Clock,
  ExternalLink,
  Send,
  Sparkles,
  Maximize2,
  X,
  Smartphone,
  Store as StoreIcon,
  LogOut,
  Settings,
  ChevronRight,
  BellRing
} from "lucide-react";
import { PanicAlert, AlertStatus } from "../../types.js";
import { alarmSound } from "../../utils/audio.js";
import { useAuth } from "../../context/AuthContext.js";

interface GuardPortalProps {
  alerts: PanicAlert[];
  isConnected: boolean;
  updateAlertStatus: (alertId: string, status: AlertStatus, operatorName?: string, notes?: string, unit?: string) => void;
  onOpenStoreConfig?: () => void;
}

export const GuardPortal: React.FC<GuardPortalProps> = ({
  alerts,
  isConnected,
  updateAlertStatus,
}) => {
  const { appUser, terminals, logout } = useAuth();

  // Guard profile stored locally on the phone
  const [guardName, setGuardName] = useState<string>(() => {
    return localStorage.getItem("pg_guard_name") || appUser?.displayName || "Oficial de Seguridad";
  });
  const [guardBadge, setGuardBadge] = useState<string>(() => {
    return localStorage.getItem("pg_guard_badge") || "SEC-01";
  });
  const [isOnDuty, setIsOnDuty] = useState<boolean>(() => {
    return localStorage.getItem("pg_guard_duty") !== "false";
  });

  // Store-specific binding (restricts alerts to this store only if set)
  const [assignedStoreId, setAssignedStoreId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const sid = url.searchParams.get("storeId");
      if (sid) return sid;
      if (window.location.hash.includes("storeId=")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
        const hSid = hashParams.get("storeId");
        if (hSid) return hSid;
      }
    }
    return localStorage.getItem("pg_guard_store_id") || "";
  });

  const [assignedStoreName, setAssignedStoreName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const sname = url.searchParams.get("storeName");
      if (sname) return decodeURIComponent(sname);
      if (window.location.hash.includes("storeName=")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
        const hSname = hashParams.get("storeName");
        if (hSname) return decodeURIComponent(hSname);
      }
    }
    return localStorage.getItem("pg_guard_store_name") || "";
  });

  // State for alert viewing & actions
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isZoomImageOpen, setIsZoomImageOpen] = useState<boolean>(false);
  const [quickNoteText, setQuickNoteText] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAudioTestActive, setIsAudioTestActive] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  // Screen WakeLock ref
  const wakeLockRef = useRef<any>(null);

  // Read URL query parameters for store binding
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let sid = url.searchParams.get("storeId");
      let sname = url.searchParams.get("storeName");

      if (!sid && window.location.hash.includes("storeId=")) {
        const hashParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
        sid = hashParams.get("storeId");
        sname = hashParams.get("storeName");
      }

      if (sid) {
        setAssignedStoreId(sid);
        localStorage.setItem("pg_guard_store_id", sid);
        if (sname) {
          const decoded = decodeURIComponent(sname);
          setAssignedStoreName(decoded);
          localStorage.setItem("pg_guard_store_name", decoded);
        }
      }
    } catch {}
  }, []);

  // Filter alerts: only show for assigned store if bound, or all if general
  const relevantAlerts = useMemo(() => {
    if (assignedStoreId && assignedStoreId.trim() !== "" && assignedStoreId !== "ALL") {
      return alerts.filter(
        (a) =>
          a.store?.storeId === assignedStoreId ||
          (assignedStoreName && a.store?.storeName?.toLowerCase() === assignedStoreName.toLowerCase())
      );
    }
    return alerts;
  }, [alerts, assignedStoreId, assignedStoreName]);

  const activeAlerts = useMemo(() => {
    return relevantAlerts.filter((a) => a.status === "ACTIVE");
  }, [relevantAlerts]);

  // Current emergency requiring attention
  const currentEmergency: PanicAlert | null = useMemo(() => {
    if (selectedAlertId) {
      const found = relevantAlerts.find((a) => a.id === selectedAlertId);
      if (found) return found;
    }
    return activeAlerts[0] || relevantAlerts[0] || null;
  }, [relevantAlerts, activeAlerts, selectedAlertId]);

  // Persist Profile
  useEffect(() => {
    localStorage.setItem("pg_guard_name", guardName);
    localStorage.setItem("pg_guard_badge", guardBadge);
    localStorage.setItem("pg_guard_duty", isOnDuty.toString());
    localStorage.setItem("pg_guard_store_id", assignedStoreId);
    localStorage.setItem("pg_guard_store_name", assignedStoreName);
  }, [guardName, guardBadge, isOnDuty, assignedStoreId, assignedStoreName]);

  // Screen WakeLock so phone stays awake
  useEffect(() => {
    const requestWakeLock = async () => {
      if (isOnDuty && "wakeLock" in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch {}
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {}
      }
    };
  }, [isOnDuty]);

  // Auto-siren & vibration when active emergency matches this guard
  const previousActiveCount = useRef<number>(0);
  useEffect(() => {
    if (isOnDuty && activeAlerts.length > 0) {
      if (activeAlerts.length > previousActiveCount.current) {
        alarmSound.playGuardTacticalSiren();

        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            try {
              new Notification("🚨 ¡EMERGENCIA EN CURSO!", {
                body: `${activeAlerts[0].store.storeName} (${activeAlerts[0].store.address})`,
                icon: "/favicon.ico",
              });
            } catch {}
          }
        }
      }
    }
    previousActiveCount.current = activeAlerts.length;
  }, [activeAlerts.length, isOnDuty]);

  // Test sound & vibration
  const handleTestSiren = () => {
    setIsAudioTestActive(true);
    alarmSound.playGuardTacticalSiren();
    setTimeout(() => {
      setIsAudioTestActive(false);
    }, 2000);
  };

  // Guard Actions (1-Tap Response Protocol)
  const handleDispatchEnCamino = (alert: PanicAlert) => {
    alarmSound.stopAlarm();
    alarmSound.playSuccessTone();
    const officerLabel = `${guardName} (${guardBadge})`;
    updateAlertStatus(
      alert.id,
      "DISPATCHED",
      officerLabel,
      `Guardia ${officerLabel} va en camino hacia el local.`,
      `Guardia: ${guardName}`
    );

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `🏃 Guardia ${officerLabel} acudiendo al local.`,
        author: officerLabel,
      });
    }
  };

  const handleArrivedOnSite = (alert: PanicAlert) => {
    alarmSound.playSuccessTone();
    const officerLabel = `${guardName} (${guardBadge})`;
    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `📍 Guardia ${officerLabel} EN EL SITIO. Verificando perímetro.`,
        author: officerLabel,
      });
    }
  };

  const handlePerimeterSecured = (alert: PanicAlert) => {
    alarmSound.playSuccessTone();
    const officerLabel = `${guardName} (${guardBadge})`;
    updateAlertStatus(
      alert.id,
      "RESOLVED",
      officerLabel,
      `Perímetro asegurado y situación controlada por ${officerLabel}.`
    );

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `🛡️ Situación controlada y asegurada por ${officerLabel}.`,
        author: officerLabel,
      });
    }
  };

  const handleSendQuickNote = (alert: PanicAlert, noteText?: string) => {
    const textToSend = noteText || quickNoteText;
    if (!textToSend.trim()) return;

    const officerLabel = `${guardName} (${guardBadge})`;
    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: textToSend.trim(),
        author: officerLabel,
      });
    }
    setQuickNoteText("");
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-8">
      {/* MOBILE TACTICAL TOP BAR */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-3 shadow-md">
        <div className="flex items-center justify-between gap-2">
          {/* Officer identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all ${
                isOnDuty
                  ? "bg-emerald-600 shadow-md shadow-emerald-950 ring-2 ring-emerald-400/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-black text-white text-sm truncate">{guardName}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-bold border border-amber-500/30 flex-shrink-0">
                  {guardBadge}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <span className="truncate">{isConnected ? "Canal Táctico Activo" : "Reconectando..."}</span>
              </div>
            </div>
          </div>

          {/* Quick duty toggle & action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                isOnDuty
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
              title="Cambiar estado de guardia"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnDuty ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
              <span>{isOnDuty ? "EN TURNO" : "PAUSA"}</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Ajustes de guardia"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/80 hover:text-red-400 hover:border-red-800 border border-slate-700 text-slate-400 transition-all cursor-pointer"
              title="Cerrar sesión de guardia"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Assigned Terminal/Store Filter Status */}
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 text-slate-300 truncate">
            {assignedStoreId && assignedStoreId !== "ALL" ? (
              <span className="flex items-center gap-1 text-amber-300 font-bold font-mono truncate">
                <StoreIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">Local: {assignedStoreName || assignedStoreId}</span>
              </span>
            ) : (
              <span className="text-blue-300 font-mono flex items-center gap-1">
                🌐 Patrullaje General (Toda la Plaza)
              </span>
            )}
          </div>

          <button
            onClick={handleTestSiren}
            disabled={isAudioTestActive}
            className="text-[10px] text-amber-400 font-mono flex items-center gap-1 hover:underline cursor-pointer flex-shrink-0"
          >
            <Volume2 className={`w-3 h-3 ${isAudioTestActive ? "animate-bounce text-red-400" : ""}`} />
            <span>Probar Sirena</span>
          </button>
        </div>
      </div>

      {/* QUICK SETTINGS PANEL (COLLAPSIBLE) */}
      {isSettingsOpen && (
        <div className="m-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-mono">⚙️ Perfil del Guardia</h4>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Nombre del Oficial:</label>
              <input
                type="text"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Indicativo / Placa:</label>
              <input
                type="text"
                value={guardBadge}
                onChange={(e) => setGuardBadge(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-amber-300 mb-0.5 font-bold">
                🎯 Asignación de Terminal / Local:
              </label>
              <select
                value={assignedStoreId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssignedStoreId(val);
                  const selectedT = terminals.find((t) => t.storeId === val);
                  setAssignedStoreName(selectedT?.storeName || "");
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="">🌐 Patrullaje General (Todos los Locales)</option>
                {terminals.map((t) => (
                  <option key={t.id} value={t.storeId}>
                    🏬 {t.storeName} ({t.storeId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRIMARY EMERGENCY VIEW (MOBILE ONLY) ================= */}
      <div className="flex-1 p-3 space-y-3">
        {currentEmergency ? (
          <div
            className={`rounded-2xl border overflow-hidden shadow-2xl transition-all ${
              currentEmergency.status === "ACTIVE"
                ? "bg-slate-900 border-red-500 ring-2 ring-red-500/30"
                : currentEmergency.status === "DISPATCHED"
                ? "bg-slate-900 border-amber-500/80"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {/* Emergency Alert Banner */}
            <div
              className={`p-3 text-white flex items-center justify-between gap-2 ${
                currentEmergency.status === "ACTIVE"
                  ? "bg-gradient-to-r from-red-600 to-red-800 animate-pulse"
                  : currentEmergency.status === "DISPATCHED"
                  ? "bg-gradient-to-r from-amber-600 to-amber-800"
                  : currentEmergency.status === "RESOLVED"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-800"
                  : "bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <div>
                  <span className="font-black text-xs sm:text-sm uppercase block tracking-tight">
                    {currentEmergency.status === "ACTIVE"
                      ? "🚨 ¡ALERTA DE PÁNICO ACTIVA!"
                      : currentEmergency.status === "DISPATCHED"
                      ? "🏃 ACUDIENDO AL LOCAL"
                      : "✅ INCIDENTE ASEGURADO"}
                  </span>
                  <span className="text-[10px] text-white/80 font-mono">
                    {new Date(currentEmergency.timestamp).toLocaleTimeString()} • {currentEmergency.id}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-black bg-black/40 px-2 py-0.5 rounded border border-white/20">
                {currentEmergency.status}
              </span>
            </div>

            <div className="p-3 space-y-3">
              {/* Store Information & Direct Action Buttons */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div>
                  <span className="text-[9px] font-mono text-red-400 font-bold uppercase">COMERCIO AFECTADO</span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {currentEmergency.store.storeName}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentEmergency.store.category} • {currentEmergency.store.storeId}
                  </p>
                </div>

                {/* Address */}
                <div className="text-xs text-slate-300 flex items-start gap-1.5 pt-1 border-t border-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{currentEmergency.store.address}</span>
                </div>

                {/* Contact and GPS Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`tel:${currentEmergency.store.phone}`}
                    className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Llamar Local</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${currentEmergency.store.coordinates.latitude},${currentEmergency.store.coordinates.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>Ruta GPS</span>
                  </a>
                </div>
              </div>

              {/* EVIDENCE PHOTO VIEWER (MOBILE ADAPTED) */}
              {currentEmergency.images && currentEmergency.images.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      📸 FOTOS DE EVIDENCIA ({selectedFrameIndex + 1}/{currentEmergency.images.length})
                    </span>
                    <button
                      onClick={() => setIsZoomImageOpen(true)}
                      className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Zoom</span>
                    </button>
                  </div>

                  {/* Main Image Frame */}
                  <div className="relative aspect-video rounded-lg bg-black overflow-hidden border border-slate-800">
                    <img
                      src={currentEmergency.images[selectedFrameIndex] || currentEmergency.images[0]}
                      alt="Evidencia"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setIsZoomImageOpen(true)}
                    />

                    {/* Thumbnail selectors */}
                    <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                      {currentEmergency.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                            selectedFrameIndex === idx
                              ? "bg-red-600 text-white"
                              : "bg-black/70 text-slate-300"
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 3 GIANT ONE-TAP ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                  ⚡ RESPUESTA TÁCTICA DEL GUARDIA:
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {/* 1. Voy en camino */}
                  <button
                    onClick={() => handleDispatchEnCamino(currentEmergency)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/60 cursor-pointer"
                  >
                    <Navigation className="w-5 h-5 animate-pulse" />
                    <span>1. VOY EN CAMINO (Acudiendo)</span>
                  </button>

                  {/* 2. En el sitio */}
                  <button
                    onClick={() => handleArrivedOnSite(currentEmergency)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/60 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>2. EN EL SITIO (Verificando)</span>
                  </button>

                  {/* 3. Asegurado */}
                  <button
                    onClick={() => handlePerimeterSecured(currentEmergency)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>3. PERÍMETRO ASEGURADO</span>
                  </button>
                </div>
              </div>

              {/* QUICK CHIPS FOR LOGS */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">
                  📝 REPORTE RÁPIDO A CENTRAL:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Perímetro despejado",
                    "Sujeto huyó hacia la calle",
                    "Policía en sitio",
                    "Cajero a salvo",
                    "Falsa alarma",
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuickNote(currentEmergency, chip)}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[10px] text-slate-300 cursor-pointer active:scale-95"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STANDBY STATE (NO ACTIVE EMERGENCY) */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                Perímetro en Calma
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {assignedStoreId
                  ? `Monitoreando exclusivamente el local: ${assignedStoreName || assignedStoreId}`
                  : "Monitoreando todos los locales de la plaza comercial."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sirena y vibración táctica activas</span>
            </div>

            <div className="pt-2">
              <button
                onClick={handleTestSiren}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Volume2 className="w-4 h-4" />
                <span>Hacer Prueba de Sirena</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN IMAGE MODAL */}
      {isZoomImageOpen && currentEmergency && currentEmergency.images && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-3"
          onClick={() => setIsZoomImageOpen(false)}
        >
          <div className="relative w-full max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setIsZoomImageOpen(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-xl bg-slate-800 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentEmergency.images[selectedFrameIndex] || currentEmergency.images[0]}
              alt="Evidencia Zoom"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800"
            />
            <div className="mt-2 text-center text-xs font-mono text-slate-400">
              {currentEmergency.store.storeName} • Cuadro #{selectedFrameIndex + 1}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
