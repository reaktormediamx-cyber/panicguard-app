import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldAlert,
  Shield,
  ShieldCheck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  User,
  Clock,
  Maximize2,
  X,
  Store as StoreIcon,
  LogOut,
  QrCode,
  Radio,
  Send,
  Sparkles,
  Smartphone,
  Check,
  Download,
  Info,
  BatteryCharging,
  BellRing,
  CameraOff,
} from "lucide-react";
import { PanicAlert, AlertStatus } from "../../types.js";
import { alarmSound } from "../../utils/audio.js";
import { useAuth } from "../../context/AuthContext.js";
import { TacticalMap } from "../dashboard/TacticalMap.js";

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
  const [isOnDuty, setIsOnDuty] = useState<boolean>(() => {
    return localStorage.getItem("pg_guard_duty") !== "false";
  });

  // Function to extract store binding from window URL (search or hash)
  const extractStoreParamsFromUrl = () => {
    if (typeof window === "undefined") return { sid: "", sname: "" };
    try {
      const url = new URL(window.location.href);
      let sid = url.searchParams.get("storeId") || url.searchParams.get("storeid") || "";
      let sname = url.searchParams.get("storeName") || url.searchParams.get("storename") || "";

      if (!sid && window.location.hash) {
        const hash = window.location.hash;
        let queryPart = "";
        if (hash.includes("?")) {
          queryPart = hash.split("?")[1] || "";
        } else if (hash.includes("storeId=") || hash.includes("storeid=")) {
          queryPart = hash.replace(/^#\/?guard\??/i, "");
        }
        if (queryPart) {
          const hashParams = new URLSearchParams(queryPart);
          if (!sid) sid = hashParams.get("storeId") || hashParams.get("storeid") || "";
          if (!sname) sname = hashParams.get("storeName") || hashParams.get("storename") || "";
        }
      }

      return {
        sid: sid.trim(),
        sname: sname ? decodeURIComponent(sname.trim()) : ""
      };
    } catch {
      return { sid: "", sname: "" };
    }
  };

  // Store-specific binding locked to the scanned QR code
  const [assignedStoreId, setAssignedStoreId] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.sid) return fromUrl.sid;
    return localStorage.getItem("pg_guard_store_id") || "";
  });

  const [assignedStoreName, setAssignedStoreName] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.sname) return fromUrl.sname;
    return localStorage.getItem("pg_guard_store_name") || "";
  });

  // State for alert viewing & actions
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isZoomImageOpen, setIsZoomImageOpen] = useState<boolean>(false);
  const [quickNoteText, setQuickNoteText] = useState<string>("");
  const [isAudioTestActive, setIsAudioTestActive] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [showTacticalMap, setShowTacticalMap] = useState<boolean>(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(() => {
    return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isApkInfoModalOpen, setIsApkInfoModalOpen] = useState<boolean>(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  });

  // Listen for PWA Install Prompt (Add to Home Screen / WebAPK)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          setIsStandaloneApp(true);
        }
      } catch {
        setIsApkInfoModalOpen(true);
      }
    } else {
      setIsApkInfoModalOpen(true);
    }
  };

  // Screen WakeLock ref
  const wakeLockRef = useRef<any>(null);

  // Background Audio Keep-Alive & WakeLock System
  // Keeps the mobile audio session alive so sirens and vibration fire even when the screen turns off/locks
  useEffect(() => {
    if (isOnDuty) {
      alarmSound.enableBackgroundGuardMode();
    } else {
      alarmSound.disableBackgroundGuardMode();
    }

    const requestWakeLock = async () => {
      if (isOnDuty && "wakeLock" in navigator) {
        try {
          if (!wakeLockRef.current || wakeLockRef.current.released) {
            wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          }
        } catch {}
      }
    };

    requestWakeLock();

    // Auto-restore WakeLock and background audio on screen turn-on / visibility change
    const handleReactivation = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        if (isOnDuty) {
          alarmSound.enableBackgroundGuardMode();
        }
      }
    };

    document.addEventListener("visibilitychange", handleReactivation);
    window.addEventListener("focus", handleReactivation);
    window.addEventListener("pageshow", handleReactivation);

    // Audio unlocking on user touch
    const handleUserInteraction = () => {
      if (isOnDuty) {
        alarmSound.enableBackgroundGuardMode();
      }
    };
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleReactivation);
      window.removeEventListener("focus", handleReactivation);
      window.removeEventListener("pageshow", handleReactivation);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {}
      }
    };
  }, [isOnDuty]);

  // Request Lockscreen Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasNotificationPermission(perm === "granted");
        if (perm === "granted") {
          alarmSound.enableBackgroundGuardMode();
        }
      } catch {}
    }
  };

  // Read and react to URL query parameters for store binding from QR
  useEffect(() => {
    const syncFromUrl = () => {
      const { sid, sname } = extractStoreParamsFromUrl();
      if (sid) {
        setAssignedStoreId(sid);
        localStorage.setItem("pg_guard_store_id", sid);
        if (sname) {
          setAssignedStoreName(sname);
          localStorage.setItem("pg_guard_store_name", sname);
        }
      }
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);

    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  // Filter alerts: only show for assigned store if bound via QR, or all if general
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

  // Current emergency requiring attention (only ACTIVE alerts - deactivates when central dispatches or resolves)
  const currentEmergency: PanicAlert | null = useMemo(() => {
    if (selectedAlertId) {
      const found = activeAlerts.find((a) => a.id === selectedAlertId);
      if (found) return found;
    }
    return activeAlerts[0] || null;
  }, [activeAlerts, selectedAlertId]);

  // Resolve matching terminal from database to ensure calibrated tactical coordinates & address
  const matchedTerminal = useMemo(() => {
    if (!currentEmergency) return null;
    return terminals.find(
      (t) => t.storeId === currentEmergency.store?.storeId || t.id === currentEmergency.store?.storeId
    );
  }, [currentEmergency, terminals]);

  // Also resolve assigned terminal data for the standby banner
  const boundTerminalInfo = useMemo(() => {
    if (!assignedStoreId) return null;
    return terminals.find(
      (t) => t.storeId === assignedStoreId || t.id === assignedStoreId
    );
  }, [assignedStoreId, terminals]);

  // Effective store with tactical metadata
  const effectiveStore = useMemo(() => {
    if (!currentEmergency) return null;
    return {
      ...currentEmergency.store,
      ...(matchedTerminal ? {
        storeName: matchedTerminal.storeName || currentEmergency.store.storeName,
        address: matchedTerminal.address || currentEmergency.store.address,
        city: matchedTerminal.city || currentEmergency.store.city,
        phone: matchedTerminal.phone || currentEmergency.store.phone,
        category: matchedTerminal.category || currentEmergency.store.category,
        coordinates: (matchedTerminal.coordinates && matchedTerminal.coordinates.latitude !== 0)
          ? matchedTerminal.coordinates
          : currentEmergency.store.coordinates,
      } : {}),
    };
  }, [currentEmergency, matchedTerminal]);

  // Precise Google Maps destination URL matching the tactical map
  const gpsDirectionsUrl = useMemo(() => {
    if (!effectiveStore) return "#";
    const cleanAddress = effectiveStore.address ? effectiveStore.address.replace(/^.*?—\s*/, "").trim() : "";
    const queryParts = [
      cleanAddress || "",
      effectiveStore.city ? effectiveStore.city.trim() : "",
      cleanAddress.toLowerCase().includes("méxico") || cleanAddress.toLowerCase().includes("mexico") ? "" : "México",
    ].filter(Boolean);

    const fullSearchQuery = queryParts.join(", ") || (
      effectiveStore.coordinates && effectiveStore.coordinates.latitude !== 0
        ? `${effectiveStore.coordinates.latitude},${effectiveStore.coordinates.longitude}`
        : "México"
    );

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullSearchQuery)}`;
  }, [effectiveStore]);

  // Persist Profile
  useEffect(() => {
    localStorage.setItem("pg_guard_name", guardName);
    localStorage.setItem("pg_guard_duty", isOnDuty.toString());
    localStorage.setItem("pg_guard_store_id", assignedStoreId);
    localStorage.setItem("pg_guard_store_name", assignedStoreName);
  }, [guardName, isOnDuty, assignedStoreId, assignedStoreName]);

  // Auto-siren & vibration loop when active emergency matches this guard
  // Plays siren and vibrates phone continuously until guard responds (Voy en camino)
  // or Central operator dispatches/resolves the alert (even if terminal operator muted local sound)
  useEffect(() => {
    if (isOnDuty && activeAlerts.length > 0) {
      alarmSound.startGuardTacticalLoop();

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification("🚨 ¡EMERGENCIA EN CURSO!", {
              body: `${activeAlerts[0].store.storeName} (${activeAlerts[0].store.address})`,
              icon: "/pwa-icon.svg",
              tag: "panic-alert",
              renotify: true,
              requireInteraction: true,
              silent: true,
              vibrate: [500, 200, 500, 200, 800],
            } as any);
          } catch {}
        }
      }
    } else {
      // Dispatched or resolved -> Stop alarm loop immediately and return to quiet standby
      alarmSound.stopGuardTacticalLoop();
    }

    return () => {
      alarmSound.stopGuardTacticalLoop();
    };
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
    alarmSound.stopGuardTacticalLoop();
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
    updateAlertStatus(
      alert.id,
      "DISPATCHED",
      officerLabel,
      `Guardia ${officerLabel} va en camino hacia el local.`,
      `Guardia: ${officerLabel}`
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
    alarmSound.stopGuardTacticalLoop();
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
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
    alarmSound.stopGuardTacticalLoop();
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
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

    const officerLabel = guardName.trim() || "Guardia en Turno";
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

  const handleGuardExit = async () => {
    localStorage.removeItem("pg_guard_store_id");
    localStorage.removeItem("pg_guard_store_name");
    localStorage.removeItem("pg_guard_duty");
    if (typeof window !== "undefined") {
      window.location.hash = "";
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    await logout();
    window.location.reload();
  };

  return (
    <div className="w-full max-w-lg mx-auto min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-red-500 selection:text-white pb-6 sm:pb-8 font-sans">
      {/* ================= MOBILE TACTICAL TOP BAR ================= */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Tactical Channel Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all ${
                isOnDuty
                  ? "bg-emerald-600 shadow-md shadow-emerald-950 ring-2 ring-emerald-400/40"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-xs tracking-wider uppercase">PANICGUARD</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 font-bold border border-red-500/40">
                  TÁCTICO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <span className="truncate">{isConnected ? "Canal Activo en Vivo" : "Reconectando..."}</span>
              </div>
            </div>
          </div>

          {/* Quick duty toggle & Exit button (No Gear Icon!) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                isOnDuty
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750"
              }`}
              title="Cambiar estado de guardia"
            >
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
              <span>{isOnDuty ? "EN TURNO" : "PAUSA"}</span>
            </button>

            <button
              onClick={handleGuardExit}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950 hover:text-red-400 hover:border-red-800/80 border border-slate-700/80 text-slate-400 transition-all cursor-pointer active:scale-95"
              title="Cerrar sesión / Salir"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= PERMANENT GUARD IDENTIFIER & TERMINAL ASIGNADA (DIRECTAMENTE A LA VISTA) ================= */}
      <section className="px-3.5 pt-3 pb-1 space-y-2.5">
        {/* Guard Name Input Direct Field (No Gear Needed!) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nombre del Guardia en Turno:</span>
            </label>
            <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Auto-guardado
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={guardName}
              onChange={(e) => setGuardName(e.target.value)}
              placeholder="Escribe tu nombre (Ej. Oficial Carlos R.)"
              className="w-full bg-slate-950 border border-slate-800/90 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-sm font-semibold placeholder:text-slate-600 transition-all outline-none"
            />
          </div>
        </div>

        {/* Solo la Terminal Asignada al QR (Read-only, Locked from QR Scan) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                <QrCode className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Terminal Asignada por QR:</span>
              </div>

              {assignedStoreId && assignedStoreId !== "ALL" ? (
                <div>
                  <div className="text-base font-black text-white truncate flex items-center gap-1.5">
                    <StoreIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{assignedStoreName || boundTerminalInfo?.storeName || assignedStoreId}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    <span className="text-amber-300/90 font-bold">ID: {assignedStoreId}</span>
                    {boundTerminalInfo?.address && (
                      <>
                        <span>•</span>
                        <span className="truncate">{boundTerminalInfo.address}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-1">
                  <div className="text-sm font-bold text-slate-300">
                    🌐 Patrullaje General (Todos los Locales)
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Para asignar una terminal específica, escanea el código QR exclusivo del comercio.
                  </p>
                </div>
              )}
            </div>

            {/* QR Verified Badge or Siren Test */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {assignedStoreId && assignedStoreId !== "ALL" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>QR Vinculado</span>
                </span>
              ) : null}

              <button
                onClick={handleTestSiren}
                disabled={isAudioTestActive}
                className="mt-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                title="Probar sonido de alarma"
              >
                <Volume2 className={`w-3 h-3 ${isAudioTestActive ? "animate-bounce text-red-400" : ""}`} />
                <span>{isAudioTestActive ? "Sonando..." : "Probar Sirena"}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN TACTICAL CONTENT (ADAPTED FOR MOBILE) ================= */}
      <main className="flex-1 px-3.5 py-2 space-y-3">
        {currentEmergency ? (
          /* ACTIVE EMERGENCY CARD */
          <div
            className={`rounded-2xl border overflow-hidden shadow-2xl transition-all ${
              currentEmergency.status === "ACTIVE"
                ? "bg-slate-900 border-red-500 ring-2 ring-red-500/40"
                : currentEmergency.status === "DISPATCHED"
                ? "bg-slate-900 border-amber-500/80"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {/* Emergency Alert Banner */}
            <div
              className={`p-3.5 text-white flex items-center justify-between gap-2 ${
                currentEmergency.status === "ACTIVE"
                  ? "bg-gradient-to-r from-red-600 via-red-700 to-red-800 animate-pulse"
                  : currentEmergency.status === "DISPATCHED"
                  ? "bg-gradient-to-r from-amber-600 to-amber-800"
                  : currentEmergency.status === "RESOLVED"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-800"
                  : "bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 flex-shrink-0 animate-bounce" />
                <div>
                  <span className="font-black text-sm uppercase block tracking-wide">
                    {currentEmergency.status === "ACTIVE"
                      ? "🚨 ¡ALERTA DE PÁNICO ACTIVA!"
                      : currentEmergency.status === "DISPATCHED"
                      ? "🏃 ACUDIENDO AL LOCAL"
                      : "✅ INCIDENTE ASEGURADO"}
                  </span>
                  <span className="text-[10px] text-white/90 font-mono">
                    {new Date(currentEmergency.timestamp).toLocaleTimeString()} • {currentEmergency.id}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-mono font-black bg-black/50 px-2.5 py-1 rounded-lg border border-white/20 uppercase">
                {currentEmergency.status}
              </span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Store Information & Direct Action Buttons */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                <div>
                  <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider">
                    COMERCIO AFECTADO
                  </span>
                  <h3 className="text-xl font-black text-white leading-tight mt-0.5">
                    {effectiveStore?.storeName || currentEmergency.store.storeName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {effectiveStore?.category || currentEmergency.store.category} • ID: {effectiveStore?.storeId || currentEmergency.store.storeId}
                  </p>
                </div>

                {/* Address */}
                <div className="text-xs text-slate-300 flex items-start gap-1.5 pt-1.5 border-t border-slate-900">
                  <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{effectiveStore?.address || currentEmergency.store.address}</span>
                </div>

                {/* Contact and GPS Buttons (Large Touch Targets for Mobile) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <a
                    href={`tel:${effectiveStore?.phone || currentEmergency.store.phone}`}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Llamar Local</span>
                  </a>

                  <a
                    href={gpsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>Ruta GPS</span>
                  </a>
                </div>
              </div>

              {/* TACTICAL MAP EMBEDDED PREVIEW */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <button
                  type="button"
                  onClick={() => setShowTacticalMap(!showTacticalMap)}
                  className="w-full p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-850 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>Mapa Táctico de Ubicación</span>
                  </div>
                  <span className="text-[10px] text-blue-400 font-mono">
                    {showTacticalMap ? "Ocultar ▲" : "Ver Mapa ▼"}
                  </span>
                </button>

                {showTacticalMap && (
                  <div className="h-[220px] w-full">
                    <TacticalMap
                      storeName={effectiveStore?.storeName || currentEmergency.store.storeName}
                      address={effectiveStore?.address || currentEmergency.store.address}
                      city={effectiveStore?.city || currentEmergency.store.city}
                      coordinates={effectiveStore?.coordinates || currentEmergency.store.coordinates}
                      className="h-full rounded-none border-0"
                    />
                  </div>
                )}
              </div>

              {/* EVIDENCE PHOTO VIEWER (Only if terminal had camera enabled) */}
              {currentEmergency.cameraEnabled !== false && Array.isArray(currentEmergency.images) && currentEmergency.images.length > 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      📸 FOTOS DE EVIDENCIA ({selectedFrameIndex + 1}/{currentEmergency.images.length})
                    </span>
                    <button
                      onClick={() => setIsZoomImageOpen(true)}
                      className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ampliar Zoom</span>
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
                    <div className="absolute bottom-2 left-2 flex gap-1.5">
                      {currentEmergency.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all shadow ${
                            selectedFrameIndex === idx
                              ? "bg-red-600 text-white ring-1 ring-white"
                              : "bg-black/80 text-slate-300"
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Terminal en Modo Solo Botón (Sin cámara) */
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <CameraOff className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 text-[11px] leading-tight">
                    <span className="text-slate-200 font-bold block">Terminal en Modo Solo Botón de Emergencia</span>
                    <span className="text-slate-400">Esta terminal no cuenta con cámara. Dirígete a la ubicación indicada en el mapa.</span>
                  </div>
                </div>
              )}

              {/* 3 GIANT ONE-TAP MOBILE ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                  ⚡ ACCIONES TÁCTICAS DEL GUARDIA:
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* 1. Voy en camino */}
                  <button
                    onClick={() => handleDispatchEnCamino(currentEmergency)}
                    className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-950/60 cursor-pointer transition-all"
                  >
                    <Navigation className="w-5 h-5 animate-pulse" />
                    <span>1. VOY EN CAMINO (Acudiendo)</span>
                  </button>

                  {/* 2. En el sitio */}
                  <button
                    onClick={() => handleArrivedOnSite(currentEmergency)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-950/60 cursor-pointer transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>2. EN EL SITIO (Verificando)</span>
                  </button>

                  {/* 3. Asegurado */}
                  <button
                    onClick={() => handlePerimeterSecured(currentEmergency)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>3. PERÍMETRO ASEGURADO</span>
                  </button>
                </div>
              </div>

              {/* QUICK CHIPS FOR LOGS */}
              <div className="space-y-2 pt-1">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                  📝 REPORTE RÁPIDO A CENTRAL:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Perímetro despejado",
                    "Sujeto huyó",
                    "Policía en sitio",
                    "Cajero a salvo",
                    "Falsa alarma",
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuickNote(currentEmergency, chip)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 active:scale-95 border border-slate-800 text-[11px] text-slate-300 cursor-pointer shadow-sm"
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-xl my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">
                Perímetro en Calma
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {assignedStoreId && assignedStoreId !== "ALL"
                  ? `Monitoreando exclusivamente el canal de alarma de ${assignedStoreName || assignedStoreId}.`
                  : "Monitoreando todos los locales comerciales de la plaza."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 font-mono flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Sirena y vibración táctica activas en celular</span>
            </div>

            {!hasNotificationPermission && typeof window !== "undefined" && "Notification" in window && (
              <button
                onClick={requestNotificationPermission}
                className="w-full p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>🔔 Permitir Alertas con Pantalla Bloqueada</span>
              </button>
            )}

            {/* PWA / APK Mobile App Installation Button */}
            {!isStandaloneApp && (
              <button
                onClick={handleInstallPwa}
                className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 active:scale-95 border border-blue-500/50 text-blue-200 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>📲 Instalar App en Celular (PWA / APK)</span>
              </button>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleTestSiren}
                disabled={isAudioTestActive}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-750 active:scale-95 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>{isAudioTestActive ? "Sirena Sonando..." : "Realizar Prueba de Sirena"}</span>
              </button>

              <button
                onClick={() => setIsApkInfoModalOpen(true)}
                className="w-full py-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>¿Cómo activar sonido con pantalla apagada / APK?</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE GUÍA: INSTALACIÓN DE APP MÓVIL (OPCIÓN 1 - PWA / WEBAPK) */}
      {isApkInfoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3"
          onClick={() => setIsApkInfoModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Download className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instalar App en Celular (PWA)</h3>
                  <span className="text-[10px] font-mono text-emerald-400">Para alertas con pantalla apagada</span>
                </div>
              </div>
              <button
                onClick={() => setIsApkInfoModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {/* Paso 1: Instalar en pantalla de inicio */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px] text-emerald-400">1</span>
                  <span>Instalar la Aplicación en la Pantalla:</span>
                </div>
                
                {deferredPrompt ? (
                  <button
                    onClick={handleInstallPwa}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tocar aquí para Instalar Directamente</span>
                  </button>
                ) : (
                  <div className="bg-slate-900/90 rounded-xl p-3 text-[11px] font-mono text-slate-300 space-y-2 border border-slate-800">
                    <div>
                      <b className="text-amber-300 block mb-0.5">📱 En Android (Google Chrome):</b>
                      Toca los <b>tres puntos (⋮)</b> arriba a la derecha en Chrome y presiona <b>"Instalar aplicación"</b> o <b>"Añadir a la pantalla de inicio"</b>.
                    </div>
                    <div className="pt-1.5 border-t border-slate-800">
                      <b className="text-cyan-300 block mb-0.5">🍏 En iPhone (Safari):</b>
                      Toca el botón <b>Compartir (icono del cuadro con flecha ⎋)</b> y selecciona <b>"Añadir a la pantalla de inicio"</b>.
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 2: Permitir notificaciones */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[11px] text-amber-400">2</span>
                  <span>Permitir Notificaciones con Sonido:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al abrir la app instalada, presiona el botón <b>"🔔 Permitir Alertas con Pantalla Bloqueada"</b> y pulsa <b>"Permitir"</b> en el aviso del celular.
                </p>
              </div>

              {/* Paso 3: Quitar restricción de batería en Android */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-bold font-mono text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] text-blue-400">3</span>
                  <span>Batería Sin Restricciones (Crucial en Android):</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Para que Android no ponga la aplicación a dormir cuando bloquees el celular:
                </p>
                <div className="bg-slate-900/90 rounded-xl p-2.5 text-[11px] font-mono text-slate-300 border border-slate-800">
                  Ve a <b>Ajustes de tu celular</b> ➔ <b>Aplicaciones</b> ➔ <b>PanicGuard</b> ➔ <b>Batería</b> ➔ Elige <b>"Sin restricciones"</b>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsApkInfoModalOpen(false)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 cursor-pointer"
            >
              Listo, Entendido
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE MODAL (FOR MOBILE ZOOM) */}
      {isZoomImageOpen && currentEmergency && currentEmergency.cameraEnabled !== false && currentEmergency.images && currentEmergency.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3"
          onClick={() => setIsZoomImageOpen(false)}
        >
          <div className="relative w-full max-w-lg flex flex-col items-center">
            <button
              onClick={() => setIsZoomImageOpen(false)}
              className="absolute -top-12 right-0 p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentEmergency.images[selectedFrameIndex] || currentEmergency.images[0]}
              alt="Evidencia Zoom"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 text-center text-xs font-mono text-slate-300">
              {currentEmergency.store.storeName} • Cuadro #{selectedFrameIndex + 1} de {currentEmergency.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
