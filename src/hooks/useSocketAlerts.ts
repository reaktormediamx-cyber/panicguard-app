import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { PanicAlert, AlertStatus, AiVerdict } from "../types.js";
import { alarmSound } from "../utils/audio.js";

export function useSocketAlerts() {
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeEmergencyModalAlert, setActiveEmergencyModalAlert] = useState<PanicAlert | null>(null);
  const [isAudioAlarmActive, setIsAudioAlarmActive] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;
    (window as any).__panicSocket = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] Conectado a PanicGuard Realtime Server");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] Desconectado de PanicGuard Server");
    });

    // Initial alert list sync
    socket.on("alerts:sync", (syncedAlerts: PanicAlert[]) => {
      setAlerts(syncedAlerts);
    });

    // Instant raw alert broadcast from any merchant (<1s)
    socket.on("alert:broadcast", (newAlert: PanicAlert) => {
      console.log("[Socket] 🚨 NUEVA ALERTA RECIBIDA:", newAlert.id);

      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);

      const isMasterAdminView = (window as any).__panicGuardView === "MASTER_ADMIN";

      if (!isMasterAdminView) {
        setActiveEmergencyModalAlert(newAlert);
        // Trigger siren sound automatically for Central operators
        alarmSound.startEmergencySiren();
        setIsAudioAlarmActive(true);
      }
    });

    // AI Status update
    socket.on("alert:ai_status", ({ alertId, aiStatus }: { alertId: string; aiStatus: 'analyzing' | 'completed' | 'failed' }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, aiStatus } : a))
      );
      setActiveEmergencyModalAlert((current) => {
        if (current && current.id === alertId) {
          return { ...current, aiStatus };
        }
        return current;
      });
    });

    // Dynamic Analysis Verdict update
    socket.on("alert:ai_update", ({ alertId, aiVerdict, aiStatus, updatedLogs, aiError }: { alertId: string; aiVerdict?: AiVerdict; aiStatus: string; updatedLogs?: any[]; aiError?: string }) => {
      console.log("[Socket] 🧠 DICTAMEN RECIBIDO PARA:", alertId, aiVerdict);

      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id === alertId) {
            return {
              ...a,
              aiVerdict: aiVerdict || a.aiVerdict,
              aiStatus: (aiStatus as any) || "completed",
              logs: updatedLogs || a.logs,
              aiError,
            };
          }
          return a;
        })
      );

      setActiveEmergencyModalAlert((current) => {
        if (current && current.id === alertId) {
          return {
            ...current,
            aiVerdict: aiVerdict || current.aiVerdict,
            aiStatus: (aiStatus as any) || "completed",
            logs: updatedLogs || current.logs,
            aiError,
          };
        }
        return current;
      });
    });

    // Alert status changed by operator
    socket.on("alert:status_changed", (updatedAlert: PanicAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );
      setActiveEmergencyModalAlert((current) => {
        if (current && current.id === updatedAlert.id) {
          return updatedAlert;
        }
        return current;
      });
    });

    // Fetch initial list via REST as backup
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      })
      .catch(() => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  const acknowledgeAlarmSound = useCallback(() => {
    alarmSound.stopAlarm();
    setIsAudioAlarmActive(false);
  }, []);

  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertStatus, operatorName = "Operador de Central", notes?: string, unit?: string) => {
      if (socketRef.current) {
        socketRef.current.emit("alert:update_status", {
          alertId,
          status,
          operator: operatorName,
          notes,
          unit,
        });
      }
    },
    []
  );

  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setActiveEmergencyModalAlert((current) => (current?.id === alertId ? null : current));
    } catch (e) {
      console.warn("Error deleting alert:", e);
    }
  }, []);

  return {
    alerts,
    isConnected,
    activeEmergencyModalAlert,
    setActiveEmergencyModalAlert,
    isAudioAlarmActive,
    acknowledgeAlarmSound,
    updateAlertStatus,
    deleteAlert,
  };
}
