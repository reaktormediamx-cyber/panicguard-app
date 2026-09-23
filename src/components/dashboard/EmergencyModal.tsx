import React, { useState } from "react";
import {
  X,
  Radio,
  Volume2,
  VolumeX,
  Phone,
  Shield,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mic,
  FileText,
} from "lucide-react";
import { PanicAlert, AlertStatus, formatTriggerType } from "../../types.js";
import { BurstViewer } from "./BurstViewer.js";
import { TacticalMap } from "./TacticalMap.js";
import { AiVerdictPanel } from "./AiVerdictPanel.js";
import { LiveIntercomModal } from "./LiveIntercomModal.js";
import { ForensicReportModal } from "./ForensicReportModal.js";

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
  const [dispatchUnit, setDispatchUnit] = useState<string>("Patrulla Sector #911-A");
  const [showIntercom, setShowIntercom] = useState<boolean>(false);
  const [showForensicReport, setShowForensicReport] = useState<boolean>(false);

  const { label: triggerLabel, isDrill } = formatTriggerType(alert.triggerType);

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
            {/* Advanced Central Tools: Option 2 & Option 4 */}
            <button
              onClick={() => setShowIntercom(true)}
              className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors shadow cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 animate-pulse" />
              Intercom
            </button>

            <button
              onClick={() => setShowForensicReport(true)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-colors shadow cursor-pointer border border-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              PDF
            </button>

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

          {/* Core Content: Split Burst Photo Viewer & Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left: 3-Frame Burst Photo Section (7 cols) */}
            <div className="lg:col-span-7 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Ráfaga de Videoverificación (3 Cuadros HD)
                </h3>
              </div>
              <BurstViewer
                images={alert.images}
                evidenceTimeline={alert.aiVerdict?.evidenceTimeline}
              />
            </div>

            {/* Right: GPS Location Map & Quick Stats (5 cols) */}
            <div className="lg:col-span-5 space-y-2">
              <h3 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                Geolocalización & Posición Satelital
              </h3>
              <TacticalMap
                coordinates={alert.store.coordinates}
                storeName={alert.store.storeName}
                address={alert.store.address}
                city={alert.store.city}
                className="h-32 sm:h-36"
              />

              {/* Status and Dispatched Unit pill */}
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estado:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
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
                    <span className="text-slate-400">Unidad:</span>
                    <span className="font-mono text-blue-400 font-semibold">{alert.dispatchedUnit}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Verification Verdict Section (Updates automatically in place) */}
          <AiVerdictPanel
            verdict={alert.aiVerdict}
            aiStatus={alert.aiStatus}
            aiError={alert.aiError}
          />

          {/* Operator Action Dispatch Controls */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              Consola de Despacho y Acción Táctica:
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
                  Nota de Bitácora del Operador:
                </label>
                <input
                  type="text"
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                  placeholder="Ej. Comunicación confirmada..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                onClick={() => handleAction("FALSE_ALARM")}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5 text-amber-400" />
                Marcar Falsa Alarma
              </button>

              <button
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

      {showIntercom && (
        <LiveIntercomModal alert={alert} onClose={() => setShowIntercom(false)} />
      )}

      {showForensicReport && (
        <ForensicReportModal alert={alert} onClose={() => setShowForensicReport(false)} />
      )}
    </>
  );
};
