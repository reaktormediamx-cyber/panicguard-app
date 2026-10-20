import React, { useState, useEffect } from "react";
import {
  X,
  Radio,
  VolumeX,
  Phone,
  Shield,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Camera,
  Layers,
} from "lucide-react";
import { PanicAlert, AlertStatus, formatTriggerType, extractEmergencyReason } from "../../types.js";
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

  const cleanText = (str?: string) => {
    if (!str) return "";
    return str
      .replace(/\s*\(\s*undefined\s*\)/gi, "")
      .replace(/\bundefined\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

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
    onClose();
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

  // Extraer texto limpio de reporte del guardia y motivo/tipo de emergencia
  const rawGuardReport = alert.guardDescription || alert.operatorNotes?.find((n) => n.includes("Guardia") || n.includes("PULSADOR"));
  const cleanGuardReport = rawGuardReport ? rawGuardReport.replace(/["“”]/g, "").trim() : null;
  const { reason: parsedReason, cleanSummary: guardSummary } = extractEmergencyReason(cleanGuardReport);
  const fallbackLogReason = !parsedReason
    ? alert.logs
        ?.map((l) => extractEmergencyReason(l.details || l.action).reason)
        .find((r) => Boolean(r)) || null
    : null;
  const emergencyReason = parsedReason || fallbackLogReason;

  // Contacto principal unificado (evita repetir Carlos Mendoza en 3 sitios)
  const contactName = alert.guardName || alert.store?.ownerName || "Personal en Turno";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl bg-slate-900 border-2 ${isDrill ? "border-amber-500/80 shadow-amber-950/50" : "border-red-500/80 shadow-red-950/50"} rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh]`}>
        
        {/* Cabecera Táctica Compacta */}
        <div className={`bg-gradient-to-r ${isDrill ? "from-amber-600 via-amber-500 to-amber-700 text-slate-950" : "from-red-700 via-red-600 to-red-800 text-white"} px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg ${isDrill ? "bg-black/20 text-slate-950" : "bg-white/20 text-white"} flex items-center justify-center animate-bounce shrink-0`}>
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${isDrill ? "bg-black/30 text-amber-100" : "bg-black/40 text-red-200"}`}>
                  {triggerLabel}
                </span>
                <h2 className="text-xs sm:text-sm font-extrabold tracking-tight truncate max-w-xs sm:max-w-md">
                  {isDrill ? "SIMULACRO" : "ALERTA"}: {cleanText(alert.store?.storeName || "Terminal Enlazada")}
                </h2>
                {emergencyReason && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black uppercase text-[10px] tracking-wide shadow-md border border-amber-200 flex items-center gap-1 shrink-0">
                    <AlertTriangle className="w-3 h-3 text-red-700 shrink-0" />
                    <span>TIPO: {emergencyReason}</span>
                  </span>
                )}
                <span className="text-[10px] font-mono opacity-80">
                  {new Date(alert.timestamp).toLocaleTimeString()} ({alert.id}) • {alert.store?.city}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Indicador discreto de modo hardware */}
            {!isCameraActive && (
              <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-200 border border-white/20">
                Solo Botón
              </span>
            )}

            {/* Badge de Estado del Incidente */}
            <span
              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                alert.status === "ACTIVE"
                  ? "bg-black/40 text-red-100 border border-white/30 animate-pulse"
                  : alert.status === "DISPATCHED"
                  ? "bg-amber-950/80 text-amber-200 border border-amber-400/50"
                  : "bg-emerald-950/80 text-emerald-200 border border-emerald-400/50"
              }`}
            >
              {alert.status}
            </span>

            {/* Audio Alarm Control */}
            {isAudioAlarmActive && (
              <button
                onClick={onAcknowledgeAlarm}
                className="px-2 py-0.5 rounded-lg bg-white text-red-700 font-bold text-[10px] flex items-center gap-1 hover:bg-red-50 transition-colors shadow animate-pulse cursor-pointer"
              >
                <VolumeX className="w-3 h-3" />
                Silenciar
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Fila de Datos Rápidos Unificada (Sin repeticiones) */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-slate-300">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500">Titular/Oficial:</span>
            <span className="font-semibold text-white truncate max-w-[150px] sm:max-w-none">{contactName}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500">Tel:</span>
            <a href={`tel:${alert.store?.phone}`} className="font-mono font-semibold text-emerald-400 hover:underline">
              {alert.store?.phone || "S/N"}
            </a>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500 font-mono">Terminal:</span>
            <span className="font-mono text-slate-300">{alert.store?.storeId || "STR-01"}</span>
          </div>

          {alert.dispatchedUnit && (
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold font-mono text-[10px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
              <span>🚓 {alert.dispatchedUnit}</span>
            </div>
          )}
        </div>

        {/* Reporte Directo del Guardia en Sitio con Motivo de Emergencia Resaltado */}
        {(cleanGuardReport || emergencyReason) && (
          <div className="bg-red-950/90 border-b border-red-500/60 px-3 py-1.5 flex flex-wrap items-center gap-2 text-[11px] text-red-200 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="font-bold text-red-300 uppercase tracking-wider text-[10px]">
                Motivo / Reporte:
              </span>
            </div>

            {emergencyReason && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black uppercase tracking-wide text-xs shadow-md shadow-amber-950/50 border-2 border-amber-200 flex items-center gap-1.5 shrink-0 animate-pulse">
                <span>🚨 TIPO DE EMERGENCIA: {emergencyReason}</span>
              </span>
            )}

            {guardSummary && (
              <span className="text-red-100/90 truncate flex-1 font-mono font-medium" title={cleanGuardReport || ""}>
                "{guardSummary}"
              </span>
            )}
          </div>
        )}

        {/* Cuerpo Principal del Modal (Flexible y adaptable sin scroll en modal) */}
        <div className="p-2 sm:p-2.5 flex-1 min-h-0 overflow-hidden flex flex-col text-xs">
          {isCameraActive ? (
            /* Modo con Cámara Activa: Visor de Ráfaga/Live a la izquierda, Mapa y Bitácora a la derecha */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 h-full min-h-0">
              {/* Columna Izquierda: Fotogramas HD / Stream */}
              <div className="lg:col-span-6 flex flex-col h-full min-h-0 space-y-1.5">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMediaMode("BURST")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        mediaMode === "BURST"
                          ? "bg-slate-800 text-white border border-slate-700"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span>Ráfaga HD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaMode("LIVE")}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        mediaMode === "LIVE"
                          ? "bg-red-600 text-white"
                          : "text-red-400 hover:text-red-300"
                      }`}
                    >
                      <Radio className="w-2.5 h-2.5 animate-pulse text-white" />
                      <span>Cámara en Vivo</span>
                    </button>
                  </div>

                  {mediaMode === "LIVE" && (
                    <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded-full animate-pulse">
                      8 FPS ACTIVO
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {mediaMode === "BURST" ? (
                    <BurstViewer
                      images={alert.images}
                      evidenceTimeline={alert.aiVerdict?.evidenceTimeline}
                    />
                  ) : (
                    <div className="relative flex-1 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[180px]">
                      {liveFrame ? (
                        <img src={liveFrame} alt="Transmisión en vivo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4 space-y-2">
                          <Camera className="w-6 h-6 text-red-500 animate-pulse mx-auto" />
                          <p className="text-[11px] text-slate-400">Esperando fotogramas de transmisión en tiempo real...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {alert.aiVerdict && (
                  <div className="shrink-0 p-1.5 rounded-lg bg-slate-950/90 border border-purple-500/30 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-purple-300">Dictamen IA: {alert.aiVerdict.threatLevel}</span>
                    <span className="text-slate-400 truncate max-w-xs">{alert.aiVerdict.summary}</span>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Mapa Táctico + Bitácora */}
              <div className="lg:col-span-6 flex flex-col h-full min-h-0 space-y-2">
                <div className="h-[180px] min-h-[160px] shrink-0">
                  <TacticalMap
                    coordinates={alert.store?.coordinates}
                    storeName={alert.store?.storeName}
                    address={alert.store?.address}
                    city={alert.store?.city}
                    className="w-full h-full"
                  />
                </div>

                {/* Bitácora Scrollable integrada */}
                <div className="flex-1 min-h-0 bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex flex-col overflow-hidden">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1 shrink-0">
                    <FileText className="w-3 h-3 text-rose-500" />
                    Bitácora en Tiempo Real ({alert.logs?.length || 0})
                  </span>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                    {alert.logs && alert.logs.length > 0 ? (
                      alert.logs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[10px] py-0.5 px-1.5 rounded bg-slate-900/80 border border-slate-800/80">
                          <span className="font-mono text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="font-medium text-slate-200">{log.action}</span>
                          {log.operator && <span className="text-rose-400 font-bold">[{log.operator}]</span>}
                          {log.details && log.details !== log.action && <span className="text-slate-400 truncate"> - {log.details}</span>}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-[10px] italic">Sin registros aún.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Modo Solo Botón (Sin Cámara): División 2 columnas (Mapa 60% + Bitácora 40%) que caben completas */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 h-full min-h-0">
              {/* Columna Izquierda: Mapa Táctico Título Limpio (7 columnas) */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-0">
                <TacticalMap
                  coordinates={alert.store?.coordinates}
                  storeName={alert.store?.storeName}
                  address={alert.store?.address}
                  city={alert.store?.city}
                  className="w-full h-full flex-1 min-h-[220px]"
                />
              </div>

              {/* Columna Derecha: Bitácora de Eventos Completa (5 columnas) */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-0 bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 overflow-hidden">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    Bitácora en Tiempo Real ({alert.logs?.length || 0})
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">ID: {alert.id}</span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 py-1.5 pr-1">
                  {alert.logs && alert.logs.length > 0 ? (
                    alert.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/90 text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{log.action}</span>
                          <span className="font-mono text-[9px] text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {log.operator && (
                          <div className="text-[10px] text-rose-400 font-medium">
                            Por: {log.operator}
                          </div>
                        )}
                        {log.details && log.details !== log.action && (
                          <div className="text-[10px] text-slate-400 bg-black/20 p-1 rounded font-mono">
                            {log.details}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-xs italic py-4 text-center">Sin registros en bitácora.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Consola de Despacho & Actualización Rápida Fija (Siempre visible sin scroll) */}
        <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Asignación de patrulla / cuadrante */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0">Patrulla:</span>
            <input
              type="text"
              value={dispatchUnit}
              onChange={(e) => setDispatchUnit(e.target.value)}
              placeholder="Ej. Sector 911"
              className="w-28 sm:w-36 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Registro ágil en bitácora */}
          <div className="flex-1 min-w-[180px] flex items-center gap-1.5">
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
              placeholder="Registrar novedad en bitácora..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
            />
            <button
              type="button"
              disabled={isSubmittingNote || !operatorNote.trim()}
              onClick={handleAddLiveNote}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-lg text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1 transition-all"
              title="Añadir a la bitácora"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Nota</span>
            </button>
          </div>

          {/* Botones Tácticos de Operador */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => downloadAlertPdfReport(alert)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Descargar informe oficial en PDF"
            >
              <FileText className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction("FALSE_ALARM")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Falsa Alarma</span>
            </button>

            {alert.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() => handleAction("DISPATCHED")}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Despachar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleAction("RESOLVED")}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
