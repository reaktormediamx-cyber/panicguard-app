import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Camera,
  CameraOff,
  MapPin,
  Wifi,
  Radio,
  Clock,
  Store,
  User,
  Phone,
  Volume2,
  VolumeX,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  ShieldAlert,
  Send,
  MessageSquare,
  BadgeCheck,
  UserCheck,
  Edit3,
  Smartphone,
  QrCode,
  Copy,
  X,
  Sliders,
  Download,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { StoreMetadata, PanicAlert } from "../../types.js";
import { usePanicCapture } from "../../hooks/usePanicCapture.js";
import { alarmSound } from "../../utils/audio.js";
import { AudioSettingsModal } from "../audio/AudioSettingsModal.js";
import { db, doc, setDoc } from "../../lib/firebase.js";
import { useAuth } from "../../context/AuthContext.js";

interface MerchantTerminalProps {
  store: StoreMetadata;
  onOpenStoreConfig: () => void;
  alerts?: PanicAlert[];
}

export const MerchantTerminal: React.FC<MerchantTerminalProps> = ({
  store,
  onOpenStoreConfig,
  alerts = [],
}) => {
  const { terminals, appUser } = useAuth();

  // Filtrar terminales disponibles para este usuario
  const availableTerminals = terminals.filter((t) => {
    if (appUser && appUser.role !== "SUPER_ADMIN" && t.centralId !== appUser.centralId) {
      return false;
    }
    return true;
  });

  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(() => {
    const match = terminals.find(t => t.storeId === store.storeId || (appUser?.email && t.email?.toLowerCase() === appUser.email.toLowerCase()));
    return match ? match.id : (availableTerminals[0]?.id || "");
  });

  // Re-sync selectedTerminalId when terminals load from Firestore or store changes
  useEffect(() => {
    if (terminals.length > 0) {
      const match = terminals.find(
        (t) =>
          t.storeId === store.storeId ||
          (appUser?.email && (t.email || "").toLowerCase() === (appUser.email || "").toLowerCase())
      );
      if (match) {
        setSelectedTerminalId(match.id);
      }
    }
  }, [terminals, store.storeId, appUser?.email]);

  const matchingTerminal = terminals.find(t => t.id === selectedTerminalId) || terminals.find(t => t.storeId === store.storeId || (appUser?.email && t.email?.toLowerCase() === appUser.email.toLowerCase()));
  const activeStore = matchingTerminal || store;
  const firestoreId = matchingTerminal ? matchingTerminal.id : store.storeId;

  // Estado del Guardia en Turno
  const [guardName, setGuardName] = useState<string>(() => {
    return localStorage.getItem(`panicguard_guard_${firestoreId}`) || "";
  });
  const [isGuardModalOpen, setIsGuardModalOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(`panicguard_guard_${firestoreId}`);
    return !saved || !saved.trim();
  });
  const [tempGuardName, setTempGuardName] = useState<string>(guardName);

  const handleSaveGuard = (nameToSave: string) => {
    const trimmed = nameToSave.trim() || "Guardia en Turno";
    setGuardName(trimmed);
    localStorage.setItem(`panicguard_guard_${firestoreId}`, trimmed);
    setIsGuardModalOpen(false);
  };

  const [showLiveFeed, setShowLiveFeed] = useState<boolean>(true);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [pressProgress, setPressProgress] = useState<number>(0);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [testDrillMode, setTestDrillMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(alarmSound.isMuted());
  const [isAudioSettingsModalOpen, setIsAudioSettingsModalOpen] = useState<boolean>(false);
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isStoreQrModalOpen, setIsStoreQrModalOpen] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    alarmSound.setMuted(next);
  };

  // Camera activation state: allows activating/deactivating camera on terminals where it's not needed
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(`panicguard_cam_${activeStore.storeId}`);
    if (saved !== null) return saved === "true";
    return activeStore.cameraEnabled !== false;
  });

  // Active SOS alert triggered by a security guard
  const activeGuardSosAlert = (alerts || []).find(
    (a) =>
      a.status === "ACTIVE" &&
      (a.triggerType === "VOLUME_BUTTON" ||
        a.triggerType === "GUARD_PANIC" ||
        Boolean(a.guardName && (a.guardDescription?.includes("SOS GUARDIA") || a.guardDescription?.includes("PÁNICO SOS"))))
  );

  // Active panic alert emitted by this terminal
  const activeTerminalAlert = (alerts || []).find(
    (a) =>
      a.status === "ACTIVE" &&
      (a.store?.storeId === activeStore.storeId ||
        a.store?.storeName?.toLowerCase() === activeStore.storeName?.toLowerCase())
  );

  // Sound chime when guard SOS starts
  useEffect(() => {
    if (activeGuardSosAlert && !isMuted) {
      try {
        alarmSound.playTone("DISCRETE_CHIME");
      } catch {}
    }
  }, [activeGuardSosAlert?.id, isMuted]);

  // Start or maintain repetitive siren loop when this terminal's panic is active
  useEffect(() => {
    if (activeTerminalAlert && activeTerminalAlert.triggerType !== "SILENT_TRIGGER" && !isMuted) {
      alarmSound.startEmergencySiren();
    } else if (!activeTerminalAlert && !activeGuardSosAlert) {
      alarmSound.silenceAll();
    }
  }, [activeTerminalAlert?.id, activeTerminalAlert?.status, isMuted, activeGuardSosAlert]);

  const {
    videoRef,
    canvasRef,
    hasCameraPermission,
    cameraError,
    isCapturing,
    capturedFrames,
    lastSentAlertId,
    statusMessage,
    startCamera,
    stopCamera,
    triggerPanic,
    resetAlert,
    sendGuardUpdate,
    videoDevices,
    selectedDeviceId,
  } = usePanicCapture({
    store: activeStore,
    isCameraEnabled,
    onAlertSent: (id, time) => {
      setLastSentTime(time);
      if (isCameraEnabled) {
        setIsStreamingActive(true);

        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
        }

        // Detener la transmisión de video después de 5 minutos (300,000 milisegundos)
        streamingTimeoutRef.current = setTimeout(() => {
          setIsStreamingActive(false);
        }, 300000);
      }
    },
  });

  const toggleCamera = () => {
    const nextState = !isCameraEnabled;
    setIsCameraEnabled(nextState);
    localStorage.setItem(`panicguard_cam_${activeStore.storeId}`, String(nextState));
    if (!nextState) {
      setIsStreamingActive(false);
      stopCamera();
    } else {
      setTimeout(() => startCamera(), 100);
    }
  };

  const [guardDescription, setGuardDescription] = useState<string>("");
  const [isSendingGuardNote, setIsSendingGuardNote] = useState<boolean>(false);

  // Handle tactile hold-to-activate or instant press
  const handleInstantPanic = async (triggerType: "MANUAL_BUTTON" | "SILENT_TRIGGER" | "DRILL_TEST") => {
    if (!alarmSound.isMuted()) {
      alarmSound.playAlertNotification();
    }
    await triggerPanic(triggerType, guardDescription.trim(), guardName.trim() || undefined);
  };

  const handleSendLiveNote = async () => {
    if (!guardDescription.trim() || !lastSentAlertId) return;
    setIsSendingGuardNote(true);
    await sendGuardUpdate(lastSentAlertId, guardDescription.trim(), guardName.trim() || undefined);
    setIsSendingGuardNote(false);
  };

  // Keyboard shortcut listener for configured hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input field
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT")) {
        return;
      }

      const configKey = (activeStore.panicHotkey || "p").toLowerCase();
      const isAltRequired = activeStore.panicHotkeyMode !== "DIRECT";

      const targetKey = configKey === "space" ? " " : configKey;

      if (isAltRequired) {
        if (e.altKey && e.key.toLowerCase() === targetKey.toLowerCase()) {
          e.preventDefault();
          triggerPanic("KEYBOARD_HOTKEY", guardDescription.trim(), guardName.trim() || undefined);
        }
      } else {
        if (e.key.toLowerCase() === targetKey.toLowerCase() && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          triggerPanic("KEYBOARD_HOTKEY", guardDescription.trim(), guardName.trim() || undefined);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPanic, activeStore.panicHotkey, activeStore.panicHotkeyMode, guardDescription, guardName]);

  // Live camera feed broadcast to central via Socket.IO (optimized real-time video streaming)
  useEffect(() => {
    const socket = (window as any).__panicSocket;
    if (!socket) return;

    const handleStartStream = (payload: { terminalId?: string; storeId?: string }) => {
      if (!isCameraEnabled) return;

      const isTarget =
        payload.terminalId === firestoreId ||
        payload.storeId === activeStore.storeId ||
        payload.terminalId === activeStore.storeId;

      if (isTarget) {
        setIsStreamingActive(true);
        if (!hasCameraPermission) {
          startCamera();
        }
        if (streamingTimeoutRef.current) {
          clearTimeout(streamingTimeoutRef.current);
        }
        streamingTimeoutRef.current = setTimeout(() => {
          setIsStreamingActive(false);
        }, 300000); // 5 minutes
      }
    };

    socket.on("terminal:start_stream", handleStartStream);

    return () => {
      socket.off("terminal:start_stream", handleStartStream);
    };
  }, [firestoreId, activeStore.storeId, hasCameraPermission, startCamera]);

  useEffect(() => {
    if (!firestoreId && !activeStore.storeId) return;
    if (!isCameraEnabled) return;
    const interval = setInterval(() => {
      try {
        if (isStreamingActive && canvasRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = 320;
          canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320) || 240;
          const ctx = canvas.getContext("2d", { alpha: false });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.45);
            
            const socket = (window as any).__panicSocket;
            if (socket) {
              socket.emit("terminal:frame", {
                terminalId: firestoreId || activeStore.storeId,
                storeId: activeStore.storeId,
                frameData: dataUrl
              });
            }
          }
        }
      } catch (e) {
        console.warn("Error streaming live terminal frame:", e);
      }
    }, 120); // 120ms (~8 FPS fluid video streaming)

    // Periodic heartbeat in Firestore every 5s
    const heartbeatInterval = setInterval(async () => {
      if (firestoreId && db) {
        try {
          const terminalRef = doc(db, "terminals", firestoreId);
          await setDoc(terminalRef, {
            isOnline: true,
            lastSeen: new Date().toISOString()
          }, { merge: true });
        } catch {}
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
      if (firestoreId && db) {
        const terminalRef = doc(db, "terminals", firestoreId);
        setDoc(terminalRef, {
          isOnline: false,
          lastSeen: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
    };
  }, [firestoreId, activeStore.storeId, isStreamingActive]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header Card */}
      <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#be123c] border border-[#881337] flex items-center justify-center text-white shadow-lg shadow-[#4c0519]/60 shrink-0">
            <ShieldAlert className="w-6 h-6 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {activeStore.storeName}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[#a1a1aa] font-mono">
                  {activeStore.storeId}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#451a03] border border-[#92400e] text-[#fcd34d] font-semibold">
                  Central: {activeStore.centralName || "Central de Monitoreo"}
                </span>
              </div>
              <p className="text-sm text-[#a1a1aa] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-[#71717a]" />
                {activeStore.address}{activeStore.city ? `, ${activeStore.city}` : ""}
              </p>
              {availableTerminals.length > 1 && (appUser?.role === "CENTRAL" || appUser?.role === "SUPER_ADMIN" || appUser?.role === "ADMIN") && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#a1a1aa] font-semibold">Terminal activa:</span>
                  <select
                    value={selectedTerminalId}
                    onChange={(e) => setSelectedTerminalId(e.target.value)}
                    className="bg-[#14070c] border border-[#27272a] text-[#fbbf24] rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none focus:border-[#dc2626] cursor-pointer"
                  >
                    {availableTerminals.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.storeName} — {t.address || t.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status System Badge & Guardia en Turno */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Badge del Guardia en Turno con botón para cambiar/editar */}
          <button
            onClick={() => {
              setTempGuardName(guardName);
              setIsGuardModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] text-slate-200 text-xs font-medium shadow-inner transition-all cursor-pointer group"
            title="Clic para cambiar el oficial en turno"
          >
            <UserCheck className="w-4 h-4 text-[#34d399] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-mono">Guardia en Turno:</span>
              <span className="font-bold text-white max-w-[130px] truncate">{guardName || "Sin Asignar"}</span>
            </div>
            <Edit3 className="w-3 h-3 text-[#a1a1aa] opacity-60 group-hover:opacity-100 ml-0.5" />
          </button>

          {/* Botón para abrir QR exclusivo de esta tienda para los guardias */}
          <button
            onClick={() => setIsStoreQrModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#022c22] border border-[#065f46] hover:border-[#34d399] text-[#6ee7b7] text-xs font-bold shadow-inner transition-all cursor-pointer group"
            title="Mostrar código QR exclusivo para los guardias"
          >
            <Smartphone className="w-4 h-4 text-[#34d399] group-hover:scale-110 transition-transform" />
            <span>QR Guardias</span>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#022c22] border border-[#065f46] text-[#34d399] text-sm font-medium shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34d399] animate-ping" />
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[#6ee7b7] font-bold">SISTEMA OPERATIVO</span>
          </div>

          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              isMuted 
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50" 
                : "bg-[#181920] border border-[#262833] text-slate-200 hover:bg-[#22242e]"
            }`}
            title={
              isMuted
                ? "Terminal en Modo Silencioso: Al activar alerta, el celular del guardia sonará y vibrará sin emitir ruido en esta pantalla"
                : "Silenciar terminal local para activar alertas silenciosas (sonará en el celular del guardia)"
            }
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            <span>{isMuted ? "Terminal Silenciosa" : "Sonido Activo"}</span>
          </button>

          <button
            onClick={() => setIsAudioSettingsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-750 bg-slate-800/90 hover:bg-slate-750 text-slate-200 text-sm font-medium transition-colors cursor-pointer group"
            title="Elegir y personalizar tono de alerta y volumen"
          >
            <Sliders className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
            <span>Tonos</span>
          </button>

          {/* Botón Activar / Desactivar Cámara */}
          <button
            onClick={toggleCamera}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              !isCameraEnabled
                ? "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                : "bg-indigo-950/80 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60"
            }`}
            title={
              isCameraEnabled
                ? "Cámara Activada: Videoverificación y ráfaga de fotos habilitadas para central y guardias"
                : "Cámara Desactivada: Modo Solo Botón de Emergencia (no usa cámara ni muestra fotos en central/guardia)"
            }
          >
            {isCameraEnabled ? (
              <Camera className="w-4 h-4 text-indigo-400" />
            ) : (
              <CameraOff className="w-4 h-4 text-slate-400" />
            )}
            <span>{isCameraEnabled ? "Cámara: ACTIVADA" : "Cámara: DESACTIVADA (Solo Botón)"}</span>
          </button>
        </div>
      </div>

      {/* ================= ALERTA SOS DE GUARDIA REFLEJADA EN LA TERMINAL ================= */}
      {activeGuardSosAlert && (
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500 rounded-3xl p-4 sm:p-5 shadow-2xl ring-4 ring-red-500/30 animate-pulse space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-950 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-red-600 text-white uppercase tracking-wider">
                    {activeGuardSosAlert.triggerType === "VOLUME_BUTTON" ? "SOS BOTÓN DE VOLUMEN (3X)" : "SOS GUARDIA DE SEGURIDAD"}
                  </span>
                  <span className="text-xs font-mono text-red-300 font-bold">
                    Folio: {activeGuardSosAlert.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  🚨 ¡ALERTA SOS EMITIDA POR EL GUARDIA: {activeGuardSosAlert.guardName || "Oficial en Sitio"}!
                </h3>
              </div>
            </div>

            <span className="px-3 py-1 rounded-xl bg-red-900/80 border border-red-500/60 text-white font-mono text-xs font-bold animate-pulse">
              EN CURSO EN CENTRAL C4
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-red-900/50 text-xs text-slate-200 space-y-1 font-mono">
            <p className="text-red-200 font-bold">
              {activeGuardSosAlert.guardDescription || "El oficial de seguridad ha emitido una señal de auxilio urgente a la Central de Monitoreo."}
            </p>
            <div className="flex items-center gap-3 text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-400" />
                {new Date(activeGuardSosAlert.timestamp).toLocaleTimeString()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-400" />
                {activeGuardSosAlert.store?.address || "Ubicación en Terreno"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Control Panel & Right Live Camera HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Big Panic Trigger & Sensors (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prominent Panic Trigger Station */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
            {/* Background warning pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />

            <div className="mb-4">
              <span className="text-xs uppercase tracking-widest font-mono text-red-400/80 font-bold px-3 py-1 rounded-full bg-red-950/50 border border-red-900/50">
                Transmisión Inmediata de Alta Prioridad
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              Botón de Pánico Comercial
            </h2>
            <p className="text-sm text-slate-400 max-w-md mb-8">
              {isCameraEnabled
                ? "Al presionar, capturará instantáneamente 3 fotos de seguridad, geolocalización y transmitirá la alerta en < 1 seg a la Central de Monitoreo y Guardias."
                : "Modo Solo Botón: Al presionar, transmitirá la alerta crítica y geolocalización en < 1 seg a Central y Guardias (sin cámara)."}
            </p>

            {/* Giant Tactile Button */}
            <div className="relative group my-2">
              {/* Pulsing halo */}
              <div
                className={`absolute -inset-4 rounded-full bg-[#dc2626]/40 blur-2xl transition-all duration-300 ${
                  isCapturing ? "bg-[#ef4444]/80 scale-110 animate-pulse" : "group-hover:bg-[#ef4444]/60"
                }`}
              />

              <button
                id="main-panic-button"
                disabled={isCapturing}
                onClick={() => handleInstantPanic(testDrillMode ? "DRILL_TEST" : "MANUAL_BUTTON")}
                className={`relative w-52 h-52 sm:w-60 sm:h-60 rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-[0_0_60px_rgba(220,38,38,0.65)] active:scale-95 ${
                  isCapturing
                    ? "bg-[#be123c] border-[#ef4444] ring-8 ring-[#dc2626]/50 animate-pulse"
                    : "bg-[radial-gradient(circle_at_35%_30%,_#ef4444_0%,_#dc2626_35%,_#be123c_65%,_#881337_100%)] hover:bg-[radial-gradient(circle_at_35%_30%,_#f87171_0%,_#ef4444_35%,_#dc2626_65%,_#be123c_100%)] border-[#ef4444]/90 ring-8 ring-[#dc2626]/30"
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-[#4c0519] flex items-center justify-center mb-2.5 border border-[#9f1239] shadow-inner">
                  <AlertTriangle className="w-9 h-9 text-white animate-bounce stroke-[2.4]" />
                </div>
                <span className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase drop-shadow-md">
                  {isCapturing ? "CAPTURANDO..." : "EMERGENCIA"}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-[#fda4af] uppercase mt-0.5">
                  {testDrillMode ? "[MODO SIMULACRO]" : "PULSAR PARA ACTIVAR"}
                </span>
              </button>
            </div>

            {/* Campo táctico de descripción de la emergencia por el Guardia */}
            <div className="w-full max-w-xl mt-4 px-2 text-left">
              <div className="bg-slate-950/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 shadow-xl transition-all space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Tipo / Descripción de la Emergencia (Se refleja en Central):
                  </label>
                  <div className="flex items-center gap-2">
                    {lastSentAlertId && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Enlace C4 Activo
                      </span>
                    )}
                  </div>
                </div>

                {/* Accesos rápidos de emergencias comunes */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "🚨 Asalto con arma",
                    "🔫 Sujetos armados",
                    "🥊 Agresión física",
                    "🔥 Incendio / Humo",
                    "🕵️ Intrusión en local",
                    "⚕️ Auxilio médico",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const clean = preset.replace(/^[^\w\s]+/, "").trim();
                        setGuardDescription((prev) => {
                          if (!prev.trim()) return clean;
                          if (prev.includes(clean)) return prev;
                          return `${prev}, ${clean}`;
                        });
                      }}
                      className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Textarea para detallar */}
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={guardDescription}
                    onChange={(e) => setGuardDescription(e.target.value)}
                    placeholder="Describe lo que está ocurriendo (ej: 2 hombres armados vestidos de negro en mostrador exigiendo el efectivo)..."
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-all resize-none shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (lastSentAlertId) {
                          handleSendLiveNote();
                        }
                      }
                    }}
                  />

                  {lastSentAlertId && (
                    <button
                      type="button"
                      disabled={isSendingGuardNote || !guardDescription.trim()}
                      onClick={handleSendLiveNote}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shrink-0"
                      title="Transmitir novedad a Central"
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-[10px]">Actualizar Central</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-slate-500" />
                    {lastSentAlertId
                      ? "Alerta emitida: Escribe y presiona 'Actualizar Central' para registrar eventos en la bitácora."
                      : "Al presionar el botón de pánico, esta descripción se transmitirá inmediatamente a la Central."}
                  </span>
                  {guardDescription && (
                    <button
                      type="button"
                      onClick={() => setGuardDescription("")}
                      className="text-slate-500 hover:text-slate-300 underline cursor-pointer"
                    >
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Message Footer */}
            <div className="mt-8 w-full space-y-3">
              <div
                className={`p-3.5 rounded-2xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  lastSentAlertId
                    ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                    : isCapturing
                    ? "bg-amber-950/70 border-amber-500/40 text-amber-300 animate-pulse"
                    : "bg-slate-950/60 border-slate-800 text-slate-300"
                }`}
              >
                {lastSentAlertId ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCapturing ? (
                  <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                ) : (
                  <Radio className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>

              {lastSentAlertId && (
                <button
                  onClick={async () => {
                    await resetAlert();
                    setLastSentTime(null);
                    setIsStreamingActive(false);
                    if (streamingTimeoutRef.current) {
                      clearTimeout(streamingTimeoutRef.current);
                    }
                  }}
                  className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg border border-emerald-400/50 flex items-center justify-center gap-2 cursor-pointer transition-all animate-pulse"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>DESACTIVAR ALERTA / RESTABLECER TERMINAL</span>
                </button>
              )}
            </div>

            {/* Quick Actions Row */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 w-full">
              <div
                className="px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all"
                title={`Atajo de teclado: ${activeStore.panicHotkeyMode === "DIRECT" ? "" : "Alt + "}${activeStore.panicHotkey?.toUpperCase() || "P"}`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Tecla de Pánico:{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-red-400 uppercase font-bold">
                    {activeStore.panicHotkeyMode === "DIRECT" ? "" : "Alt + "}
                    {activeStore.panicHotkey || "p"}
                  </kbd>
                </span>
              </div>

              <button
                onClick={() => setTestDrillMode(!testDrillMode)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  testDrillMode
                    ? "bg-amber-950/80 border-amber-500 text-amber-300"
                    : "bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {testDrillMode ? "Modo Simulacro: ACTIVO" : "Probar Simulacro"}
              </button>
            </div>
          </div>

          {/* Diagnostic Sensor Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Camera Sensor Status */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      !isCameraEnabled
                        ? "bg-slate-800/80 text-slate-400 border border-slate-700"
                        : hasCameraPermission
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {!isCameraEnabled ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Sensor Cámara</h4>
                    <p className="text-xs text-slate-400">
                      {!isCameraEnabled
                        ? "Desactivada (Solo Botón de Pánico)"
                        : hasCameraPermission
                        ? "Webcam HD Lista (3 frames burst)"
                        : cameraError || "Solicitando acceso..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleCamera}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                  title={isCameraEnabled ? "Desactivar cámara" : "Activar cámara"}
                >
                  {isCameraEnabled ? "Desactivar" : "Activar"}
                </button>
              </div>

              {/* USB / System Webcam Selector (solo si la cámara está activa) */}
              {isCameraEnabled && videoDevices && videoDevices.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">Dispositivo:</span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => startCamera(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 truncate"
                  >
                    <option value="">Cámara Predeterminada / Principal</option>
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Cámara USB / Sistema #${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Camera HUD & Burst Gallery OR Button-Only Tactical Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {isCameraEnabled ? (
            /* Live Camera Feed Card */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Videoverificación en Vivo
                  </h3>
                </div>
                <button
                  onClick={() => setShowLiveFeed(!showLiveFeed)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {showLiveFeed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showLiveFeed ? "Ocultar" : "Mostrar"}
                </button>
              </div>

              {/* Video Container with Tactical HUD */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                {showLiveFeed ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 text-xs">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Cámara activa en segundo plano para captura inmediata
                  </div>
                )}

                {/* Tactical Crosshair Overlay */}
                <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-start text-[10px] font-mono text-emerald-400/90 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur w-fit">
                    <span>1080p | 30 FPS</span>
                  </div>

                  {/* Target box */}
                  <div className="self-center w-24 h-24 border border-dashed border-red-500/40 rounded-lg flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                  </div>

                  <div className="flex justify-between items-end text-[10px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur">
                    <span>STORE: {store.storeId}</span>
                    <span>TIME: {new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              {/* Last Captured 3-Frame Burst Preview */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Última Ráfaga de Seguridad ({capturedFrames.length > 0 ? "3 Fotogramas" : "Sin capturas recientes"})
                  </span>
                  {lastSentTime && (
                    <span className="font-mono text-[10px] text-emerald-400">
                      {new Date(lastSentTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {capturedFrames.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {capturedFrames.map((frame, index) => (
                      <div
                        key={index}
                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shadow"
                      >
                        <img
                          src={frame}
                          alt={`Fotograma ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                          F#{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    Al activar el botón de pánico, aquí se desplegará la ráfaga de 3 fotogramas capturada y enviada al servidor.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Button-Only Tactical Mode Info Card */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Modo Solo Botón de Emergencia
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  CÁMARA INACTIVA
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <CameraOff className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Terminal sin Uso de Videocámara
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      En este establecimiento la terminal no requiere cámara. La activación opera exclusivamente mediante el <strong className="text-red-400">Botón de Pánico</strong> y el atajo configurado.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Transmisión instantánea de alerta a Central C4/C5 (&lt; 1s)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Activación de sirena y vibración en el celular del guardia</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Geolocalización GPS exacta y trazabilidad en bitácora</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-[#f43f5e] shrink-0" />
                    <span>No se envían fotogramas ni aparece visor de cámara en Central ni Guardia</span>
                  </div>
                </div>
              </div>

              <button
                onClick={toggleCamera}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>¿Deseas activar la cámara en esta terminal? Haz clic aquí</span>
              </button>
            </div>
          )}

          {/* Store Quick Reference Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Ficha del Negocio Protegido
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Titular:
                </span>
                <span className="font-medium text-slate-200">{store.ownerName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Contacto:
                </span>
                <span className="font-mono text-slate-200">{store.phone}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Enlace Central:
                </span>
                <span className="text-emerald-400 font-medium">Socket Activo (0 ms latencia)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ventana Modal: Registro de Guardia en Turno al acceder a la Terminal */}
      {isGuardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-2 border-[#262833] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-emerald-900/30 border border-emerald-500/40 flex items-center justify-center text-[#10b981] shrink-0 shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Registro de Guardia en Turno
                </h3>
                <p className="text-xs text-slate-400">
                  Control de bitácora y responsabilidad operativa
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <span className="text-slate-400">Puesto / Terminal:</span>
                <span className="font-bold text-white">{activeStore.storeName}</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Por protocolo de seguridad, el nombre del oficial en guardia quedará registrado oficialmente en la bitácora central y en todos los reportes de pánico emitidos.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGuard(tempGuardName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Nombre completo del Oficial / Guardia:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={tempGuardName}
                    onChange={(e) => setTempGuardName(e.target.value)}
                    placeholder="Ej. Of. Roberto Martínez Mendoza"
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-[#f43f5e] focus:ring-4 focus:ring-[#f43f5e]/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner font-medium"
                  />
                  <BadgeCheck className="w-5 h-5 text-[#10b981] absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {guardName && (
                  <button
                    type="button"
                    onClick={() => setIsGuardModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Mantener Anterior
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!tempGuardName.trim()}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#f43f5e] hover:to-[#e11d48] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wide shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmar & Registrar en Bitácora</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE EXCLUSIVO PARA GUARDIAS DE ESTE COMERCIO */}
      {isStoreQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 text-center shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsStoreQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg">
              <Store className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white tracking-tight">
                Código QR Oficial de Vinculación de Guardia
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Los oficiales de seguridad que escaneen este código quedarán asignados a esta sucursal y recibirán sus alertas de pánico en tiempo real.
              </p>
            </div>

            {/* Hidden Canvas for High-Resolution PNG Generator */}
            <div className="hidden">
              <QRCodeCanvas
                id="merchant-qr-canvas"
                value={`${window.location.origin}/?guard=1&storeId=${encodeURIComponent(activeStore.storeId)}&storeName=${encodeURIComponent(activeStore.storeName)}#guard`}
                size={512}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Interactive QR Display Card with Printed Establishment Details */}
            <div className="bg-white rounded-2xl p-5 shadow-2xl text-slate-900 space-y-3 mx-auto max-w-sm border-2 border-slate-300">
              <div className="p-2 bg-white rounded-xl inline-block">
                <QRCodeSVG
                  value={`${window.location.origin}/?guard=1&storeId=${encodeURIComponent(activeStore.storeId)}&storeName=${encodeURIComponent(activeStore.storeName)}#guard`}
                  size={190}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Text printed below the QR code */}
              <div className="space-y-1 pt-2 border-t-2 border-slate-200 text-left">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-sm text-slate-950 uppercase leading-tight line-clamp-1">
                    {activeStore.storeName}
                  </h4>
                  <span className="text-[10px] font-mono font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-300 shrink-0">
                    {activeStore.storeId}
                  </span>
                </div>

                <div className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-snug pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-medium">
                    {activeStore.address}{activeStore.city ? `, ${activeStore.city}` : ""}
                  </span>
                </div>

                {activeStore.phone && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 pt-0.5">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>Tel: {activeStore.phone} • Titular: {activeStore.ownerName || "Comercio"}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-100 p-2 rounded-lg text-[10px] text-slate-600 text-center font-medium leading-tight">
                📲 Escanea con la cámara de tu celular para ingresar al Puesto de Guardia
              </div>
            </div>

            {/* Action Button: Download PNG */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsDownloadingQr(true);
                  try {
                    const qrCanvas = document.getElementById("merchant-qr-canvas") as HTMLCanvasElement | null;
                    if (!qrCanvas) {
                      alert("No se pudo generar la imagen del código QR.");
                      setIsDownloadingQr(false);
                      return;
                    }

                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    if (!ctx) {
                      setIsDownloadingQr(false);
                      return;
                    }

                    canvas.width = 900;
                    canvas.height = 1180;

                    // Background
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Outer border
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineWidth = 14;
                    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

                    // Header Banner
                    ctx.fillStyle = "#0f172a";
                    ctx.fillRect(20, 20, canvas.width - 40, 130);

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "900 36px system-ui, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText("🛡️ PANICGUARD TÁCTICO", canvas.width / 2, 80);

                    ctx.fillStyle = "#38bdf8";
                    ctx.font = "bold 18px monospace";
                    ctx.fillText("VINCULACIÓN OFICIAL DE GUARDIA EN TURNO", canvas.width / 2, 115);

                    // Draw QR Code
                    const qrSize = 420;
                    const qrX = (canvas.width - qrSize) / 2;
                    const qrY = 180;

                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
                    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

                    // Store details below QR
                    let textY = qrY + qrSize + 55;

                    ctx.fillStyle = "#0f172a";
                    ctx.font = "bold 32px system-ui, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(activeStore.storeName, canvas.width / 2, textY);

                    textY += 38;
                    ctx.fillStyle = "#dc2626";
                    ctx.font = "bold 20px monospace";
                    ctx.fillText(`ID TERMINAL: ${activeStore.storeId} • ${activeStore.centralName || "CENTRAL C4"}`, canvas.width / 2, textY);

                    textY += 22;
                    ctx.strokeStyle = "#cbd5e1";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(70, textY);
                    ctx.lineTo(canvas.width - 70, textY);
                    ctx.stroke();

                    // Address with Word Wrap
                    textY += 40;
                    ctx.fillStyle = "#334155";
                    ctx.font = "bold 22px system-ui, sans-serif";
                    const fullAddress = `${activeStore.address || ""}${activeStore.city ? " • " + activeStore.city : ""}`;
                    const words = fullAddress.split(" ");
                    let line = "";
                    for (let n = 0; n < words.length; n++) {
                      const testLine = line + words[n] + " ";
                      const metrics = ctx.measureText(testLine);
                      if (metrics.width > 740 && n > 0) {
                        ctx.fillText(line.trim(), canvas.width / 2, textY);
                        line = words[n] + " ";
                        textY += 32;
                      } else {
                        line = testLine;
                      }
                    }
                    ctx.fillText(line.trim(), canvas.width / 2, textY);

                    if (activeStore.phone) {
                      textY += 34;
                      ctx.fillStyle = "#64748b";
                      ctx.font = "18px system-ui, sans-serif";
                      ctx.fillText(`📞 Contacto: ${activeStore.phone} • Titular: ${activeStore.ownerName || "Comercio"}`, canvas.width / 2, textY);
                    }

                    // Instructions box at bottom
                    ctx.fillStyle = "#f8fafc";
                    ctx.fillRect(40, canvas.height - 125, canvas.width - 80, 85);
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(40, canvas.height - 125, canvas.width - 80, 85);

                    ctx.fillStyle = "#0284c7";
                    ctx.font = "bold 18px system-ui, sans-serif";
                    ctx.fillText("📲 INSTRUCCIONES PARA EL OFICIAL DE GUARDIA:", canvas.width / 2, canvas.height - 88);
                    ctx.fillStyle = "#475569";
                    ctx.font = "15px system-ui, sans-serif";
                    ctx.fillText("Escanea con tu celular para identificarte y atender incidentes de este local.", canvas.width / 2, canvas.height - 60);

                    const dataUrl = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    link.download = `QR_Guardia_${activeStore.storeId}_${activeStore.storeName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
                    link.href = dataUrl;
                    link.click();
                  } catch (e) {
                    console.error("Error generating QR download:", e);
                  } finally {
                    setIsDownloadingQr(false);
                  }
                }}
                disabled={isDownloadingQr}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/60"
              >
                <Download className="w-5 h-5 text-emerald-200" />
                <span>{isDownloadingQr ? "Generando..." : "Descargar QR (PNG Imprimible)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalización de Tonos de Alerta */}
      <AudioSettingsModal
        isOpen={isAudioSettingsModalOpen}
        onClose={() => setIsAudioSettingsModalOpen(false)}
      />
    </div>
  );
};
