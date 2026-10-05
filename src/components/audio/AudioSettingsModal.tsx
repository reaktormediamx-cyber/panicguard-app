import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Square,
  Check,
  Radio,
  Sliders,
  Bell,
  Sparkles,
  ShieldAlert,
  Flame,
  X
} from "lucide-react";
import {
  alarmSound,
  ALERT_TONE_OPTIONS,
  AlertSoundTone,
  AlertToneOption
} from "../../utils/audio.js";

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedTone, setSelectedTone] = useState<AlertSoundTone>(alarmSound.getSelectedTone());
  const [volume, setVolume] = useState<number>(alarmSound.getVolume());
  const [isMuted, setIsMuted] = useState<boolean>(alarmSound.isMuted());
  const [playingToneId, setPlayingToneId] = useState<AlertSoundTone | null>(null);
  const [isTestingContinuous, setIsTestingContinuous] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTone(alarmSound.getSelectedTone());
      setVolume(alarmSound.getVolume());
      setIsMuted(alarmSound.isMuted());
    } else {
      alarmSound.stopAlarm();
      setPlayingToneId(null);
      setIsTestingContinuous(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectTone = (tone: AlertSoundTone) => {
    setSelectedTone(tone);
    alarmSound.setSelectedTone(tone);
    alarmSound.playTone(tone);
    setPlayingToneId(tone);
    setTimeout(() => {
      setPlayingToneId((curr) => (curr === tone ? null : curr));
    }, 1500);
  };

  const handlePreviewTone = (tone: AlertSoundTone, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTestingContinuous) {
      alarmSound.stopAlarm();
      setIsTestingContinuous(false);
    }
    setPlayingToneId(tone);
    alarmSound.playTone(tone);
    setTimeout(() => {
      setPlayingToneId((curr) => (curr === tone ? null : curr));
    }, 1500);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    alarmSound.setVolume(newVol);
    if (isMuted) {
      setIsMuted(false);
      alarmSound.setMuted(false);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    alarmSound.setMuted(nextMute);
    if (nextMute) {
      alarmSound.stopAlarm();
      setPlayingToneId(null);
      setIsTestingContinuous(false);
    }
  };

  const handleTestContinuousAlarm = () => {
    if (isTestingContinuous) {
      alarmSound.stopAlarm();
      setIsTestingContinuous(false);
    } else {
      setIsTestingContinuous(true);
      alarmSound.startEmergencySiren(selectedTone);
      // Auto-stop simulation after 4 seconds
      setTimeout(() => {
        alarmSound.stopAlarm();
        setIsTestingContinuous(false);
      }, 4000);
    }
  };

  const getIntensityBadge = (intensity: AlertToneOption["intensity"]) => {
    switch (intensity) {
      case "ALTA":
        return "bg-red-950/80 text-red-400 border border-red-800/80";
      case "MEDIA":
        return "bg-amber-950/80 text-amber-400 border border-amber-800/80";
      case "SUAVE":
        return "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80";
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Personalización de Tonos de Alerta & Sirenas
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona la señal acústica que se reproducirá en consola ante cada botón de pánico
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              alarmSound.stopAlarm();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quick Sound Control Bar: Volume & Mute */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isMuted
                    ? "bg-red-950/80 border-red-700/80 text-red-300"
                    : "bg-slate-900 border-slate-700 text-emerald-400 hover:text-white"
                }`}
                title={isMuted ? "Sonido silenciado - Clic para activar" : "Sonido activo - Clic para silenciar"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span>{isMuted ? "Silenciado (Mute)" : "Audio Habilitado"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestContinuousAlarm}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isTestingContinuous
                    ? "bg-red-600 border-red-500 text-white animate-pulse"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-750 text-slate-300"
                }`}
                title="Simula 4 segundos de alarma continua del tono actual"
              >
                {isTestingContinuous ? <Square className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isTestingContinuous ? "Detener Sirena" : "Simular Emergencia"}</span>
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-3 w-full sm:w-56">
              <Volume1 className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
                title="Volumen general del sistema de alerta"
              />
              <span className="text-xs font-mono font-bold text-slate-300 min-w-[36px] text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* List of Available Alert Tones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                BIBLIOTECA DE TONOS TÁCTICOS ({ALERT_TONE_OPTIONS.length})
              </span>
              <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Síntesis Web Audio sin latencia
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {ALERT_TONE_OPTIONS.map((option) => {
                const isSelected = selectedTone === option.id;
                const isPlaying = playingToneId === option.id;

                return (
                  <div
                    key={option.id}
                    onClick={() => handleSelectTone(option.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/50"
                        : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-red-600/30 border border-red-500/50 text-red-300"
                            : "bg-slate-900 border border-slate-800 text-slate-400"
                        }`}
                      >
                        {option.icon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {option.name}
                          </h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${getIntensityBadge(option.intensity)}`}>
                            {option.intensity}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold font-mono flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> ACTIVO
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Play Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => handlePreviewTone(option.id, e)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isPlaying
                            ? "bg-red-600 border-red-500 text-white animate-pulse"
                            : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                        }`}
                        title="Escuchar muestra del tono"
                      >
                        {isPlaying ? (
                          <>
                            <Radio className="w-3.5 h-3.5 animate-spin" />
                            <span>Sonando</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span>Escuchar</span>
                          </>
                        )}
                      </button>

                      {/* Select / Active radio indicator */}
                      <button
                        type="button"
                        onClick={() => handleSelectTone(option.id)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-950"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                        }`}
                        title={isSelected ? "Tono actualmente activo" : "Elegir este tono"}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>El tono seleccionado se guardará en tu navegador y sonará en todas las alertas recibidas.</span>
          </div>

          <button
            type="button"
            onClick={() => {
              alarmSound.stopAlarm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#f43f5e] hover:to-[#e11d48] text-white font-bold text-xs cursor-pointer shadow-md shadow-rose-950/40 transition-all active:scale-95"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
