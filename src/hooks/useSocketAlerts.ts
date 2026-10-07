import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { PanicAlert, AlertStatus, AiVerdict } from "../types.js";
import { alarmSound } from "../utils/audio.js";

export function useSocketAlerts() {
  const [alerts, setAlerts] = useState<PanicAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(28);
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

    // Periodic latency measurement heartbeat
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const start = performance.now();
        socket.emit("ping:check", () => {
          const rtt = Math.round(performance.now() - start);
          setLatencyMs(rtt > 0 ? rtt : 18);
        });
      }
    }, 4000);

    // Initial alert list sync
    socket.on("alerts:sync", (syncedAlerts: PanicAlert[]) => {
      // Deduplicate alert list by ID
      const seen = new Set<string>();
      const deduped: PanicAlert[] = [];
      for (const a of syncedAlerts) {
        if (a && a.id && !seen.has(a.id)) {
          seen.add(a.id);
          deduped.push(a);
        }
      }
      setAlerts(deduped);
    });

    // Instant raw alert broadcast from any merchant (<1s)
    socket.on("alert:broadcast", (newAlert: PanicAlert) => {
      console.log("[Socket] 🚨 NUEVA ALERTA RECIBIDA:", newAlert.id);

      let isDuplicate = false;
      setAlerts((prev) => {
        // Anti-duplicate check: same alert ID, or same store / guard within 10s window and ACTIVE status
        const dupIndex = prev.findIndex((existing) => {
          if (existing.id === newAlert.id) return true;
          const sameStore = Boolean(existing.store?.storeId && newAlert.store?.storeId && existing.store.storeId === newAlert.store.storeId);
          const sameGuard = Boolean(
            existing.guardName &&
            newAlert.guardName &&
            existing.guardName.toLowerCase().trim() === newAlert.guardName.toLowerCase().trim()
          );
          const timeDiff = Math.abs(new Date(existing.timestamp).getTime() - new Date(newAlert.timestamp).getTime());
          return (sameStore || sameGuard) && timeDiff < 10000 && existing.status === "ACTIVE";
        });

        if (dupIndex !== -1) {
          isDuplicate = true;
          console.warn("[Central Socket] ⚠️ Señal duplicada descartada/consolidada en Central para:", newAlert.id);
          // Consolidate logs and images into the existing alert
          return prev.map((item, idx) => {
            if (idx === dupIndex) {
              return {
                ...item,
                images: item.images.length >= newAlert.images.length ? item.images : newAlert.images,
                guardDescription: item.guardDescription || newAlert.guardDescription,
                operatorNotes: Array.from(new Set([...(item.operatorNotes || []), ...(newAlert.operatorNotes || [])])),
              };
            }
            return item;
          });
        }

        return [newAlert, ...prev.filter((a) => a.id !== newAlert.id)];
      });

      const currentView = (window as any).__panicGuardView;
      // ONLY trigger Central desktop pop-up modal and emergency wail siren for Central monitoring operators
      const isCentralView = currentView === "CENTRAL" || (!currentView && typeof window !== "undefined" && !window.location.hash.includes("guard"));

      if (isCentralView && !isDuplicate) {
        setActiveEmergencyModalAlert((current) => {
          // If modal is currently displaying an active alert for the same store/guard within 10s, don't re-trigger
          if (current && current.status === "ACTIVE") {
            const sameStore = Boolean(current.store?.storeId && newAlert.store?.storeId && current.store.storeId === newAlert.store.storeId);
            const sameGuard = Boolean(
              current.guardName &&
              newAlert.guardName &&
              current.guardName.toLowerCase().trim() === newAlert.guardName.toLowerCase().trim()
            );
            const timeDiff = Math.abs(new Date(current.timestamp).getTime() - new Date(newAlert.timestamp).getTime());
            if ((sameStore || sameGuard) && timeDiff < 10000) {
              return current;
            }
          }
          // Trigger siren sound automatically for Central operators
          alarmSound.startEmergencySiren();
          setIsAudioAlarmActive(true);
          return newAlert;
        });
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
    socket.on("alert:ai_update", ({ alertId, aiVerdict, aiStatus, updatedLogs, aiError, status }: { alertId: string; aiVerdict?: AiVerdict; aiStatus: string; updatedLogs?: any[]; aiError?: string; status?: AlertStatus }) => {
      console.log("[Socket] 🧠 DICTAMEN RECIBIDO PARA:", alertId, aiVerdict, status);

      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id === alertId) {
            const nextStatus = status || a.status;
            return {
              ...a,
              status: nextStatus,
              aiVerdict: aiVerdict || a.aiVerdict,
              aiStatus: (aiStatus as any) || "completed",
              logs: updatedLogs || a.logs,
              aiError,
            };
          }
          return a;
        })
      );

      // If status is non-active, ensure all sound engines stay silenced
      if (status && status !== "ACTIVE") {
        alarmSound.silenceAll();
        setIsAudioAlarmActive(false);
      }

      setActiveEmergencyModalAlert((current) => {
        if (current && current.id === alertId) {
          return {
            ...current,
            status: status || current.status,
            aiVerdict: aiVerdict || current.aiVerdict,
            aiStatus: (aiStatus as any) || "completed",
            logs: updatedLogs || current.logs,
            aiError,
          };
        }
        return current;
      });
    });

    // Alert status changed by operator (Dispatched, Resolved, False Alarm)
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

      // If the alert is no longer ACTIVE (dispatched, resolved, false alarm), immediately silence all audio engines
      if (updatedAlert.status !== "ACTIVE") {
        alarmSound.silenceAll();
        setIsAudioAlarmActive(false);
      }
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
      clearInterval(pingInterval);
      socket.disconnect();
    };
  }, []);

  const acknowledgeAlarmSound = useCallback(() => {
    alarmSound.silenceAll();
    setIsAudioAlarmActive(false);
  }, []);

  const updateAlertStatus = useCallback(
    (alertId: string, status: AlertStatus, operatorName = "Operador de Central", notes?: string, unit?: string) => {
      // 1. Optimistic local update with zero latency
      setAlerts((prev) =>
        prev.map((a) => {
          if (a.id === alertId) {
            const nextLogs = [
              ...a.logs,
              {
                timestamp: new Date().toISOString(),
                action: `Estado actualizado a ${status}`,
                operator: operatorName,
                details: notes,
              },
            ];
            return {
              ...a,
              status,
              dispatchedUnit: unit || a.dispatchedUnit,
              operatorNotes: notes ? [...(a.operatorNotes || []), notes] : a.operatorNotes,
              logs: nextLogs,
            };
          }
          return a;
        })
      );

      // Immediately silence alarms if status is changing away from ACTIVE
      if (status !== "ACTIVE") {
        alarmSound.silenceAll();
        setIsAudioAlarmActive(false);
      }

      // 2. Realtime socket emission
      if (socketRef.current) {
        socketRef.current.emit("alert:update_status", {
          alertId,
          status,
          operator: operatorName,
          notes,
          unit,
        });
      }

      // 3. Redundant HTTP PATCH guarantee (ensures database/server memory is updated even if mobile WebSocket was suspended)
      fetch(`/api/alerts/${alertId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, operator: operatorName, notes, unit }),
      }).catch((err) => {
        console.warn("[REST Status Update Notice]:", err);
      });
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
    latencyMs,
    activeEmergencyModalAlert,
    setActiveEmergencyModalAlert,
    isAudioAlarmActive,
    acknowledgeAlarmSound,
    updateAlertStatus,
    deleteAlert,
  };
}
