import React from "react";
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  Flame,
  UserX,
  Crosshair,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  ListOrdered,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { AiVerdict, ThreatLevel } from "../../types.js";

interface AiVerdictPanelProps {
  verdict?: AiVerdict | null;
  aiStatus: "pending" | "analyzing" | "completed" | "failed" | "disabled";
  aiError?: string;
  className?: string;
}

export const AiVerdictPanel: React.FC<AiVerdictPanelProps> = ({
  verdict,
  aiStatus,
  aiError,
  className = "",
}) => {
  // Threat Level Styling Helper
  const getThreatBadge = (level: ThreatLevel = "MEDIUM") => {
    switch (level) {
      case "CRITICAL":
        return {
          bg: "bg-red-950/80 border-red-500/80 text-red-300 ring-4 ring-red-500/20",
          icon: <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />,
          label: "AMENAZA CRÍTICA - CÓDIGO ROJO",
        };
      case "HIGH":
        return {
          bg: "bg-orange-950/80 border-orange-500/80 text-orange-300 ring-2 ring-orange-500/20",
          icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
          label: "AMENAZA ALTA - RESPUESTA INMEDIATA",
        };
      case "MEDIUM":
        return {
          bg: "bg-amber-950/80 border-amber-500/70 text-amber-300",
          icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
          label: "RIESGO MEDIO - VERIFICAR CON COMERCIO",
        };
      case "LOW":
        return {
          bg: "bg-blue-950/80 border-blue-500/60 text-blue-300",
          icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
          label: "RIESGO BAJO - PREVENTIVO",
        };
      case "FALSE_ALARM":
        return {
          bg: "bg-emerald-950/80 border-emerald-500/60 text-emerald-300",
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          label: "FALSA ALARMA DETECTADA",
        };
      default:
        return {
          bg: "bg-slate-900 border-slate-700 text-slate-300",
          icon: <Brain className="w-5 h-5 text-slate-400" />,
          label: "EVALUANDO AMENAZA",
        };
    }
  };

  if (aiStatus === "disabled") {
    return null;
  }

  if (aiStatus === "pending" || aiStatus === "analyzing") {
    return (
      <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Brain className="w-4 h-4 animate-spin" />
            </div>
            <span>Dictamen de Inteligencia Automatizado</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 font-mono flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Analizando Ráfaga...
          </span>
        </div>

        <div className="p-6 rounded-xl bg-slate-950/80 border border-dashed border-purple-500/30 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
          <div>
            <h4 className="text-sm font-semibold text-white">
              Evaluando 3 fotogramas de ráfaga en tiempo real
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Examinando presencia de armas, intrusos, violencia física y rostros cubiertos en tiempo real...
            </p>
          </div>
          <div className="w-full max-w-xs bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 h-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (aiStatus === "failed" || !verdict) {
    return (
      <div className={`p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm font-bold text-red-400">
          <AlertOctagon className="w-4 h-4" />
          <span>Fallo en Análisis Automatizado</span>
        </div>
        <p className="text-xs text-slate-400">
          {aiError || "No se pudo obtener el dictamen automático. Proceder con verificación visual manual."}
        </p>
      </div>
    );
  }

  const badge = getThreatBadge(verdict.threatLevel);

  return (
    <div className={`p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-4 ${className}`}>
      {/* Header with Title and Model */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Brain className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dictamen de Inteligencia Automatizado
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {verdict.modelUsed?.replace(/gemini|Gemini|IA|AI/g, "") || "Verificación Automática"}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Analizado: {new Date(verdict.analyzedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Threat Level Pill */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 ${badge.bg}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
      </div>

      {/* Threat Summary & Confidence Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Nivel de Certeza del Análisis:</span>
          <span className="font-mono font-bold text-purple-300">{verdict.confidenceScore}%</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              verdict.threatLevel === "CRITICAL"
                ? "bg-red-500"
                : verdict.threatLevel === "HIGH"
                ? "bg-orange-500"
                : "bg-purple-500"
            }`}
            style={{ width: `${verdict.confidenceScore}%` }}
          />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 leading-relaxed">
          <span className="font-bold text-white">Resumen Ejecutivo: </span>
          {verdict.summary}
        </div>
      </div>

      {/* Threat Checklist Grid */}
      <div>
        <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
          Matriz de Detección de Amenazas:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {/* Weapons */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              verdict.threatDetails.weaponsDetected
                ? "bg-red-950/60 border-red-500/60 text-red-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <Crosshair className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Armas</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.weaponsDetected
                  ? verdict.threatDetails.weaponTypes?.join(", ") || "DETECTADAS"
                  : "No detectadas"}
              </div>
            </div>
          </div>

          {/* Physical Aggression */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              verdict.threatDetails.physicalAggression
                ? "bg-red-950/60 border-red-500/60 text-red-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Violencia Física</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.physicalAggression ? "EN CURSO" : "No detectada"}
              </div>
            </div>
          </div>

          {/* Intruders */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              (verdict.threatDetails.intrudersCount || 0) > 1
                ? "bg-orange-950/60 border-orange-500/60 text-orange-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <UserX className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Sujetos</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.intrudersCount || 1} Persona(s)
              </div>
            </div>
          </div>

          {/* Facial Coverings */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              verdict.threatDetails.facialCoverings
                ? "bg-amber-950/60 border-amber-500/60 text-amber-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Rostros Ocultos</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.facialCoverings ? "Capucha / Máscara" : "Descubiertos"}
              </div>
            </div>
          </div>

          {/* Fire / Smoke */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              verdict.threatDetails.fireOrSmoke
                ? "bg-red-950/60 border-red-500/60 text-red-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Humo / Fuego</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.fireOrSmoke ? "DETECTADO" : "Limpio"}
              </div>
            </div>
          </div>

          {/* Distress Signs */}
          <div
            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
              verdict.threatDetails.distressSigns
                ? "bg-purple-950/60 border-purple-500/60 text-purple-300 font-bold"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-[11px]">Signos de Auxilio</div>
              <div className="text-[10px] font-mono">
                {verdict.threatDetails.distressSigns ? "Positivo" : "No evidentes"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Protocols */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <ListOrdered className="w-4 h-4" />
          <span>Protocolo Táctico Recomendado:</span>
        </div>
        <ul className="space-y-1.5 text-xs text-slate-300">
          {verdict.recommendedProtocol.map((protocol, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{protocol}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
