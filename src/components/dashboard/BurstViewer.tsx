import React, { useState } from "react";
import { Camera, ZoomIn, Play, Pause, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { FrameAnalysis } from "../../types.js";

interface BurstViewerProps {
  images: string[];
  evidenceTimeline?: FrameAnalysis[];
  className?: string;
}

export const BurstViewer: React.FC<BurstViewerProps> = ({
  images,
  evidenceTimeline,
  className = "",
}) => {
  const [selectedFrame, setSelectedFrame] = useState<number>(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // Auto-play interval for frame sequence
  React.useEffect(() => {
    let timer: number | null = null;
    if (isPlayingSequence && images.length > 0) {
      timer = window.setInterval(() => {
        setSelectedFrame((prev) => (prev + 1) % images.length);
      }, 450);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingSequence, images.length]);

  if (!images || images.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500">
        <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No se adjuntaron fotogramas en esta alerta.
      </div>
    );
  }

  const currentTimeline = evidenceTimeline?.find((t) => t.frameIndex === selectedFrame + 1);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main High-Res Viewer Frame */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl group">
        <img
          src={images[selectedFrame] || images[0]}
          alt={`Fotograma ${selectedFrame + 1}`}
          className={`w-full h-full object-contain transition-transform duration-200 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Top Overlay Badge */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-xl border border-slate-700/60 text-xs font-mono text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>FOTOGRAMA {selectedFrame + 1} DE {images.length}</span>
          <span className="text-slate-400">+{selectedFrame * 200}ms</span>
        </div>

        {/* Zoom & Play Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setIsPlayingSequence(!isPlayingSequence)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title={isPlayingSequence ? "Pausar Reproducción" : "Reproducir Ráfaga en Bucle"}
          >
            {isPlayingSequence ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            title="Alternar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Arrow Navigation */}
        <button
          onClick={() => setSelectedFrame((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700 text-white opacity-80 hover:opacity-100 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSelectedFrame((prev) => (prev + 1) % images.length)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700 text-white opacity-80 hover:opacity-100 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Frame Selector Thumbnails Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedFrame(idx);
              setIsPlayingSequence(false);
            }}
            className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
              selectedFrame === idx
                ? "border-red-500 ring-2 ring-red-500/30 scale-[1.02]"
                : "border-slate-800 opacity-60 hover:opacity-100"
            }`}
          >
            <img src={img} alt={`Frame ${idx + 1}`} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 bg-slate-950/85 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">
              #{idx + 1} (+{idx * 200}ms)
            </div>
          </button>
        ))}
      </div>

      {/* Frame AI Forensic Description */}
      {currentTimeline && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Observación en Cuadro #{currentTimeline.frameIndex}:
            </span>
          </div>
          <p className="text-slate-300">{currentTimeline.description}</p>
          {currentTimeline.detectedObjects && currentTimeline.detectedObjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {currentTimeline.detectedObjects.map((obj, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-mono"
                >
                  {obj}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
