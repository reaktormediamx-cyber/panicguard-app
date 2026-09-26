import React, { useState, useEffect } from "react";
import {
  X,
  Radio,
  VolumeX,
  Phone,
  Shield,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Camera,
  CameraOff,
  Layers,
} from "lucide-react";
import { PanicAlert, AlertStatus, formatTriggerType } from "../../types.js";
import { downloadAlertPdfReport } from "../../utils/pdfGenerator.js";
import { BurstViewer } from "./BurstViewer.js";
import { TacticalMap } from "./TacticalMap.js";
import { AiVerdictPanel } from "./AiVerdictPanel.js";

interface EmergencyModalProps {
  alert: PanicAlert;
  isAudioAlarmActive: boolean;
  onAcknowledgeAlarm: () => void;
  onClose: () => void;
  onUpdateStatus: (
    alertId: string,
    status: AlertStatus,
    operatorName?: string,
    notes?: string,
    unit?: string
  ) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  alert,
  isAudioAlarmActive,
  onAcknowledgeAlarm,
  onClose,
  onUpdateStatus,
}) => {
  const [operatorNote, setOperatorNote] = useState<string>("");
  const [dispatchUnit, setDispatchUnit] = useState<string>(alert.dispatchedUnit || "Patrulla Sector #911-A");
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [mediaMode, setMediaMode] = useState<"BURST" | "LIVE">("BURST");
  const [liveFrame, setLiveFrame] = useState<string | null>(null);

  // Escuchar fotogramas de transmisión en tiempo real y solicitar transmisión
  useEffect(() => {
    const socket = (window as any).__panicSocket;
    if (!socket) return;

    if (mediaMode === "LIVE") {
      socket.emit("terminal:request_stream", {
        terminalId: (alert as any).terminalId || alert.store?.storeId,
        storeId: alert.store?.storeId,
      });
    }

    const handleFrameUpdate = ({
      terminalId,
      storeId,
      frameData,
    }: {
      terminalId?: string;
      storeId?: string;
      frameData: string;
    }) => {
      const match =
        terminalId === alert.store?.storeId ||
        storeId === alert.store?.storeId ||
        terminalId === (alert as any).terminalId ||
        (alert.store?.storeId && terminalId?.includes(alert.store.storeId)) ||
        (terminalId && alert.store?.storeId?.includes(terminalId));

      if (match) {
        setLiveFrame(frameData);
      }
    };

    socket.on("terminal:frame:update", handleFrameUpdate);
    return () => {
      socket.off("terminal:frame:update", handleFrameUpdate);
    };
  }, [alert.store?.storeId, mediaMode]);

  const { label: triggerLabel, isDrill } = formatTriggerType(alert.triggerType);
  const isCameraActive = alert.cameraEnabled !== false && Array.isArray(alert.images) && alert.images.length > 0;

  const handleAction = (status: AlertStatus) => {
    onUpdateStatus(
      alert.id,
      status,
      "Operador Central Monitoreo",
      operatorNote || undefined,
      dispatchUnit || undefined
    );
    if (isAudioAlarmActive) {
      onAcknowledgeAlarm();
    }
  };

  const handleAddLiveNote = async () => {
    if (!operatorNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await fetch(`/api/alerts/${alert.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: operatorNote.trim(), author: "Operador Central" }),
      });
      setOperatorNote("");
    } catch (e) {
      console.error("Error agregando nota en vivo:", e);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl bg-slate-900 border-2 ${isDrill ? "border-amber-500/80 shadow-amber-950/50" : "border-red-500/80 shadow-red-950/50"} rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[98vh]`}>
        {/* Urgent Emergency Header Banner */}
        <div className={`bg-gradient-to-r ${isDrill ? "from-amber-600 via-amber-500 to-amber-700 text-slate-950" : "from-red-700 via-red-600 to-red-800 text-white"} px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${isDrill ? "bg-black/20 text-slate-950" : "bg-white/20 text-white"} flex items-center justify-center animate-bounce shrink-0`}>
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${isDrill ? "bg-black/30 text-amber-100" : "bg-black/40 text-red-200"}`}>
                  {triggerLabel}
                </span>
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate max-w-xs sm:max-w-md">
                  {isDrill ? "SIMULACRO" : "ALERTA"}: {alert.store.storeName}
                </h2>
              </div>
              <p className={`text-[11px] ${isDrill ? "text-amber-950 font-medium" : "text-red-100"} flex items-center gap-1.5 mt-0.5`}>
                <Clock className="w-3 h-3" />
                <span>{new Date(alert.timestamp).toLocaleTimeString()} ({alert.id})</span>
                <span>•</span>
                <span>{alert.store.city}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Alarm Control */}
            {isAudioAlarmActive && (
              <button
                onClick={onAcknowledgeAlarm}
                className="px-2.5 py-1 rounded-xl bg-white text-red-700 font-bold text-[11px] flex items-center gap-1 hover:bg-red-50 transition-colors shadow animate-pulse cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                Silenciar
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-xl bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-2.5 sm:p-3.5 overflow-y-auto space-y-3 flex-1 text-xs">
          {/* Top Quick Profile Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-[11px]">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 font-medium">Titular: </span>
                <span className="font-semibold text-white">{alert.store.ownerName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 font-medium">Teléfono: </span>
                <a
                  href={`tel:${alert.store.phone}`}
                  className="font-mono font-semibold text-emerald-400 hover:underline"
                >
                  {alert.store.phone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-500 font-medium">Dirección: </span>
                <span className="font-medium text-slate-300 truncate">{alert.store.address}</span>
              </div>
            </div>
          </div>

          {/* Reporte de Situación del Guardia en Sitio (Destacado) */}
          {(alert.guardDescription || alert.guardName || (alert.operatorNotes && alert.operatorNotes.some(n => n.includes("Guardia")))) && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-red-950/90 via-slate-900 to-red-950/70 border-2 border-red-500/80 shadow-lg flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-red-950">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded bg-red-600 text-white tracking-wide shadow-sm">
                    REPORTE EN VIVO DEL GUARDIA EN SITIO
                  </span>
                  {alert.guardName && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-400/50">
                      Oficial en Turno: {alert.guardName}
                    </span>
                  )}
                  <span className="text-[10px] text-red-300 font-mono">Terminal {alert.store.storeId}</span>
                </div>
                {(alert.guardDescription || alert.operatorNotes?.find(n => n.includes("Guardia"))) && (
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-1 bg-black/40 p-2 rounded-xl border border-red-500/30">
                    "{alert.guardDescription || alert.operatorNotes?.find(n => n.includes("Guardia"))}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Core Content: Burst Photo Viewer & Map (Camera Mode) OR Full Tactical Map (Button-Only Mode) */}
          {isCameraActive ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              {/* Left: 3-Frame Burst Photo Section or Live Stream (6 cols) */}
              <div className="lg:col-span-6 space-y-1.5 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMediaMode("BURST")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        mediaMode === "BURST"
                          ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>Ráfaga (3 Cuadros HD)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaMode("LIVE")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        mediaMode === "LIVE"
                          ? "bg-red-600 text-white shadow-sm shadow-red-950"
                          : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
                      }`}
                    >
                      <Radio className="w-3 h-3 animate-pulse text-white" />
                      <span>Cámara en Vivo (5 min)</span>
                    </button>
                  </div>

                  {mediaMode === "LIVE" && (
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      8 FPS
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-[300px] flex flex-col">
                  {mediaMode === "BURST" ? (
                    <BurstViewer
                      images={alert.images}
                      evidenceTimeline={alert.aiVerdict?.evidenceTimeline}
                    />
                  ) : (
                    <div className="relative flex-1 w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[300px]">
                      {liveFrame ? (
                        <>
                          <img
                            src={liveFrame}
                            alt="Transmisión en vivo"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2.5 left-2.5 bg-red-950/90 backdrop-blur px-2.5 py-1 rounded-lg border border-red-500/40 flex items-center gap-1.5 text-[10px] font-mono text-red-300 font-bold shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            <span>TRANSMISIÓN EN VIVO ACTIVA (8 FPS)</span>
                          </div>
                        </>
                      ) : (
                        <div className="relative w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-slate-950">
                          {alert.images && alert.images.length > 0 && (
                            <img
                              src={alert.images[alert.images.length - 1]}
                              alt="Fotograma de videoverificación"
                              className="absolute inset-0 w-full h-full object-cover opacity-30 filter blur-xs"
                            />
                          )}
                          <div className="relative z-10 text-center space-y-3 max-w-sm bg-slate-900/90 p-5 rounded-2xl border border-slate-800 backdrop-blur shadow-2xl">
                            <Camera className="w-8 h-8 text-red-500 animate-pulse mx-auto" />
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Videoverificación de Terminal
                            </h4>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              La transmisión de video en vivo se activa en tiempo real cuando la terminal del comercio pulsa el botón de pánico.
                            </p>
                            <button
                              type="button"
                              onClick={() => setMediaMode("BURST")}
                              className="w-full mt-2 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <span className="w-2 h-2 rounded-full bg-white" />
                              <span>Ver Ráfaga de Evidencia (3 Fotos HD)</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: GPS Location Map & Quick Stats (6 cols) */}
              <div className="lg:col-span-6 space-y-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    Geolocalización & Mapa Táctico Oficial
                  </h3>
                </div>
                <div className="flex-1 flex flex-col min-h-[340px] sm:min-h-[380px]">
                  <TacticalMap
                    coordinates={alert.store.coordinates}
                    storeName={alert.store.storeName}
                    address={alert.store.address}
                    city={alert.store.city}
                    className="w-full h-full flex-1 min-h-[320px] sm:min-h-[360px]"
                  />
                </div>

                {/* Status and Dispatched Unit pill */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1 text-xs shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estado del Incidente:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
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
                  {alert.dispatchedUnit && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Patrulla Asignada:</span>
                      <span className="font-mono text-blue-400 font-semibold">{alert.dispatchedUnit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Button-Only Mode View: No camera view, full-width Tactical Map & details */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <CameraOff className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Alerta en Modo Solo Botón de Emergencia</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        CÁMARA INACTIVA EN ESTABLECIMIENTO
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Esta terminal emitió la alarma exclusivamente mediante botón de pánico / atajo. No incluye fotogramas ni visor de cámara.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">Estado:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
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
              </div>

              {/* Full Width Tactical Map */}
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[360px] sm:min-h-[420px] flex flex-col">
                <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    Ubicación y Despliegue Táctico Oficial (GPS Alta Precisión)
                  </span>
                  {alert.dispatchedUnit && (
                    <span className="font-mono text-xs text-blue-400 font-bold">
                      Unidad Asignada: {alert.dispatchedUnit}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-[340px]">
                  <TacticalMap
                    coordinates={alert.store.coordinates}
                    storeName={alert.store.storeName}
                    address={alert.store.address}
                    city={alert.store.city}
                    className="w-full h-full min-h-[340px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Verification Verdict Section (solo si la cámara estuvo activa) */}
          {isCameraActive && (
            <AiVerdictPanel
              verdict={alert.aiVerdict}
              aiStatus={alert.aiStatus}
              aiError={alert.aiError}
            />
          )}

          {/* Bitácora Unificada de Eventos & Procesos en Tiempo Real */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                Bitácora de Eventos y Procesos en Tiempo Real ({alert.logs?.length || 0}):
              </h4>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {alert.logs && alert.logs.length > 0 ? (
                alert.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-[11px] py-1 px-2 rounded bg-slate-900/80 border border-slate-800/80"
                  >
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <div className="flex-1 text-slate-300">
                      <span className="font-medium text-slate-200">{log.action}</span>
                      {log.operator && (
                        <span className="text-blue-400 ml-1.5 font-bold">[{log.operator}]</span>
                      )}
                      {log.details && log.details !== log.action && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{log.details}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-[11px] italic">Sin registros aún.</div>
              )}
            </div>
          </div>

          {/* Operator Action Dispatch Controls & Bitácora Input */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              Consola de Despacho & Actualización de Bitácora:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                  Unidad o Patrulla a Asignar:
                </label>
                <input
                  type="text"
                  value={dispatchUnit}
                  onChange={(e) => setDispatchUnit(e.target.value)}
                  placeholder="Ej. Cuadrante Coyoacán #104"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                  Registrar Novedad / Proceso en Bitácora:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={operatorNote}
                    onChange={(e) => setOperatorNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLiveNote();
                      }
                    }}
                    placeholder="Ej. Patrulla 911 en arribo al lugar..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    disabled={isSubmittingNote || !operatorNote.trim()}
                    onClick={handleAddLiveNote}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                    title="Registrar en la bitácora sin cerrar"
                  >
                    <Send className="w-3 h-3" />
                    <span>Registrar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => downloadAlertPdfReport(alert)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Descargar informe oficial con fotos y bitácora forense en PDF"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Exportar Bitácora PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAction("FALSE_ALARM")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                  Marcar Falsa Alarma
                </button>

                {alert.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => handleAction("DISPATCHED")}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/60 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-950 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-white" />
                    <span>Despachar Alerta</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAction("RESOLVED")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Cerrar Incidente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};
