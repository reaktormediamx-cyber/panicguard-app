import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldAlert,
  Shield,
  ShieldCheck,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  User,
  Maximize2,
  X,
  LogOut,
  BellRing,
  BellOff,
  CameraOff,
  Sliders,
  AlertOctagon,
  Zap,
  Loader2,
  RefreshCw,
  Radio,
  Bluetooth,
  UserCheck,
  BadgeCheck,
  Building,
  Store,
  Edit3,
} from "lucide-react";
import { PanicAlert, AlertStatus, GeoCoordinates, TriggerMode, StoreMetadata } from "../../types.js";
import { alarmSound } from "../../utils/audio.js";
import { useAuth } from "../../context/AuthContext.js";
import { TacticalMap } from "../dashboard/TacticalMap.js";
import { AudioSettingsModal } from "../audio/AudioSettingsModal.js";

// Function to extract store binding from window URL (search or hash)
const extractStoreParamsFromUrl = () => {
  if (typeof window === "undefined") return { sid: "", sname: "", role: "", centralId: "" };
  try {
    const url = new URL(window.location.href);
    let sid = url.searchParams.get("storeId") || url.searchParams.get("storeid") || url.searchParams.get("store_id") || url.searchParams.get("sid") || "";
    let sname = url.searchParams.get("storeName") || url.searchParams.get("storename") || url.searchParams.get("store_name") || url.searchParams.get("sname") || "";
    let role = url.searchParams.get("role") || "";
    let centralId = url.searchParams.get("centralId") || url.searchParams.get("centralid") || "";

    if (!sid && window.location.hash) {
      const hash = window.location.hash;
      let queryPart = "";
      if (hash.includes("?")) {
        queryPart = hash.split("?")[1] || "";
      } else {
        queryPart = hash.replace(/^#\/?guard\??/i, "");
      }
      if (queryPart) {
        const hashParams = new URLSearchParams(queryPart);
        if (!sid) sid = hashParams.get("storeId") || hashParams.get("storeid") || hashParams.get("store_id") || hashParams.get("sid") || "";
        if (!sname) sname = hashParams.get("storeName") || hashParams.get("storename") || hashParams.get("store_name") || hashParams.get("sname") || "";
        if (!role) role = hashParams.get("role") || "";
        if (!centralId) centralId = hashParams.get("centralId") || hashParams.get("centralid") || "";
      }
    }

    return {
      sid: sid.trim(),
      sname: sname ? decodeURIComponent(sname.trim()) : "",
      role: role.trim(),
      centralId: centralId.trim()
    };
  } catch {
    return { sid: "", sname: "", role: "", centralId: "" };
  }
};

interface GuardPortalProps {
  alerts: PanicAlert[];
  isConnected: boolean;
  updateAlertStatus: (alertId: string, status: AlertStatus, operatorName?: string, notes?: string, unit?: string) => void;
  onOpenStoreConfig?: () => void;
}

export const GuardPortal: React.FC<GuardPortalProps> = ({
  alerts,
  isConnected,
  updateAlertStatus,
}) => {
  const { appUser, terminals, logout } = useAuth();

  // Guard profile stored locally on the phone
  const [guardName, setGuardName] = useState<string>(() => {
    return localStorage.getItem("pg_guard_name") || appUser?.displayName || "Oficial de Seguridad";
  });
  const [isOnDuty, setIsOnDuty] = useState<boolean>(() => {
    return localStorage.getItem("pg_guard_duty") !== "false";
  });
  const [isAudioSettingsModalOpen, setIsAudioSettingsModalOpen] = useState(false);

  // Modal para que el guardia ingrese su nombre al escanear la terminal
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => {
    const savedName = localStorage.getItem("pg_guard_name");
    const { sid } = extractStoreParamsFromUrl();
    if (sid && !localStorage.getItem(`pg_guard_checked_in_${sid}`)) {
      return true;
    }
    return !savedName || savedName.trim() === "";
  });
  const [tempGuardInput, setTempGuardInput] = useState<string>(() => {
    const saved = localStorage.getItem("pg_guard_name");
    return (saved && saved.trim() !== "") ? saved : "Oficial en Turno";
  });

  // Guard SOS Panic Button & Bluetooth / External Clicker Trigger State
  const [isEmittingSos, setIsEmittingSos] = useState<boolean>(false);
  const [lastSentSosAlertId, setLastSentSosAlertId] = useState<string | null>(() => {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem("pg_guard_last_sos_id") : null;
  });
  const [bluetoothPressCount, setBluetoothPressCount] = useState<number>(0);
  const [lastBluetoothPressTime, setLastBluetoothPressTime] = useState<number>(0);
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("pg_guard_bluetooth_enabled");
    return saved !== "false"; // Default to true if not set
  });
  const [sosFeedbackMessage, setSosFeedbackMessage] = useState<string | null>(null);

  // Guard Real-time GPS Location - Read cached real coordinates from localStorage if available
  const [guardLocation, setGuardLocation] = useState<GeoCoordinates | null>(() => {
    try {
      const lat = localStorage.getItem("pg_guard_last_lat");
      const lng = localStorage.getItem("pg_guard_last_lng");
      if (lat && lng) {
        return { latitude: parseFloat(lat), longitude: parseFloat(lng), accuracy: 10 };
      }
    } catch {}
    return null;
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>(() => {
    try {
      if (localStorage.getItem("pg_guard_last_lat")) return "GPS Calibrado";
    } catch {}
    return "Iniciando GPS...";
  });
  const [showGuardMap, setShowGuardMap] = useState<boolean>(false);

  const fetchGuardLocation = () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: GeoCoordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 8,
          };
          setGuardLocation(coords);
          try {
            localStorage.setItem("pg_guard_last_lat", coords.latitude.toString());
            localStorage.setItem("pg_guard_last_lng", coords.longitude.toString());
          } catch {}
          setLocationStatus(`GPS Activo (±${Math.round(pos.coords.accuracy || 8)}m)`);
          setIsLocating(false);
        },
        (err) => {
          console.warn("Geolocation warning:", err);
          setIsLocating(false);
          // Try to recover from cached real location first
          const savedLat = localStorage.getItem("pg_guard_last_lat");
          const savedLng = localStorage.getItem("pg_guard_last_lng");
          if (savedLat && savedLng) {
            setGuardLocation({
              latitude: parseFloat(savedLat),
              longitude: parseFloat(savedLng),
              accuracy: 15,
            });
            setLocationStatus("GPS en Memoria (Reciente)");
          } else {
            setLocationStatus("GPS en espera de señal");
            setGuardLocation((curr) => curr || { latitude: 19.432608, longitude: -99.133209, accuracy: 25 });
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
      );
    } else {
      setLocationStatus("Geolocalización no disponible");
      setGuardLocation({ latitude: 19.432608, longitude: -99.133209, accuracy: 20 });
    }
  };

  useEffect(() => {
    fetchGuardLocation();
    let watchId: number | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coords: GeoCoordinates = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 8,
            };
            setGuardLocation(coords);
            try {
              localStorage.setItem("pg_guard_last_lat", coords.latitude.toString());
              localStorage.setItem("pg_guard_last_lng", coords.longitude.toString());
            } catch {}
            setLocationStatus(`GPS Activo (±${Math.round(pos.coords.accuracy || 8)}m)`);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      } catch {}
    }
    return () => {
      if (watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Store-specific binding locked to the scanned QR code
  const [assignedStoreId, setAssignedStoreId] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.sid) return fromUrl.sid;
    return localStorage.getItem("pg_guard_store_id") || "";
  });

  const [assignedStoreName, setAssignedStoreName] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.sname) return fromUrl.sname;
    return localStorage.getItem("pg_guard_store_name") || "";
  });

  const [guardRole, setGuardRole] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.role) {
      localStorage.setItem("pg_guard_role", fromUrl.role);
      return fromUrl.role;
    }
    return localStorage.getItem("pg_guard_role") || "GUARD";
  });

  const [guardCentralId, setGuardCentralId] = useState<string>(() => {
    const fromUrl = extractStoreParamsFromUrl();
    if (fromUrl.centralId) {
      localStorage.setItem("pg_guard_central_id", fromUrl.centralId);
      return fromUrl.centralId;
    }
    return localStorage.getItem("pg_guard_central_id") || "";
  });

  // State for alert viewing & actions
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number>(0);
  const [isZoomImageOpen, setIsZoomImageOpen] = useState<boolean>(false);
  const [quickNoteText, setQuickNoteText] = useState<string>("");
  const [isAudioTestActive, setIsAudioTestActive] = useState<boolean>(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [showTacticalMap, setShowTacticalMap] = useState<boolean>(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(() => {
    return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for PWA Install Prompt (Add to Home Screen / WebAPK)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  // Screen WakeLock ref
  const wakeLockRef = useRef<any>(null);

  // Background Audio Keep-Alive & WakeLock System
  // Keeps the mobile audio session alive so sirens and vibration fire even when the screen turns off/locks
  useEffect(() => {
    if (isOnDuty) {
      alarmSound.enableBackgroundGuardMode();
    } else {
      alarmSound.disableBackgroundGuardMode();
    }

    const requestWakeLock = async () => {
      if (isOnDuty && "wakeLock" in navigator) {
        try {
          if (!wakeLockRef.current || wakeLockRef.current.released) {
            wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          }
        } catch {}
      }
    };

    requestWakeLock();

    // Auto-restore WakeLock and background audio on screen turn-on / visibility change
    const handleReactivation = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        if (isOnDuty) {
          alarmSound.enableBackgroundGuardMode();
        }
      }
    };

    document.addEventListener("visibilitychange", handleReactivation);
    window.addEventListener("focus", handleReactivation);
    window.addEventListener("pageshow", handleReactivation);

    // Audio unlocking on user touch
    const handleUserInteraction = () => {
      if (isOnDuty) {
        alarmSound.enableBackgroundGuardMode();
      }
    };
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleReactivation);
      window.removeEventListener("focus", handleReactivation);
      window.removeEventListener("pageshow", handleReactivation);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {}
      }
    };
  }, [isOnDuty]);

  // Request Lockscreen Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasNotificationPermission(perm === "granted");
        if (perm === "granted") {
          alarmSound.enableBackgroundGuardMode();
        }
      } catch {}
    }
  };

  // Handle name saving and check-in
  const handleConfirmGuardName = (name: string) => {
    const cleanName = name.trim() || "Oficial de Seguridad";
    setGuardName(cleanName);
    localStorage.setItem("pg_guard_name", cleanName);
    if (assignedStoreId) {
      localStorage.setItem(`pg_guard_checked_in_${assignedStoreId}`, "true");
    }
    setIsNameModalOpen(false);

    // Notify Central via socket of guard checkin at this terminal
    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("guard:checkin", {
        guardName: cleanName,
        storeId: assignedStoreId,
        storeName: assignedStoreName || boundTerminalInfo?.storeName,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Read and react to URL query parameters for store binding from QR
  useEffect(() => {
    const syncFromUrl = () => {
      const { sid, sname, role, centralId } = extractStoreParamsFromUrl();
      if (sid) {
        setAssignedStoreId(sid);
        localStorage.setItem("pg_guard_store_id", sid);
        if (sname) {
          setAssignedStoreName(sname);
          localStorage.setItem("pg_guard_store_name", sname);
        }
        // If not checked in for this specific scanned terminal, prompt to put their name
        if (!localStorage.getItem(`pg_guard_checked_in_${sid}`)) {
          setIsNameModalOpen(true);
        }
      }
      if (role) {
        setGuardRole(role);
        localStorage.setItem("pg_guard_role", role);
      }
      if (centralId) {
        setGuardCentralId(centralId);
        localStorage.setItem("pg_guard_central_id", centralId);
      }
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);

    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  // Filter alerts: only show for assigned store if bound via QR, or all if general
  // (Always includes alerts triggered by this guard so they stay visible)
  const relevantAlerts = useMemo(() => {
    if (guardRole === "SUPERVISOR") {
      if (guardCentralId && guardCentralId !== "ALL") {
        // Supervisors receive all alerts from terminals registered to that specific central
        return alerts.filter(
          (a) =>
            a.centralId === guardCentralId ||
            a.store?.centralId === guardCentralId ||
            a.id === lastSentSosAlertId ||
            (a.guardName && a.guardName.toLowerCase() === guardName.toLowerCase())
        );
      }
      return alerts;
    }

    if (assignedStoreId && assignedStoreId.trim() !== "" && assignedStoreId !== "ALL") {
      return alerts.filter(
        (a) =>
          a.store?.storeId === assignedStoreId ||
          (assignedStoreName && a.store?.storeName?.toLowerCase() === assignedStoreName.toLowerCase()) ||
          a.id === lastSentSosAlertId ||
          (a.guardName && a.guardName.toLowerCase() === guardName.toLowerCase())
      );
    }
    return alerts;
  }, [alerts, assignedStoreId, assignedStoreName, lastSentSosAlertId, guardName, guardRole, guardCentralId]);

  // Specific check if the guard's own SOS alert is currently active
  const myActiveSosAlert = useMemo(() => {
    return (
      alerts.find(
        (a) =>
          a.status === "ACTIVE" &&
          (a.id === lastSentSosAlertId ||
            (a.guardName &&
              a.guardName.toLowerCase() === guardName.toLowerCase() &&
              (a.triggerType === "VOLUME_BUTTON" ||
                a.triggerType === "GUARD_PANIC" ||
                a.guardDescription?.includes("SOS GUARDIA") ||
                a.store?.category?.includes("SOS Guardia"))))
      ) || null
    );
  }, [alerts, lastSentSosAlertId, guardName]);

  // Set of alert IDs that have been responded to, silenced, or resolved on this guard device
  const [silencedAlertIds, setSilencedAlertIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem("pg_silenced_alerts");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Permanently silence alarm sound on this guard mobile device for a specific alert
  const silenceAlert = (alertId: string) => {
    alarmSound.stopGuardTacticalLoop();
    setSilencedAlertIds((prev) => {
      const next = new Set(prev);
      next.add(alertId);
      try {
        sessionStorage.setItem("pg_silenced_alerts", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const activeAlerts = useMemo(() => {
    return relevantAlerts.filter((a) => a.status === "ACTIVE");
  }, [relevantAlerts]);

  // Active alerts excluding this guard's own triggered SOS alert (so it does not duplicate as an emergency to respond to)
  const otherActiveAlerts = useMemo(() => {
    return activeAlerts.filter((a) => {
      if (myActiveSosAlert && a.id === myActiveSosAlert.id) return false;
      if (lastSentSosAlertId && a.id === lastSentSosAlertId) return false;
      if (
        a.guardName &&
        guardName &&
        a.guardName.trim().toLowerCase() === guardName.trim().toLowerCase() &&
        (a.triggerType === "VOLUME_BUTTON" ||
          a.triggerType === "GUARD_PANIC" ||
          a.triggerType === "TRIPLE_TAP" ||
          a.triggerType === "SHAKE_GESTURE" ||
          a.guardDescription?.includes("SOS GUARDIA") ||
          a.store?.category?.includes("SOS Guardia"))
      ) {
        return false;
      }
      return true;
    });
  }, [activeAlerts, myActiveSosAlert, lastSentSosAlertId, guardName]);

  // Once an alert is no longer ACTIVE (e.g. Central dispatched, resolved or marked as false alarm),
  // automatically add it to silencedAlertIds and kill the local siren so it never rings again
  useEffect(() => {
    const nonActiveAlerts = relevantAlerts.filter((a) => a.status !== "ACTIVE");
    if (nonActiveAlerts.length > 0) {
      setSilencedAlertIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        nonActiveAlerts.forEach((a) => {
          if (!next.has(a.id)) {
            next.add(a.id);
            changed = true;
          }
        });
        if (changed) {
          try {
            sessionStorage.setItem("pg_silenced_alerts", JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        }
        return prev;
      });
      alarmSound.stopGuardTacticalLoop();
    }
  }, [relevantAlerts]);

  // Alerts from OTHER stores/guards that are currently ACTIVE and have NOT yet been silenced or responded to by this guard
  const pendingAlarmAlerts = useMemo(() => {
    return otherActiveAlerts.filter((a) => !silencedAlertIds.has(a.id));
  }, [otherActiveAlerts, silencedAlertIds]);

  // Current emergency from another store/guard requiring attention (only ACTIVE alerts from others)
  const currentEmergency: PanicAlert | null = useMemo(() => {
    if (selectedAlertId) {
      const found = otherActiveAlerts.find((a) => a.id === selectedAlertId);
      if (found) return found;
    }
    return otherActiveAlerts[0] || null;
  }, [otherActiveAlerts, selectedAlertId]);

  // Resolve matching terminal from database to ensure calibrated tactical coordinates & address
  const matchedTerminal = useMemo(() => {
    if (!currentEmergency) return null;
    return terminals.find(
      (t) => t.storeId === currentEmergency.store?.storeId || t.id === currentEmergency.store?.storeId
    );
  }, [currentEmergency, terminals]);

  // Also resolve assigned terminal data for the standby banner
  const boundTerminalInfo = useMemo(() => {
    if (assignedStoreId) {
      const found = terminals.find(
        (t) => t.storeId === assignedStoreId || t.id === assignedStoreId
      );
      if (found) return found;
    }
    return terminals[0] || null;
  }, [assignedStoreId, terminals]);

  const isGuardEmergency = Boolean(
    currentEmergency?.guardName ||
    currentEmergency?.triggerType === "GUARD_PANIC" ||
    currentEmergency?.triggerType === "VOLUME_BUTTON" ||
    currentEmergency?.triggerType === "TRIPLE_TAP" ||
    currentEmergency?.triggerType === "SHAKE_GESTURE" ||
    currentEmergency?.store?.category?.includes("Guardia") ||
    currentEmergency?.store?.storeName?.includes("Oficial")
  );

  // Effective store with tactical metadata - strictly uses assigned or matched terminal data
  const effectiveStore = useMemo(() => {
    if (!currentEmergency) return null;
    const term = matchedTerminal || boundTerminalInfo;
    return {
      ...currentEmergency.store,
      ...(term ? {
        storeName: term.storeName || currentEmergency.store.storeName,
        address: term.address || currentEmergency.store.address,
        city: term.city || currentEmergency.store.city,
        phone: term.phone || currentEmergency.store.phone,
        ownerName: term.ownerName || currentEmergency.store.ownerName,
        category: term.category || currentEmergency.store.category,
        coordinates: (term.coordinates && term.coordinates.latitude !== 0)
          ? term.coordinates
          : currentEmergency.store.coordinates,
      } : {}),
    };
  }, [currentEmergency, matchedTerminal, boundTerminalInfo]);

  // Precise Google Maps destination URL matching the tactical map - always prioritizes exact coordinates
  const gpsDirectionsUrl = useMemo(() => {
    if (!effectiveStore) return "#";
    if (effectiveStore.coordinates && effectiveStore.coordinates.latitude !== 0) {
      return `https://www.google.com/maps/dir/?api=1&destination=${effectiveStore.coordinates.latitude},${effectiveStore.coordinates.longitude}`;
    }
    const cleanAddress = effectiveStore.address ? effectiveStore.address.replace(/^.*?—\s*/, "").trim() : "";
    const queryParts = [
      cleanAddress || "",
      effectiveStore.city ? effectiveStore.city.trim() : "",
      cleanAddress.toLowerCase().includes("méxico") || cleanAddress.toLowerCase().includes("mexico") ? "" : "México",
    ].filter(Boolean);

    const fullSearchQuery = queryParts.join(", ") || "Ciudad de México, México";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullSearchQuery)}`;
  }, [effectiveStore]);

  // Persist Profile
  useEffect(() => {
    localStorage.setItem("pg_guard_name", guardName);
    localStorage.setItem("pg_guard_duty", isOnDuty.toString());
    localStorage.setItem("pg_guard_store_id", assignedStoreId);
    localStorage.setItem("pg_guard_store_name", assignedStoreName);
  }, [guardName, isOnDuty, assignedStoreId, assignedStoreName]);

  // Auto-siren & vibration loop when active emergency matches this guard
  // Plays siren and vibrates phone continuously until guard responds (Voy en camino / En el sitio / Silenciar)
  // or Central operator dispatches/resolves/marks as false alarm.
  // CRITICAL: Once responded or silenced, it NEVER triggers again even upon socket reconnect or screen wake.
  useEffect(() => {
    if (isOnDuty && pendingAlarmAlerts.length > 0) {
      alarmSound.startGuardTacticalLoop();

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          try {
            new Notification("🚨 ¡EMERGENCIA EN CURSO!", {
              body: `${pendingAlarmAlerts[0].store.storeName} (${pendingAlarmAlerts[0].store.address})`,
              icon: "/pwa-icon.svg",
              tag: "panic-alert",
              renotify: true,
              requireInteraction: true,
              silent: true,
              vibrate: [500, 200, 500, 200, 800],
            } as any);
          } catch {}
        }
      }
    } else {
      // Dispatched, resolved or already acknowledged/silenced -> Stop alarm loop immediately and stay quiet
      alarmSound.stopGuardTacticalLoop();
    }

    return () => {
      alarmSound.stopGuardTacticalLoop();
    };
  }, [pendingAlarmAlerts.length, isOnDuty]);

  // Test sound & vibration
  const handleTestSiren = () => {
    setIsAudioTestActive(true);
    alarmSound.playGuardTacticalSiren();
    setTimeout(() => {
      setIsAudioTestActive(false);
    }, 2000);
  };

  // Guard Actions (1-Tap Response Protocol)
  const handleDispatchEnCamino = (alert: PanicAlert) => {
    silenceAlert(alert.id);
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
    updateAlertStatus(
      alert.id,
      "DISPATCHED",
      officerLabel,
      `Guardia ${officerLabel} va en camino hacia el local.`,
      `Guardia: ${officerLabel}`
    );

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `🏃 Guardia ${officerLabel} acudiendo al local.`,
        author: officerLabel,
      });
    }
  };

  const handleArrivedOnSite = (alert: PanicAlert) => {
    silenceAlert(alert.id);
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
    
    // Also transition status to DISPATCHED if still active so central and server reflect the action
    if (alert.status === "ACTIVE") {
      updateAlertStatus(
        alert.id,
        "DISPATCHED",
        officerLabel,
        `Guardia ${officerLabel} EN EL SITIO. Perímetro en verificación.`,
        `Guardia: ${officerLabel}`
      );
    }

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `📍 Guardia ${officerLabel} EN EL SITIO. Verificando perímetro.`,
        author: officerLabel,
      });
    }
  };

  const handlePerimeterSecured = (alert: PanicAlert) => {
    silenceAlert(alert.id);
    alarmSound.playSuccessTone();
    const officerLabel = guardName.trim() || "Guardia en Turno";
    updateAlertStatus(
      alert.id,
      "RESOLVED",
      officerLabel,
      `Perímetro asegurado y situación controlada por ${officerLabel}.`
    );

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: `🛡️ Situación controlada y asegurada por ${officerLabel}.`,
        author: officerLabel,
      });
    }
  };

  const handleSendQuickNote = (alert: PanicAlert, noteText?: string) => {
    const textToSend = noteText || quickNoteText;
    if (!textToSend.trim()) return;

    // Responding to the alert permanently silences the alarm on this phone
    silenceAlert(alert.id);

    const officerLabel = guardName.trim() || "Guardia en Turno";
    if (textToSend.toLowerCase().includes("falsa alarma")) {
      updateAlertStatus(
        alert.id,
        "FALSE_ALARM",
        officerLabel,
        `Reportado como Falsa Alarma por guardia en sitio: ${textToSend.trim()}`
      );
    }

    const socket = (window as any).__panicSocket;
    if (socket) {
      socket.emit("alert:add_note", {
        alertId: alert.id,
        note: textToSend.trim(),
        author: officerLabel,
      });
    }
    setQuickNoteText("");
  };

  // Trigger SOS Panic from Guard (via Tactile Red Button or Bluetooth / External Clicker)
  const triggerGuardSos = async (triggerType: TriggerMode = "MANUAL_BUTTON") => {
    if (isEmittingSos) return;
    setIsEmittingSos(true);
    setSosFeedbackMessage(
      triggerType === "VOLUME_BUTTON" || triggerType === "KEYBOARD_HOTKEY"
        ? "🚨 [BOTÓN BLUETOOTH / CLICKER] TRANSMITIENDO PÁNICO SOS A CENTRAL..."
        : "🚨 TRANSMITIENDO PÁNICO SOS A CENTRAL C4..."
    );

    // Haptic vibration feedback (strong pulse)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([250, 80, 250, 80, 500]);
    }

    // Play tactical siren tone locally
    try {
      alarmSound.playTone("POLICE_SIREN");
    } catch {}

    // Real-time GPS capture from guard device
    let guardCoords: GeoCoordinates | undefined = undefined;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        guardCoords = await new Promise<GeoCoordinates | undefined>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const coords: GeoCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy || 8,
              };
              try {
                localStorage.setItem("pg_guard_last_lat", coords.latitude.toString());
                localStorage.setItem("pg_guard_last_lng", coords.longitude.toString());
              } catch {}
              resolve(coords);
            },
            () => resolve(undefined),
            { timeout: 4500, enableHighAccuracy: true, maximumAge: 5000 }
          );
        });
      } catch {}
    }

    const savedLat = typeof localStorage !== "undefined" ? localStorage.getItem("pg_guard_last_lat") : null;
    const savedLng = typeof localStorage !== "undefined" ? localStorage.getItem("pg_guard_last_lng") : null;
    const savedCoords = savedLat && savedLng ? { latitude: parseFloat(savedLat), longitude: parseFloat(savedLng), accuracy: 10 } : undefined;

    const effectiveCoords: GeoCoordinates =
      guardCoords ||
      guardLocation ||
      savedCoords ||
      (boundTerminalInfo?.coordinates && boundTerminalInfo.coordinates.latitude !== 0 ? boundTerminalInfo.coordinates : { latitude: 19.432608, longitude: -99.133209 });

    const effectiveGuardName = guardName.trim() || "Oficial de Seguridad";
    const matchedTerm = boundTerminalInfo || (assignedStoreId ? terminals.find((t) => t.storeId === assignedStoreId) : null);

    let targetStore: StoreMetadata;
    if (matchedTerm) {
      targetStore = {
        storeId: matchedTerm.storeId,
        storeName: matchedTerm.storeName || "Establecimiento",
        ownerName: matchedTerm.ownerName || "Titular Registrado",
        phone: matchedTerm.phone || "Sin Teléfono",
        address: matchedTerm.address || "Dirección Registrada",
        city: matchedTerm.city || "Ciudad de México",
        category: matchedTerm.category || "Comercio General",
        coordinates: effectiveCoords || matchedTerm.coordinates,
        centralId: matchedTerm.centralId || appUser?.centralId || "CEN-CDMX-01",
        centralName: matchedTerm.centralName || appUser?.centralName || "C4 Centro de Comando Poniente - CDMX",
      };
    } else {
      const defaultCentral = terminals[0]?.centralName || appUser?.centralName || "C4 Centro de Comando Poniente - CDMX";
      const defaultCentralId = terminals[0]?.centralId || appUser?.centralId || "CEN-CDMX-01";
      targetStore = {
        storeId: "GUARD-" + (effectiveGuardName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "SOS"),
        storeName: `SOS Oficial en Patrullaje: ${effectiveGuardName}`,
        ownerName: effectiveGuardName,
        phone: "55-0000-0000",
        address: `GPS Oficial: ${effectiveCoords.latitude.toFixed(6)}, ${effectiveCoords.longitude.toFixed(6)} • Patrullaje Móvil`,
        city: terminals[0]?.city || "Ciudad de México",
        category: "Patrulla de Seguridad Táctica",
        coordinates: effectiveCoords,
        centralId: defaultCentralId,
        centralName: defaultCentral,
      };
    }

    const desc =
      triggerType === "VOLUME_BUTTON" || triggerType === "KEYBOARD_HOTKEY"
        ? `🚨 SOS GUARDIA (BOTÓN BLUETOOTH / CLICKER): Oficial ${effectiveGuardName} activó auxilio mediante pulsador externo Bluetooth.`
        : `🚨 SOS GUARDIA (BOTÓN TÁCTICO ROJO): Oficial ${effectiveGuardName} activó auxilio directo desde pantalla hacia Central C4.`;

    try {
      const payload = {
        store: targetStore,
        images: [],
        cameraEnabled: false,
        timestamp: new Date().toISOString(),
        triggerType,
        centralId: targetStore.centralId,
        centralName: targetStore.centralName,
        guardName: effectiveGuardName,
        guardDescription: desc,
      };

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Error en servidor: ${res.statusText}`);
      }

      const data = await res.json();
      setLastSentSosAlertId(data.alertId);
      try {
        sessionStorage.setItem("pg_guard_last_sos_id", data.alertId);
      } catch {}
      setSosFeedbackMessage(`🚨 ¡ALERTA SOS TRANSMITIDA! Central C4 alertada en tiempo real.`);
    } catch (err: any) {
      setSosFeedbackMessage(`Error al transmitir alerta: ${err.message || "Fallo de conexión"}`);
    } finally {
      setIsEmittingSos(false);
    }
  };

  const handleResolveMySos = (alertId: string) => {
    updateAlertStatus(alertId, "RESOLVED", guardName, "Oficial de seguridad reporta situación bajo control / Cierre de emergencia");
    setLastSentSosAlertId(null);
    try {
      sessionStorage.removeItem("pg_guard_last_sos_id");
    } catch {}
    setSosFeedbackMessage("✅ Alerta de pánico SOS marcada como resuelta.");
    setTimeout(() => setSosFeedbackMessage(null), 4000);
  };

  // Bluetooth Panic Button / Wireless Clicker & External Key Listener
  useEffect(() => {
    const handleBluetoothKeyEvent = (e: KeyboardEvent) => {
      if (!isBluetoothEnabled) return;

      // Common keys sent by Bluetooth panic clickers, smart rings, wireless fobs, and hardware buttons
      const isBluetoothClickerKey =
        e.key === "Enter" ||
        e.key === " " ||
        e.code === "Space" ||
        e.code === "Enter" ||
        e.key === "AudioVolumeUp" ||
        e.code === "AudioVolumeUp" ||
        e.key === "AudioVolumeDown" ||
        e.code === "AudioVolumeDown" ||
        e.keyCode === 24 ||
        e.keyCode === 25 ||
        (e as any).which === 24 ||
        (e as any).which === 25 ||
        e.key === "+" ||
        e.code === "NumpadAdd" ||
        e.key === "=";

      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if ((tagName === "input" || tagName === "textarea") && (e.key === " " || e.key === "Enter")) {
          // Allow normal typing inside input fields
          return;
        }
      }

      if (isBluetoothClickerKey) {
        const now = Date.now();
        setBluetoothPressCount((prev) => prev + 1);
        setLastBluetoothPressTime(now);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 150]);
        }

        // Trigger immediate SOS panic via Bluetooth button
        triggerGuardSos("VOLUME_BUTTON");
      }
    };

    window.addEventListener("keydown", handleBluetoothKeyEvent, { capture: true, passive: false });
    return () => {
      window.removeEventListener("keydown", handleBluetoothKeyEvent, { capture: true });
    };
  }, [guardName, assignedStoreId, assignedStoreName, boundTerminalInfo, terminals, appUser, isEmittingSos, guardLocation, isBluetoothEnabled]);

  // Lockscreen & Headset MediaSession SOS Trigger Handler
  useEffect(() => {
    alarmSound.setMediaSessionSosHandler(() => {
      triggerGuardSos("VOLUME_BUTTON");
    });
    return () => {
      alarmSound.setMediaSessionSosHandler(null);
    };
  }, [guardName, assignedStoreId, assignedStoreName, boundTerminalInfo, terminals, appUser, isEmittingSos, guardLocation]);

  const handleGuardExit = async () => {
    localStorage.removeItem("pg_guard_store_id");
    localStorage.removeItem("pg_guard_store_name");
    localStorage.removeItem("pg_guard_duty");
    if (typeof window !== "undefined") {
      window.location.hash = "";
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
    await logout();
    window.location.reload();
  };

  return (
    <div className="w-full max-w-lg mx-auto min-h-[100dvh] bg-[#121215] text-[#f4f4f5] flex flex-col justify-between selection:bg-[#dc2626] selection:text-white pb-6 sm:pb-8 font-sans">
      {/* ================= MOBILE TACTICAL TOP BAR ================= */}
      <header className="sticky top-0 z-30 bg-[#18181b]/95 backdrop-blur-md border-b border-[#27272a] px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Tactical Channel Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-[#dc2626] to-[#be123c] border border-[#881337] shadow-md shadow-[#4c0519]/60 flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-white stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-xs tracking-wider uppercase font-sans">
                  PANIC<span className="text-[#dc2626]">GUARD</span>
                </span>
                {guardRole === "SUPERVISOR" ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold animate-pulse">
                    SUPERVISOR
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#4c0519] text-[#fda4af] font-bold border border-[#9f1239]">
                    TÁCTICO
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] font-mono">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? "bg-[#34d399] animate-pulse" : "bg-[#ef4444]"}`} />
                <span className="truncate">{isConnected ? "Canal Activo en Vivo" : "Reconectando..."}</span>
              </div>
            </div>
          </div>

          {/* Quick duty toggle, Sound Settings & Exit button */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setIsAudioSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#fbbf24] hover:text-[#fcd34d] transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Ajustes de Tonos y Sonido de Alerta"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsOnDuty(!isOnDuty)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm ${
                isOnDuty
                  ? "bg-[#022c22] text-[#6ee7b7] border border-[#065f46] hover:bg-[#022c22]/80"
                  : "bg-[#18181b] text-[#a1a1aa] border border-[#27272a] hover:bg-[#27272a]"
              }`}
              title="Cambiar estado de guardia"
            >
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? "bg-[#34d399] animate-ping" : "bg-slate-500"}`} />
              <span>{isOnDuty ? "EN TURNO" : "PAUSA"}</span>
            </button>

            <button
              onClick={handleGuardExit}
              className="p-2 rounded-xl bg-[#18181b] hover:bg-[#4c0519] hover:text-[#fda4af] hover:border-[#9f1239] border border-[#27272a] text-[#a1a1aa] transition-all cursor-pointer active:scale-95"
              title="Cerrar sesión / Salir"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= COMPACT OFFICER & REAL-TIME GPS BAR ================= */}
      <section className="px-3.5 pt-3 pb-1 space-y-2">
        {/* Puesto Asignado por QR si existe */}
        {(assignedStoreId || boundTerminalInfo) && (
          <div className="bg-[#12141c] border border-emerald-500/40 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs shadow-md">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase font-bold text-emerald-400 block leading-tight">
                  Puesto de Guardia Vinculado
                </span>
                <span className="font-bold text-white truncate block text-[11px]">
                  {assignedStoreName || boundTerminalInfo?.storeName || `Terminal ${assignedStoreId}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTempGuardInput(guardName !== "Oficial de Seguridad" ? guardName : "");
                setIsNameModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-[10px] font-mono font-bold shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
            >
              <Edit3 className="w-3 h-3 text-emerald-400" />
              <span>Cambiar Guardia</span>
            </button>
          </div>
        )}

        <div className="bg-[#181920] border border-[#262833] rounded-2xl p-3 shadow-md space-y-2.5">
          {/* Officer Name Field (Integrated inline) */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={guardName}
                onChange={(e) => setGuardName(e.target.value)}
                placeholder="Nombre del Guardia en Turno"
                className="w-full bg-[#111215] border border-[#262833] focus:border-[#f43f5e] rounded-xl px-3 py-1.5 text-white text-xs font-semibold placeholder:text-slate-600 transition-all outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setTempGuardInput(guardName !== "Oficial de Seguridad" ? guardName : "");
                setIsNameModalOpen(true);
              }}
              className="text-[10px] font-mono text-[#f43f5e] bg-[#241015] hover:bg-[#38161d] px-2 py-1 rounded-lg border border-[#e11d48]/40 shrink-0 cursor-pointer"
            >
              Registro
            </button>
          </div>

          {/* Real-time GPS status line with live coordinates */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-[#111215] rounded-xl border border-[#262833] text-[11px] font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-[#10b981] shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="text-[#9ca3af] text-[10px] block leading-tight">
                  {locationStatus}
                </span>
                <span className="text-slate-200 font-bold">
                  {guardLocation
                    ? `${guardLocation.latitude.toFixed(6)}°, ${guardLocation.longitude.toFixed(6)}°`
                    : "19.432608°, -99.133209°"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={fetchGuardLocation}
                disabled={isLocating}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Actualizar coordenadas GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLocating ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowGuardMap(!showGuardMap)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 transition-all cursor-pointer"
                title={showGuardMap ? "Ocultar mapa" : "Ver mapa"}
              >
                {showGuardMap ? "Ocultar Mapa" : "Ver Mapa"}
              </button>
            </div>
          </div>

          {/* Collapsible Tactical Map of Guard's Location */}
          {showGuardMap && (
            <div className="rounded-xl overflow-hidden border border-slate-800 shadow-inner mt-1">
              <TacticalMap
                coordinates={guardLocation || { latitude: 19.4326, longitude: -99.1332 }}
                storeName={`Oficial: ${guardName || "Guardia en Turno"}`}
                address=""
                city="Ubicación GPS en Terreno"
                className="h-44 sm:h-52"
              />
            </div>
          )}
        </div>
      </section>

      {/* ================= MAIN TACTICAL CONTENT (ADAPTED FOR MOBILE) ================= */}
      <main className="flex-1 px-3.5 py-2 space-y-3">
        {/* ================= GUARD SOS PANIC CARD (TACTILE & 3X VOLUME) ================= */}
        {myActiveSosAlert ? (
          /* Active SOS Emergency Banner emitted by this Guard */
          <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-2 border-red-500 rounded-2xl p-4 shadow-2xl space-y-3 ring-2 ring-red-500/50 animate-pulse">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                <AlertOctagon className="w-5 h-5 animate-bounce text-red-400 shrink-0" />
                <span>🚨 TU PÁNICO SOS ESTÁ ACTIVO EN CENTRAL C4</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/90 text-white font-bold border border-red-400 shrink-0">
                EN CURSO
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Se transmitió tu identidad ({guardName}) y coordenadas GPS. Los operadores y mandos de la Central C4 están enterados de tu situación de auxilio.
            </p>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-red-900/50 text-[11px] font-mono text-slate-400">
              <span>Folio: {myActiveSosAlert.id}</span>
              <span>Hora: {new Date(myActiveSosAlert.timestamp).toLocaleTimeString()}</span>
            </div>
            <button
              onClick={() => handleResolveMySos(myActiveSosAlert.id)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>CANCELAR PÁNICO / REPORTAR TODO BAJO CONTROL</span>
            </button>
          </div>
        ) : (
          /* Tactile Red Button & Bluetooth SOS Panic Card */
          <div
            id="guard-sos-card"
            className="bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/40 border-2 border-red-600/40 hover:border-red-500/70 rounded-2xl p-3.5 shadow-xl space-y-3 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                    Botón de Pánico Táctico (Guardia)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Alerta inmediata con GPS a Central C4 y Terminales
                  </p>
                </div>
              </div>

              {/* Status Pill for Bluetooth & Manual Trigger */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-700/70 text-[10px] font-mono font-bold text-red-300 shrink-0">
                <Bluetooth className={`w-3.5 h-3.5 ${isBluetoothEnabled ? "text-red-400" : "text-slate-500"}`} />
                <span>Táctil {isBluetoothEnabled ? "/ Bluetooth" : ""}</span>
              </div>
            </div>

            {/* Quick Trigger Method Pills */}
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>1 Toque Botón Rojo</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const newState = !isBluetoothEnabled;
                  setIsBluetoothEnabled(newState);
                  localStorage.setItem("pg_guard_bluetooth_enabled", String(newState));
                }}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95 ${
                  isBluetoothEnabled
                    ? "bg-[#022c22] border-[#065f46] text-[#6ee7b7]"
                    : "bg-slate-800/80 border-slate-700 text-slate-400"
                }`}
                title={isBluetoothEnabled ? "Desactivar detección de botón Bluetooth" : "Activar detección de botón Bluetooth"}
              >
                <Bluetooth className={`w-3 h-3 ${isBluetoothEnabled ? "text-[#34d399] animate-pulse" : "text-slate-500"}`} />
                <span>Pulsador Bluetooth: <strong className={isBluetoothEnabled ? "text-white" : "text-slate-400"}>{isBluetoothEnabled ? "ACTIVO" : "APAGADO"}</strong></span>
              </button>
            </div>

            {/* Giant One-Tap SOS Panic Button */}
            <button
              type="button"
              onClick={() => triggerGuardSos("MANUAL_BUTTON")}
              disabled={isEmittingSos}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] active:scale-95 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl shadow-[#4c0519]/90 border-2 border-[#881337] cursor-pointer transition-all disabled:opacity-50"
            >
              {isEmittingSos ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>TRANSMITIENDO PÁNICO SOS A CENTRAL...</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-6 h-6 text-white animate-bounce shrink-0" />
                  <div className="text-left">
                    <div className="tracking-wider uppercase font-black text-sm sm:text-base">
                      🚨 EMITIR PÁNICO SOS A CENTRAL C4
                    </div>
                    <div className="text-[10px] text-[#fda4af] font-normal font-sans opacity-95">
                      Toca aquí • O presiona tu botón Bluetooth vinculado
                    </div>
                  </div>
                </>
              )}
            </button>

            {/* Subtext info */}
            <div className="pt-0.5 text-[10px] text-slate-400 font-mono space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-slate-400">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>GPS exacto: {guardLocation ? `${guardLocation.latitude.toFixed(5)}°, ${guardLocation.longitude.toFixed(5)}°` : "Calibrado"}</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  Central C4 & Red Táctica
                </span>
              </div>
              <p className="text-[9px] text-slate-500 leading-snug">
                💡 Activa tocando el botón rojo en pantalla o presionando un botón de pánico Bluetooth / pulsador inalámbrico vinculado.
              </p>
            </div>
          </div>
        )}

        {sosFeedbackMessage && !myActiveSosAlert && (
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center justify-between animate-in fade-in">
            <span>{sosFeedbackMessage}</span>
            <button
              onClick={() => setSosFeedbackMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {currentEmergency ? (
          /* ACTIVE EMERGENCY CARD */
          <div
            className={`rounded-2xl border overflow-hidden shadow-2xl transition-all ${
              currentEmergency.status === "ACTIVE"
                ? "bg-slate-900 border-red-500 ring-2 ring-red-500/40"
                : currentEmergency.status === "DISPATCHED"
                ? "bg-slate-900 border-amber-500/80"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {/* Emergency Alert Banner */}
            <div
              className={`p-3.5 text-white flex items-center justify-between gap-2 ${
                currentEmergency.status === "ACTIVE"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#be123c] animate-pulse"
                  : currentEmergency.status === "DISPATCHED"
                  ? "bg-gradient-to-r from-amber-600 to-amber-800"
                  : currentEmergency.status === "RESOLVED"
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-800"
                  : "bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-6 h-6 flex-shrink-0 animate-bounce" />
                <div>
                  <span className="font-black text-sm uppercase block tracking-wide">
                    {currentEmergency.status === "ACTIVE"
                      ? "🚨 ¡ALERTA DE PÁNICO ACTIVA!"
                      : currentEmergency.status === "DISPATCHED"
                      ? "🏃 ACUDIENDO AL LOCAL"
                      : "✅ INCIDENTE ASEGURADO"}
                  </span>
                  <span className="text-[10px] text-white/90 font-mono">
                    {new Date(currentEmergency.timestamp).toLocaleTimeString()} • {currentEmergency.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => silenceAlert(currentEmergency.id)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-white/20 hover:bg-white/30 text-white flex items-center gap-1 active:scale-95 transition-all cursor-pointer border border-white/30 shadow-sm"
                  title="Silenciar sonido y vibración en este celular"
                >
                  <BellOff className="w-3 h-3 text-amber-300" />
                  <span>Silenciar</span>
                </button>

                <span className="text-[10px] font-mono font-black bg-black/50 px-2.5 py-1 rounded-lg border border-white/20 uppercase">
                  {currentEmergency.status}
                </span>
              </div>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Store Information & Direct Action Buttons */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 shadow-inner">
                <div>
                  <span className="text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider">
                    {currentEmergency.guardName || currentEmergency.triggerType === "VOLUME_BUTTON" || currentEmergency.triggerType === "GUARD_PANIC"
                      ? "ORIGEN DEL AUXILIO / GUARDIA"
                      : "UBICACIÓN DEL INCIDENTE"}
                  </span>
                  <h3 className="text-xl font-black text-white leading-tight mt-0.5">
                    {effectiveStore?.storeName || currentEmergency.store.storeName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {effectiveStore?.category || currentEmergency.store.category} • ID: {effectiveStore?.storeId || currentEmergency.store.storeId}
                  </p>
                </div>

                {/* Address */}
                <div className="text-xs text-slate-300 flex items-start gap-1.5 pt-1.5 border-t border-slate-900">
                  <MapPin className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{effectiveStore?.address || currentEmergency.store.address}</span>
                </div>

                {/* Contact and GPS Buttons (Large Touch Targets for Mobile) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <a
                    href={`tel:${effectiveStore?.phone || currentEmergency.store.phone}`}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Llamar Local</span>
                  </a>

                  <a
                    href={gpsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#e11d48] to-[#be123c] hover:from-[#f43f5e] hover:to-[#e11d48] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-950/40 transition-all cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>Ruta GPS</span>
                  </a>
                </div>
              </div>

              {/* TACTICAL MAP EMBEDDED PREVIEW */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                <button
                  type="button"
                  onClick={() => setShowTacticalMap(!showTacticalMap)}
                  className="w-full p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-850 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-400" />
                    <span>Mapa Táctico de Ubicación</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">
                    {showTacticalMap ? "Ocultar ▲" : "Ver Mapa ▼"}
                  </span>
                </button>

                {showTacticalMap && (
                  <div className="h-[220px] w-full">
                    <TacticalMap
                      storeName={effectiveStore?.storeName || currentEmergency.store.storeName}
                      address={effectiveStore?.address || currentEmergency.store.address}
                      city={effectiveStore?.city || currentEmergency.store.city}
                      coordinates={effectiveStore?.coordinates || currentEmergency.store.coordinates}
                      className="h-full rounded-none border-0"
                    />
                  </div>
                )}
              </div>

              {/* EVIDENCE PHOTO VIEWER (Only if terminal had camera enabled) */}
              {currentEmergency.cameraEnabled !== false && Array.isArray(currentEmergency.images) && currentEmergency.images.length > 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                      📸 FOTOS DE EVIDENCIA ({selectedFrameIndex + 1}/{currentEmergency.images.length})
                    </span>
                    <button
                      onClick={() => setIsZoomImageOpen(true)}
                      className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Ampliar Zoom</span>
                    </button>
                  </div>

                  {/* Main Image Frame */}
                  <div className="relative aspect-video rounded-lg bg-black overflow-hidden border border-slate-800">
                    <img
                      src={currentEmergency.images[selectedFrameIndex] || currentEmergency.images[0]}
                      alt="Evidencia"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setIsZoomImageOpen(true)}
                    />

                    {/* Thumbnail selectors */}
                    <div className="absolute bottom-2 left-2 flex gap-1.5">
                      {currentEmergency.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedFrameIndex(idx)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all shadow ${
                            selectedFrameIndex === idx
                              ? "bg-red-600 text-white ring-1 ring-white"
                              : "bg-black/80 text-slate-300"
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Terminal en Modo Solo Botón (Sin cámara) */
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs">
                  <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <CameraOff className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 text-[11px] leading-tight">
                    <span className="text-slate-200 font-bold block">Terminal en Modo Solo Botón de Emergencia</span>
                    <span className="text-slate-400">Esta terminal no cuenta con cámara. Dirígete a la ubicación indicada en el mapa.</span>
                  </div>
                </div>
              )}

              {/* 3 GIANT ONE-TAP MOBILE ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                  ⚡ ACCIONES TÁCTICAS DEL GUARDIA:
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* 1. Voy en camino */}
                  <button
                    onClick={() => handleDispatchEnCamino(currentEmergency)}
                    className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-950/60 cursor-pointer transition-all"
                  >
                    <Navigation className="w-5 h-5 animate-pulse" />
                    <span>1. VOY EN CAMINO (Acudiendo)</span>
                  </button>

                  {/* 2. En el sitio */}
                  <button
                    onClick={() => handleArrivedOnSite(currentEmergency)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#4c0519]/60 cursor-pointer transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>2. EN EL SITIO (Verificando)</span>
                  </button>

                  {/* 3. Asegurado */}
                  <button
                    onClick={() => handlePerimeterSecured(currentEmergency)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#059669] to-[#065f46] hover:from-[#10b981] hover:to-[#059669] active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#022c22]/60 cursor-pointer transition-all"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    <span>3. PERÍMETRO ASEGURADO</span>
                  </button>
                </div>
              </div>

              {/* QUICK CHIPS FOR LOGS */}
              <div className="space-y-2 pt-1">
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block tracking-wider">
                  📝 REPORTE RÁPIDO A CENTRAL:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    "Perímetro despejado",
                    "Sujeto huyó",
                    "Policía en sitio",
                    "Cajero a salvo",
                    "Falsa alarma",
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuickNote(currentEmergency, chip)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 active:scale-95 border border-slate-800 text-[11px] text-slate-300 cursor-pointer shadow-sm"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : myActiveSosAlert ? (
          /* SOS ACTIVE TELEMETRY TRANSMISSION (NO DUPLICATE CARD) */
          <div className="bg-slate-900/90 border border-red-900/60 rounded-2xl p-5 text-center space-y-3 shadow-xl my-auto">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                📡 Enlace Táctico de Emergencia Transmitiendo
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Tus coordenadas GPS y reporte de auxilio están desplegados en la pantalla principal de la Central C4 y unidades de apoyo.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-red-900/50 text-[11px] text-red-300 font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Transmisión prioritaria en curso con C4</span>
            </div>
          </div>
        ) : (
          /* STANDBY STATE (NO ACTIVE EMERGENCY) */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-3.5 shadow-xl my-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                Perímetro Seguro
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Canal táctico en vivo con Central C4. Tu ubicación GPS está activa y lista para respuesta inmediata ante cualquier incidente.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Monitoreo táctico y sirena armados</span>
            </div>

            {!hasNotificationPermission && typeof window !== "undefined" && "Notification" in window && (
              <button
                onClick={requestNotificationPermission}
                className="w-full p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>🔔 Permitir Alertas con Pantalla Bloqueada</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* MODAL: REGISTRO DE IDENTIFICACIÓN DEL GUARDIA EN TURNO */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111215]/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#181920] border-2 border-[#262833] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsNameModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#181920] text-slate-400 hover:text-white hover:bg-[#22242e] border border-[#262833] cursor-pointer transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10b981]/20 to-emerald-900/30 border border-emerald-500/40 flex items-center justify-center text-[#10b981] shrink-0 shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Registro de Guardia en Turno
                </h3>
                <p className="text-xs text-[#9ca3af]">
                  Identificación oficial para Central C4 y Bitácora
                </p>
              </div>
            </div>

            <div className="bg-[#111215] border border-[#262833] rounded-2xl p-4 text-xs space-y-2 text-slate-300">
              <div className="flex justify-between items-center pb-2 border-b border-[#262833]">
                <span className="text-[#9ca3af]">Puesto / Terminal Vinculada:</span>
                <span className="font-bold text-[#10b981]">
                  {assignedStoreName || boundTerminalInfo?.storeName || (assignedStoreId ? `Terminal ${assignedStoreId}` : "Terminal de Seguridad")}
                </span>
              </div>
              {boundTerminalInfo?.address && (
                <div className="flex items-start gap-1.5 text-[11px] text-slate-300 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f43f5e] shrink-0 mt-0.5" />
                  <span>{boundTerminalInfo.address}</span>
                </div>
              )}
              <p className="text-[#9ca3af] text-[11px] leading-relaxed pt-1">
                Por protocolo de seguridad, tu nombre se registrará en cada auxilio, ruta GPS y reporte de pánico emitido a la Central C4.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmGuardName(tempGuardInput.trim() || "Oficial en Turno");
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Escribe tu Nombre y Apellido:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={tempGuardInput}
                    onChange={(e) => setTempGuardInput(e.target.value)}
                    placeholder="Ej. Oficial Carlos Mendoza"
                    className="w-full bg-[#121215] border border-[#27272a] focus:border-[#dc2626] focus:ring-2 focus:ring-[#dc2626]/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-[#71717a] focus:outline-none transition-all shadow-inner font-medium"
                  />
                  <BadgeCheck className="w-5 h-5 text-[#34d399] absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmGuardName("Oficial en Turno");
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Entrar Directo
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#dc2626] to-[#be123c] hover:from-[#ef4444] hover:to-[#dc2626] text-white text-xs font-bold tracking-wide shadow-lg shadow-[#4c0519]/60 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Confirmar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE MODAL (FOR MOBILE ZOOM) */}
      {isZoomImageOpen && currentEmergency && currentEmergency.cameraEnabled !== false && currentEmergency.images && currentEmergency.images.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3"
          onClick={() => setIsZoomImageOpen(false)}
        >
          <div className="relative w-full max-w-lg flex flex-col items-center">
            <button
              onClick={() => setIsZoomImageOpen(false)}
              className="absolute -top-12 right-0 p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentEmergency.images[selectedFrameIndex] || currentEmergency.images[0]}
              alt="Evidencia Zoom"
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
            <div className="mt-3 text-center text-xs font-mono text-slate-300">
              {currentEmergency.store.storeName} • Cuadro #{selectedFrameIndex + 1} de {currentEmergency.images.length}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERSONALIZACIÓN DE AUDIO Y TONOS */}
      <AudioSettingsModal
        isOpen={isAudioSettingsModalOpen}
        onClose={() => setIsAudioSettingsModalOpen(false)}
      />
    </div>
  );
};
