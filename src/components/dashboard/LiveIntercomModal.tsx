import React, { useState, useEffect } from "react";
import { X, Mic, MicOff, Video, VideoOff, Volume2, Radio, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { PanicAlert } from "../../types.js";

interface LiveIntercomModalProps {
  alert: PanicAlert;
  onClose: () => void;
}

export const LiveIntercomModal: React.FC<LiveIntercomModalProps> = ({ alert, onClose }) => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isVideoLive, setIsVideoLive] = useState<boolean>(true);
  const [audioVolume, setAudioVolume] = useState<number>(80);
  const [intercomStatus, setIntercomStatus] = useState<string>("Conectado al canal seguro del establecimiento (WebRTC P2P)");
  const [transcriptLog, setTranscriptLog] = useState<string[]>([
    "[" + new Date().toLocaleTimeString() + "] Canal de audio bidireccional abierto con éxito.",
    "[" + new Date().toLocaleTimeString() + "] Transmisión de video en vivo (HD Substream) activa.",
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const samplePhrases = [
        "Transmisión de audio ambiental: Sonido ambiental estable capturado en local.",
        "Señal de video en vivo sincronizada con latencia de 120ms.",
        "Intercomunicador central en espera de transmisión PTT (Push-To-Talk).",
      ];
      const randomPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
      setTranscriptLog(prev => [ "[" + new Date().toLocaleTimeString() + "] " + randomPhrase, ...prev.slice(0, 5) ]);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const toggleMic = () => {
    setIsMicActive(!isMicActive);
    const msg = !isMicActive ? "MICRÓFONO ABIERTO (Hablando al establecimiento vía altavoz remoto)..." : "Micrófono en silencio.";
    setIntercomStatus(msg);
    setTranscriptLog(prev => [ "[" + new Date().toLocaleTimeString() + "] " + msg, ...prev ]);
  };

  const toggleVideo = () => {
    setIsVideoLive(!isVideoLive);
    const msg = !isVideoLive ? "Streaming de video en vivo reanudado." : "Streaming de video en pausa.";
    setTranscriptLog(prev => [ "[" + new Date().toLocaleTimeString() + "] " + msg, ...prev ]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 animate-pulse">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide">
                CANAL DE AUDIO BIDIRECCIONAL & STREAMING EN VIVO
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Establecimiento: {alert.store.storeName} ({alert.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900">
          
          {/* Left: Video & Audio Stream (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              {isVideoLive ? (
                <>
                  <img src={alert.images[alert.images.length - 1] || alert.images[0]} alt="Live Feed" className="w-full h-full object-cover filter contrast-125" />
                  <div className="absolute top-3 left-3 bg-red-600 text-white font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-pulse shadow">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    EN VIVO (WEB-RTC P2P)
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center justify-between">
                    <span>Latencia: 114ms | 1080p 30FPS</span>
                    <span className="text-white">Audio: Activo ({audioVolume}%)</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-xs font-mono flex flex-col items-center gap-2">
                  <VideoOff className="w-8 h-8 text-slate-600" />
                  <span>Transmisión de video detenida</span>
                </div>
              )}
            </div>

            {/* Audio Volume & Stream Controls */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-2 font-semibold">
                  <Volume2 className="w-4 h-4 text-blue-400" /> Control de Volumen del Local:
                </span>
                <span className="font-mono text-emerald-400">{audioVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={audioVolume}
                onChange={(e) => setAudioVolume(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Push-To-Talk & Live Transcripts (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Intercom PTT Button */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Intercomunicador PTT (Push-to-Talk)
                </div>
                <button
                  onClick={toggleMic}
                  className={`w-24 h-24 mx-auto rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer ${
                    isMicActive
                      ? "bg-red-600 text-white animate-pulse ring-8 ring-red-600/30 shadow-red-950"
                      : "bg-blue-600 hover:bg-blue-500 text-white ring-4 ring-blue-500/20 shadow-blue-950"
                  }`}
                >
                  {isMicActive ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                  <span className="text-[10px] font-bold mt-1 uppercase">{isMicActive ? "HABLANDO" : "MANTENER PTT"}</span>
                </button>
                <p className="text-[11px] text-slate-400">
                  {isMicActive ? "Tu voz se está transmitiendo por los altavoces del establecimiento." : "Haz clic o mantén presionado para hablar directamente con el local."}
                </p>
              </div>

              {/* Status & Log */}
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Estado del Enlace:
                </div>
                <div className="text-emerald-400 font-mono text-[11px] bg-slate-900 p-2 rounded-xl border border-slate-800">
                  {intercomStatus}
                </div>
              </div>

              {/* Transcript Log */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5 text-[11px] font-mono max-h-36 overflow-y-auto">
                <div className="text-slate-500 font-bold uppercase tracking-wider">Bitácora de Audio y Video:</div>
                {transcriptLog.map((log, i) => (
                  <div key={i} className="text-slate-300 truncate">{log}</div>
                ))}
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={toggleVideo}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isVideoLive ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
              >
                {isVideoLive ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                {isVideoLive ? "Pausar Video" : "Reanudar Video"}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cerrar Canal
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
