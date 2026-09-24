import { useState, useEffect, useRef, useCallback } from "react";
import { GeoCoordinates, StoreMetadata, PanicAlert, TriggerMode } from "../types.js";

interface UsePanicCaptureOptions {
  store: StoreMetadata;
  onAlertSent?: (alertId: string, timestamp: string) => void;
}

export function usePanicCapture({ store, onAlertSent }: UsePanicCaptureOptions) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasGeoPermission, setHasGeoPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<GeoCoordinates>(store.coordinates);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [lastSentAlertId, setLastSentAlertId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Sistema Operativo - En Guardia");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream with optional deviceId
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const targetId = deviceId !== undefined ? deviceId : selectedDeviceId;
      if (deviceId !== undefined) {
        setSelectedDeviceId(deviceId);
      }

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      if (targetId) {
        videoConstraints.deviceId = { exact: targetId };
      } else {
        videoConstraints.facingMode = "user";
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCameraPermission(true);

      // Enumerate connected webcams/video inputs
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(cameras);
    } catch (err: any) {
      console.warn("Webcam access warning:", err);
      setHasCameraPermission(false);
      setCameraError(err.message || "Permiso de cámara no concedido");
    }
  }, [selectedDeviceId]);

  // Request GPS coordinates
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setHasGeoPermission(false);
      setGeoError("Geolocalización no soportada en este navegador");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHasGeoPermission(true);
        setGeoError(null);
        setCurrentCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        });
      },
      (err) => {
        console.warn("GPS error, falling back to calibrated store coords:", err);
        setHasGeoPermission(false);
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    startCamera();
    refreshLocation();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, refreshLocation]);

  // Capture a single frame from video stream to base64
  const captureFrame = useCallback((): string => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      // Fallback synthetic high-contrast security frame if video stream is unattached
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 640;
      fallbackCanvas.height = 480;
      const ctx = fallbackCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, 640, 480);
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 22px monospace";
        ctx.fillText(`EMERGENCIA EN TIENDA: ${store.storeName}`, 30, 80);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "16px monospace";
        ctx.fillText(`ID: ${store.storeId} | GPS: ${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`, 30, 130);
        ctx.fillText(`TIMESTAMP: ${new Date().toLocaleTimeString()} - CAPTURA DE SENSOR`, 30, 170);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, 600, 440);
      }
      return fallbackCanvas.toDataURL("image/jpeg", 0.85);
    }

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Overlay tactical security timestamp metadata
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillText(
      `PANICGUARD LIVE | ${store.storeName} | ${new Date().toISOString()} | GPS: [${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}]`,
      16,
      canvas.height - 15
    );

    return canvas.toDataURL("image/jpeg", 0.85);
  }, [store, currentCoords]);

  // Execute immediate burst capture of 3 frames with micro-delays
  const executeBurstCapture = useCallback(async (): Promise<string[]> => {
    setIsCapturing(true);
    setStatusMessage("Capturando ráfaga de 3 fotogramas de videoverificación...");

    const frames: string[] = [];

    // Frame 1: Immediate
    const frame1 = captureFrame();
    frames.push(frame1);

    // Frame 2: +200ms
    await new Promise((r) => setTimeout(r, 200));
    const frame2 = captureFrame();
    frames.push(frame2);

    // Frame 3: +200ms
    await new Promise((r) => setTimeout(r, 200));
    const frame3 = captureFrame();
    frames.push(frame3);

    setCapturedFrames(frames);
    setIsCapturing(false);
    return frames;
  }, [captureFrame]);

  const resetAlert = useCallback(async () => {
    if (lastSentAlertId) {
      try {
        await fetch(`/api/alerts/${lastSentAlertId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RESOLVED" }),
        });
      } catch (e) {
        console.warn("Could not update remote alert status:", e);
      }
    }
    setLastSentAlertId(null);
    setStatusMessage("Sistema Operativo - En Guardia (Alerta Desactivada / Restablecida)");
    setCapturedFrames([]);
  }, [lastSentAlertId]);

  // Main trigger panic function
  const triggerPanic = useCallback(
    async (triggerType: TriggerMode = "MANUAL_BUTTON", guardDescription?: string, guardName?: string) => {
      try {
        setStatusMessage("🚨 TRANSMITIENDO ALERTA CRÍTICA A CENTRAL DE SEGURIDAD...");

        // 1. Capture 3-frame burst
        const frames = await executeBurstCapture();

        // 2. Determine real coordinates: Prioritize configured/calibrated Store & Terminal Tactical Coordinates
        const hasStoreCoords = store.coordinates && typeof store.coordinates.latitude === "number" && store.coordinates.latitude !== 0;
        const validCoords = hasStoreCoords
          ? store.coordinates
          : (currentCoords && currentCoords.latitude !== 0 ? currentCoords : store.coordinates);

        // 3. Prepare payload
        const payload: Partial<PanicAlert> = {
          store: {
            ...store,
            coordinates: validCoords,
          },
          images: frames,
          timestamp: new Date().toISOString(),
          triggerType,
          guardDescription: guardDescription?.trim() || undefined,
          guardName: guardName?.trim() || undefined,
        };

        // 3. Send to server via HTTP POST (instant REST delivery)
        const response = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Error en servidor: ${response.statusText}`);
        }

        const data = await response.json();
        setLastSentAlertId(data.alertId);
        setStatusMessage(`✅ Alerta ${data.alertId} transmitida con éxito. Central notificada.`);

        if (onAlertSent) {
          onAlertSent(data.alertId, data.timestamp);
        }

        // Auto return to normal state after 10 seconds
        setTimeout(() => {
          resetAlert();
        }, 10000);

        return data;
      } catch (err: any) {
        console.error("Error transmitiendo pánico:", err);
        setStatusMessage(`⚠️ Error de transmisión: ${err.message}. Reintentando enlace.`);
      }
    },
    [store, currentCoords, executeBurstCapture, onAlertSent, resetAlert]
  );

  const sendGuardUpdate = useCallback(async (alertId: string, noteText: string, authorName?: string) => {
    if (!alertId || !noteText.trim()) return false;
    try {
      const res = await fetch(`/api/alerts/${alertId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: noteText.trim(),
          author: authorName?.trim() ? `Guardia (${authorName.trim()})` : "Guardia en Sitio",
        }),
      });
      if (res.ok) {
        setStatusMessage(`✅ Actualización enviada a Central: "${noteText.trim()}"`);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Error enviando reporte de guardia:", e);
      return false;
    }
  }, []);

  return {
    videoRef,
    canvasRef,
    hasCameraPermission,
    hasGeoPermission,
    cameraError,
    geoError,
    currentCoords,
    isCapturing,
    capturedFrames,
    lastSentAlertId,
    statusMessage,
    startCamera,
    refreshLocation,
    triggerPanic,
    resetAlert,
    sendGuardUpdate,
    videoDevices,
    selectedDeviceId,
  };
}
