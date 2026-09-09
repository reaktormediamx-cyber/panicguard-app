import React from "react";
import { Zap, Store, Shield, ArrowRight, Activity, Cpu } from "lucide-react";
import { StoreMetadata, PanicAlert, AlertStatus } from "../../types.js";
import { MerchantTerminal } from "../merchant/MerchantTerminal.js";
import { MonitoringDashboard } from "../dashboard/MonitoringDashboard.js";

interface DualViewSimulatorProps {
  store: StoreMetadata;
  onOpenStoreConfig: () => void;
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

export const DualViewSimulator: React.FC<DualViewSimulatorProps> = ({
  store,
  onOpenStoreConfig,
  alerts,
  isConnected,
  activeEmergencyModalAlert,
  setActiveEmergencyModalAlert,
  isAudioAlarmActive,
  acknowledgeAlarmSound,
  updateAlertStatus,
  deleteAlert,
}) => {
  return (
    <div className="w-full max-w-[1700px] mx-auto p-3 sm:p-5 space-y-6">
      {/* Simulation Info Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-purple-950 border border-blue-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Modo de Simulación Split: Comercio ⇄ Central de Monitoreo
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                Latencia &lt; 1s
              </span>
            </h3>
            <p className="text-slate-300 mt-0.5">
              Presiona el botón de pánico en la terminal izquierda para observar la transmisión instantánea por Socket.io y el dictamen de verificación automática en la derecha.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebSockets: {isConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Análisis: Verificación Automática</span>
          </div>
        </div>
      </div>

      {/* Dual Side-by-Side Viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side: Merchant Web Terminal (5 cols) */}
        <div className="xl:col-span-5 bg-slate-950/60 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Store className="w-4 h-4 text-red-400" />
              <span>TERMINAL COMERCIAL (PWA TIENDA)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Punto de Venta / Caja</span>
          </div>

          <div className="flex-1">
            <MerchantTerminal store={store} onOpenStoreConfig={onOpenStoreConfig} />
          </div>
        </div>

        {/* Right Side: Security Command Center Dashboard (7 cols) */}
        <div className="xl:col-span-7 bg-slate-950/60 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>CONSOLA CENTRAL DE MONITOREO & POLICÍA</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Recepción Inmediata</span>
          </div>

          <div className="flex-1">
            <MonitoringDashboard
              alerts={alerts}
              isConnected={isConnected}
              activeEmergencyModalAlert={activeEmergencyModalAlert}
              setActiveEmergencyModalAlert={setActiveEmergencyModalAlert}
              isAudioAlarmActive={isAudioAlarmActive}
              acknowledgeAlarmSound={acknowledgeAlarmSound}
              updateAlertStatus={updateAlertStatus}
              deleteAlert={deleteAlert}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
