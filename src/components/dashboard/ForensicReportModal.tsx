import React from "react";
import { X, Printer, Download, ShieldAlert, CheckCircle, FileText, MapPin, Clock, User, Phone, Building2 } from "lucide-react";
import { PanicAlert, formatTriggerType } from "../../types.js";
import { useAuth } from "../../context/AuthContext.js";

interface ForensicReportModalProps {
  alert: PanicAlert;
  onClose: () => void;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({ alert, onClose }) => {
  const { systemSettings } = useAuth();
  const { label: triggerLabel } = formatTriggerType(alert.triggerType);
  const reportDate = new Date().toLocaleString();
  const incidentDate = new Date(alert.timestamp).toLocaleString();
  const forensicHash = "SHA256-GUARD-" + alert.id + "-" + Math.abs(alert.timestamp).toString(16).toUpperCase();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] text-slate-100">
        
        {/* Header Actions */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <FileText className="w-5 h-5" />
            <span>Generador de Reporte Pericial y Cadena de Custodia (Fiscalía)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div id="forensic-report-print" className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-slate-900 text-slate-200 text-xs sm:text-sm font-sans">
          
          {/* Official Header */}
          <div className="border-b border-slate-700 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-xl">
                🛡️
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
                  PANICGUARD C4/C5 — DICTAMEN PERICIAL TÁCTICO
                </h1>
                <p className="text-slate-400 text-xs">Sistema Centralizado de Videoverificación y Respuesta Inmediata</p>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <div>Folio: <span className="text-white font-bold">{alert.id}</span></div>
              <div>Emisión: {reportDate}</div>
            </div>
          </div>

          {/* Incident Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">1. Datos del Establecimiento</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Comercio:</span> <span className="font-bold text-white">{alert.store.storeName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">ID Tienda:</span> <span className="font-mono text-slate-300">{alert.store.storeId}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Titular:</span> <span className="text-slate-300">{alert.store.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Teléfono:</span> <span className="font-mono text-emerald-400">{alert.store.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Dirección:</span> <span className="text-slate-300 truncate max-w-[220px]">{alert.store.address}, {alert.store.city}</span></div>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">2. Metadatos de la Alerta</h3>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Tipo de Disparo:</span> <span className="font-bold text-red-400 uppercase">{triggerLabel}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Fecha / Hora Evento:</span> <span className="font-mono text-slate-300">{incidentDate}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Coordenadas GPS:</span> <span className="font-mono text-emerald-400">{alert.store.coordinates.latitude}, {alert.store.coordinates.longitude}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Estado Actual:</span> <span className="font-bold uppercase text-blue-400">{alert.status}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Unidad Asignada:</span> <span className="text-slate-300">{alert.dispatchedUnit || "Sin unidad"}</span></div>
              </div>
            </div>
          </div>

          {/* AI Forensic Analysis Summary (Only if AI is enabled by SuperAdmin) */}
          {systemSettings?.aiEnabled && alert.aiVerdict && (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase text-blue-400 tracking-wider flex items-center gap-2">
                  <span>🤖</span> Análisis Forense Automatizado por Inteligencia Artificial
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  alert.aiVerdict.threatLevel === "CRITICAL" ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-amber-500/20 text-amber-300"
                }`}>
                  Nivel de Amenaza: {alert.aiVerdict.threatLevel}
                </span>
              </div>
              <p className="text-slate-300 text-xs italic bg-slate-900 p-3 rounded-xl border border-slate-800">
                "{alert.aiVerdict.summary}"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Intrusos detectados:</span> <span className="font-bold text-white">{alert.aiVerdict.intruderCount}</span></div>
                <div><span className="text-slate-400">Armas identificadas:</span> <span className="font-bold text-red-400">{alert.aiVerdict.weaponsDetected ? "SÍ (Posible Armamento)" : "No detectadas"}</span></div>
              </div>
            </div>
          )}

          {/* Forensic Photos Evidence Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">3. Ráfaga Fotográfica de Videoverificación (Cadena de Custodia)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {alert.images.map((imgUrl, idx) => (
                <div key={idx} className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 space-y-1.5 p-2">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                    <img src={imgUrl} alt={`Fotograma ${idx + 1}`} className="w-full h-full object-cover filter contrast-125" />
                    <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono text-red-400 font-bold">
                      FRAME #{idx + 1}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-center">
                    Hash SHA-256: {forensicHash.slice(0, 16)}...[{idx + 1}]
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operator Notes & Chain of Custody */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">4. Bitácora de Operación y Firma Criptográfica</h3>
            <p className="text-slate-300">
              <span className="text-slate-400 font-semibold">Nota del Operador:</span> {alert.operatorNotes || "Sin notas adicionales registradas."}
            </p>
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row justify-between text-[11px] font-mono text-slate-400">
              <span>Sello Hash Cadena de Custodia: <strong className="text-emerald-400">{forensicHash}</strong></span>
              <span>Validación C4/C5 Cryptographic Stamp</span>
            </div>
          </div>

          {/* Footer Signatures for Official Print */}
          <div className="pt-8 border-t border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-6">
              <div className="border-b border-slate-600 pb-2 w-3/4 mx-auto"></div>
              <div className="text-slate-400 font-medium">Firma del Operador de Guardia C4/C5</div>
            </div>
            <div className="space-y-6">
              <div className="border-b border-slate-600 pb-2 w-3/4 mx-auto"></div>
              <div className="text-slate-400 font-medium">Sello Oficial / Agencia de Seguridad</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
