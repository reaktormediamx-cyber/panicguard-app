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
} from "lucide-react";
import { PanicAlert, AlertStatus, formatTriggerType } from "../../types.js";
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
  const [dispatchUnit, setDispatchUnit] = useState<string>("Patrulla Sector #911-A");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className={`relative w-full max-w-5xl bg-slate-900 border-2 ${isDrill ? "border-amber-500/80 shadow-amber-950/50" : "border-red-500/80 shadow-red-950/50"} rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]`}>
        {/* Urgent Emergency Header Banner */}
        <div className={`bg-gradient-to-r ${isDrill ? "from-amber-600 via-amber-500 to-amber-700 text-slate-950" : "from-red-700 via-red-600 to-red-800 text-white"} px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${isDrill ? "bg-black/20 text-slate-950" : "bg-white/20 text-white"} flex items-center justify-center animate-bounce`}>
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono font-black uppercase px-2 py-0.5 rounded ${isDrill ? "bg-black/30 text-amber-100" : "bg-black/40 text-red-200"}`}>
                  {triggerLabel}
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {isDrill ? "SIMULACRO DE PRUEBA EN TIEMPO REAL" : "ALERTA EN TIEMPO REAL"}: {alert.store.storeName}
                </h2>
              </div>
              <p className={`text-xs ${isDrill ? "text-amber-950 font-medium" : "text-red-100"} flex items-center gap-2 mt-0.5`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(alert.timestamp).toLocaleTimeString()} ({alert.id})</span>
                <span>•</span>
                <span>{alert.store.city}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Alarm Control */}
            {isAudioAlarmActive && (
              <button
                onClick={onAcknowledgeAlarm}
                className="px-3.5 py-1.5 rounded-xl bg-white text-red-700 font-bold text-xs flex items-center gap-1.5 hover:bg-red-50 transition-colors shadow animate-pulse cursor-pointer"
              >
                <VolumeX className="w-4 h-4" />
                Silenciar Sirena
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Quick Profile Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 font-medium">Titular / Dueño:</div>
                <div className="font-semibold text-white">{alert.store.ownerName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 font-medium">Teléfono de Emergencia:</div>
                <a
                  href={`tel:${alert.store.phone}`}
                  className="font-mono font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  {alert.store.phone}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-slate-500 font-medium">Dirección Comercial:</div>
                <div className="font-medium text-slate-300 truncate">{alert.store.address}</div>
              </div>
            </div>
          </div>

          {/* Core Content: Split Burst Photo Viewer & Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: 3-Frame Burst Photo Section (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
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
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Geolocalización & Posición Satelital
              </h3>
              <TacticalMap
                coordinates={alert.store.coordinates}
                storeName={alert.store.storeName}
                address={alert.store.address}
              />

              {/* Status and Dispatched Unit pill */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Estado de Operación:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase ${
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
                    <span className="text-slate-400">Unidad Policial:</span>
                    <span className="font-mono text-blue-400 font-semibold">{alert.dispatchedUnit}</span>
                  </div>
                )}
                {alert.operatorNotes && alert.operatorNotes.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-slate-800/80 pt-2 mt-2">
                    <span className="text-slate-450 font-bold">Nota de Bitácora del Operador:</span>
                    <p className="text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 font-sans text-xs leading-relaxed">
                      {alert.operatorNotes[alert.operatorNotes.length - 1]}
                    </p>
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
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-400" />
              Consola de Despacho y Acción Táctica:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Unidad o Patrulla a Asignar:
                </label>
                <input
                  type="text"
                  value={dispatchUnit}
                  onChange={(e) => setDispatchUnit(e.target.value)}
                  placeholder="Ej. Cuadrante Coyoacán #104"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Nota de Bitácora del Operador:
                </label>
                <input
                  type="text"
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                  placeholder="Ej. Comunicación confirmada con policía local..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleAction("FALSE_ALARM")}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-amber-400" />
                Marcar Falsa Alarma
              </button>

              <button
                onClick={() => handleAction("RESOLVED")}
                className="px-4 py-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Cerrar Incidente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
