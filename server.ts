import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { PanicAlert, AlertStatus, StoreMetadata, DEFAULT_STORE, SystemSettings, DEFAULT_SYSTEM_SETTINGS, AlertLogItem } from "./src/types.js";
import { analyzePanicBurst } from "./server/geminiService.js";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

// System-wide settings state (controllable only by Super Admin)
let currentSystemSettings: SystemSettings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  aiEnabled: false,
  lastModifiedBy: "Super Admin (Matriz)",
  updatedAt: new Date().toISOString(),
};

// Configure body parser with high limit for base64 image bursts
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 5e7, // 50MB
});

// In-memory alert store with sample seeded alerts
const alertStore: Map<string, PanicAlert> = new Map();

// Helper to create sample initial alert
function createInitialSampleAlert(): PanicAlert {
  return {
    id: "ALT-2026-9041",
    store: {
      storeId: "STR-MEX-4109",
      storeName: "Farmacia & Minisúper 24 Horas",
      ownerName: "Mónica Armenta",
      phone: "+52 55 7789 2210",
      address: "Calzada de Tlalpan 3410, Coyoacán",
      city: "Ciudad de México, CDMX",
      category: "Farmacia / Convivencia 24h",
      coordinates: {
        latitude: 19.3325,
        longitude: -99.1412,
        accuracy: 8,
      },
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    images: [
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%231e293b'/%3E%3Ctext x='50%25' y='45%25' fill='%2394a3b8' font-size='24' font-family='sans-serif' text-anchor='middle'%3EFotograma 1: Sujeto ingresando%3C/text%3E%3Ctext x='50%25' y='55%25' fill='%23ef4444' font-size='18' font-family='sans-serif' text-anchor='middle'%3ESensor de Cámara Frontal Tienda%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%231e293b'/%3E%3Ctext x='50%25' y='45%25' fill='%2394a3b8' font-size='24' font-family='sans-serif' text-anchor='middle'%3EFotograma 2: Movimiento en mostrador%3C/text%3E%3Ctext x='50%25' y='55%25' fill='%23ef4444' font-size='18' font-family='sans-serif' text-anchor='middle'%3ERáfaga +250ms%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%231e293b'/%3E%3Ctext x='50%25' y='45%25' fill='%2394a3b8' font-size='24' font-family='sans-serif' text-anchor='middle'%3EFotograma 3: Botón de pánico presionado%3C/text%3E%3Ctext x='50%25' y='55%25' fill='%23ef4444' font-size='18' font-family='sans-serif' text-anchor='middle'%3ERáfaga +500ms%3C/text%3E%3C/svg%3E",
    ],
    triggerType: "MANUAL_BUTTON",
    status: "DISPATCHED",
    aiStatus: "completed",
    aiVerdict: {
      threatLevel: "HIGH",
      confidenceScore: 94,
      summary: "Sujeto con sudadera con capucha y manos en bolsillos frente a la caja registradora en actitud intimidante. Protocolo de contingencia activado.",
      threatDetails: {
        weaponsDetected: false,
        weaponTypes: [],
        intrudersCount: 1,
        physicalAggression: false,
        fireOrSmoke: false,
        distressSigns: true,
        facialCoverings: true,
      },
      recommendedProtocol: [
        "Despacho urgente de cuadrante policial Coyoacán",
        "Aviso a unidad médica de proximidad",
        "Grabación continua de cámaras en nube",
      ],
      evidenceTimeline: [
        { frameIndex: 1, description: "Ingreso apresurado de individuo encapuchado.", detectedObjects: ["Sujeto", "Capucha", "Puerta principal"] },
        { frameIndex: 2, description: "Aproximación directa a la zona restringida de cobro.", detectedObjects: ["Mostrador", "Postura amenazante"] },
        { frameIndex: 3, description: "Activación del sensor táctil por el cajero.", detectedObjects: ["Pánico confirmado"] },
      ],
      analyzedAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
      modelUsed: "Motor de Inteligencia Automático (Multimodal)",
    },
    dispatchedUnit: "Patrulla MX-Sector San Ángel #402",
    logs: [
      { timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), action: "Alerta de Pánico Recibida (Webcam burst x3)" },
      { timestamp: new Date(Date.now() - 1000 * 60 * 11).toISOString(), action: "Análisis Automatizado: Nivel de Riesgo ALTO (94% certeza)" },
      { timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(), action: "Unidad #402 asignada por operador Central 04", operator: "Operador J. Torres" },
    ],
  };
}

// Seed store - Disabled to allow clean registering from scratch
// const initialSample = createInitialSampleAlert();
// alertStore.set(initialSample.id, initialSample);

// --- ASYNCHRONOUS PIPELINE HELPER ---
async function processPanicAlert(alert: PanicAlert) {
  // Step A: Store in memory and broadcast raw alert immediately (<1s latency)
  alertStore.set(alert.id, alert);
  console.log(`[ALERT BROADCAST] Emitting raw alert ${alert.id} to monitoring dashboards...`);
  io.emit("alert:broadcast", alert);

  // Check if AI analysis is globally enabled by the Super Administrator
  if (!currentSystemSettings.aiEnabled) {
    console.log(`[AI TOGGLE OFF] AI Gemini analysis is DISABLED by Super Admin. Skipping analysis for ${alert.id}.`);
    alert.aiStatus = "disabled";
    alertStore.set(alert.id, alert);
    io.emit("alert:ai_update", {
      alertId: alert.id,
      aiStatus: "disabled",
      updatedLogs: alert.logs,
    });
    return;
  }

  // Step B: Trigger background multimodal AI analysis with Gemini
  (async () => {
    try {
      console.log(`[GEMINI BG] Starting multimodal burst analysis for ${alert.id}...`);
      alert.aiStatus = "analyzing";
      io.emit("alert:ai_status", { alertId: alert.id, aiStatus: "analyzing" });

      const verdict = await analyzePanicBurst(alert.images, {
        storeName: alert.store.storeName,
        address: alert.store.address,
        ownerName: alert.store.ownerName,
        category: alert.store.category,
      });

      alert.aiVerdict = verdict;
      alert.aiStatus = "completed";
      alert.logs.push({
        timestamp: new Date().toISOString(),
        action: `Análisis Automatizado: Nivel ${verdict.threatLevel} (${verdict.confidenceScore}% certeza)`,
        details: verdict.summary,
      });

      alertStore.set(alert.id, alert);
      console.log(`[GEMINI DONE] Finished analysis for ${alert.id}. Threat Level: ${verdict.threatLevel}`);

      // Step C: Dispatch AI update to all connected Monitoring Dashboards
      io.emit("alert:ai_update", {
        alertId: alert.id,
        aiVerdict: verdict,
        aiStatus: "completed",
        updatedLogs: alert.logs,
      });
    } catch (err: any) {
      console.error(`[GEMINI FAILED] Error analyzing ${alert.id}:`, err);
      alert.aiStatus = "failed";
      alert.aiError = err?.message || "Error al procesar el análisis de inteligencia";
      alertStore.set(alert.id, alert);
      io.emit("alert:ai_update", {
        alertId: alert.id,
        aiStatus: "failed",
        aiError: alert.aiError,
      });
    }
  })();
}

// --- SOCKET.IO EVENT HANDLERS ---
io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Ping heartbeat for real-time latency measurement
  socket.on("ping:check", (callback) => {
    if (typeof callback === "function") {
      callback();
    }
  });

  // Relay live camera frames from terminal to central
  socket.on("terminal:frame", (payload: { terminalId: string; storeId?: string; frameData: string }) => {
    socket.broadcast.emit("terminal:frame:update", payload);
  });

  // Central requests terminal to start streaming on-demand
  socket.on("terminal:request_stream", (payload: { terminalId?: string; storeId?: string }) => {
    socket.broadcast.emit("terminal:start_stream", payload);
  });

  // Send current alerts upon client connection
  socket.emit("alerts:sync", Array.from(alertStore.values()).reverse());

  // Handle panic alert sent via Socket
  socket.on("alert:panic", async (data: Partial<PanicAlert>, callback) => {
    try {
      const alertId = `ALT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const assignedStore = data.store || DEFAULT_STORE;
      const guardDesc = data.guardDescription?.trim() || "";
      const guardOfficer = data.guardName?.trim() || "";
      const initialLogs: AlertLogItem[] = [
        {
          timestamp: new Date().toISOString(),
          action: `Alerta recibida en Central [${data.centralName || assignedStore.centralName || "C4 Poniente"}] (${data.images?.length || 0} fotogramas)`,
        },
      ];
      if (guardOfficer) {
        initialLogs.push({
          timestamp: new Date().toISOString(),
          action: `Guardia en Turno registrado en Terminal: ${guardOfficer}`,
          operator: guardOfficer,
          details: `Oficial de seguridad en turno: ${guardOfficer}`,
        });
      }
      if (guardDesc) {
        initialLogs.push({
          timestamp: new Date().toISOString(),
          action: `Reporte de Guardia en Sitio (${guardOfficer || "Oficial"}): ${guardDesc}`,
          operator: guardOfficer || "Guardia en Sitio",
          details: guardDesc,
        });
      }

      const newAlert: PanicAlert = {
        id: alertId,
        store: assignedStore,
        centralId: data.centralId || assignedStore.centralId || "CEN-CDMX-01",
        centralName: data.centralName || assignedStore.centralName || "C4 Centro de Comando Poniente - CDMX",
        timestamp: data.timestamp || new Date().toISOString(),
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : [],
        triggerType: data.triggerType || "MANUAL_BUTTON",
        status: "ACTIVE",
        aiStatus: "pending",
        aiVerdict: null,
        guardDescription: guardDesc || undefined,
        guardName: guardOfficer || undefined,
        operatorNotes: guardDesc ? [`[${guardOfficer || "Guardia en Sitio"}]: ${guardDesc}`] : [],
        logs: initialLogs,
      };

      await processPanicAlert(newAlert);

      if (typeof callback === "function") {
        callback({ success: true, alertId: newAlert.id, timestamp: newAlert.timestamp });
      }
    } catch (err: any) {
      console.error("[Socket Panic Error]:", err);
      if (typeof callback === "function") {
        callback({ success: false, error: err.message });
      }
    }
  });

  // Real-time live log note from terminal guard or central operator
  socket.on("alert:add_note", (payload: { alertId: string; note: string; author?: string }) => {
    const alert = alertStore.get(payload.alertId);
    if (!alert || !payload.note?.trim()) return;

    const trimmed = payload.note.trim();
    const author = payload.author || "Guardia en Sitio";
    alert.operatorNotes = alert.operatorNotes || [];
    alert.operatorNotes.push(`[${author}]: ${trimmed}`);

    if (author.toLowerCase().includes("guardia")) {
      alert.guardDescription = alert.guardDescription ? `${alert.guardDescription} | ${trimmed}` : trimmed;
    }

    alert.logs.push({
      timestamp: new Date().toISOString(),
      action: `Bitácora actualizada (${author}): ${trimmed}`,
      operator: author,
      details: trimmed,
    });

    alertStore.set(alert.id, alert);
    io.emit("alert:status_changed", alert);
  });

  // Operator status update (Dispatch, Resolve, False Alarm)
  socket.on("alert:update_status", (payload: { alertId: string; status: AlertStatus; operator?: string; notes?: string; unit?: string }) => {
    const alert = alertStore.get(payload.alertId);
    if (!alert) return;

    alert.status = payload.status;
    if (payload.unit) alert.dispatchedUnit = payload.unit;
    if (payload.notes) {
      alert.operatorNotes = alert.operatorNotes || [];
      alert.operatorNotes.push(payload.notes);
    }

    const actionText = {
      ACTIVE: "Alerta reactivada",
      IN_REVIEW: "Operador revisando videoverificación",
      DISPATCHED: `Patrulla despachada: ${payload.unit || "Unidad asignada"}`,
      RESOLVED: "Incidente controlado y cerrado por la central",
      FALSE_ALARM: "Marcada como Falsa Alarma",
    }[payload.status];

    alert.logs.push({
      timestamp: new Date().toISOString(),
      action: actionText,
      operator: payload.operator || "Operador Central",
      details: payload.notes,
    });

    alertStore.set(alert.id, alert);
    io.emit("alert:status_changed", alert);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
  });
});

// --- REST API ROUTES ---

// Get current system settings
app.get("/api/settings", (_req, res) => {
  res.json(currentSystemSettings);
});

// Update system settings (toggle AI, etc.)
app.post("/api/settings", (req, res) => {
  const { aiEnabled, lastModifiedBy } = req.body;
  if (typeof aiEnabled === "boolean") {
    currentSystemSettings = {
      aiEnabled,
      lastModifiedBy: lastModifiedBy || "Super Admin",
      updatedAt: new Date().toISOString(),
    };
    console.log(`[SETTINGS UPDATED] AI Enabled: ${aiEnabled} by ${currentSystemSettings.lastModifiedBy}`);
  }
  res.json({ success: true, settings: currentSystemSettings });
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "PanicGuard Real-Time Video-Verification & Dispatch Backend",
    uptime: process.uptime(),
    activeAlerts: Array.from(alertStore.values()).filter((a) => a.status === "ACTIVE").length,
    totalAlerts: alertStore.size,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    aiEnabled: currentSystemSettings.aiEnabled,
  });
});

// Get all alerts
app.get("/api/alerts", (_req, res) => {
  const alerts = Array.from(alertStore.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  res.json(alerts);
});

// Get single alert
app.get("/api/alerts/:id", (req, res) => {
  const alert = alertStore.get(req.params.id);
  if (!alert) {
    return res.status(404).json({ error: "Alerta no encontrada" });
  }
  res.json(alert);
});

// Submit panic alert via HTTP POST
app.post("/api/alerts", async (req, res) => {
  try {
    const { store, images, triggerType, timestamp, centralId, centralName, guardDescription, guardName } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "Se requiere al menos 1 fotograma en la ráfaga de imágenes" });
    }

    const alertId = `ALT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const assignedStore = store || DEFAULT_STORE;
    const guardDesc = typeof guardDescription === "string" ? guardDescription.trim() : "";
    const guardOfficer = typeof guardName === "string" ? guardName.trim() : "";

    const initialLogs: AlertLogItem[] = [
      {
        timestamp: new Date().toISOString(),
        action: `Alerta recibida vía REST API (${images.length} fotogramas capturados)`,
      },
    ];

    if (guardOfficer) {
      initialLogs.push({
        timestamp: new Date().toISOString(),
        action: `Guardia en Turno registrado en Terminal: ${guardOfficer}`,
        operator: guardOfficer,
        details: `Oficial de seguridad en turno: ${guardOfficer}`,
      });
    }

    if (guardDesc) {
      initialLogs.push({
        timestamp: new Date().toISOString(),
        action: `Reporte de Guardia en Sitio (${guardOfficer || "Oficial"}): ${guardDesc}`,
        operator: guardOfficer || "Guardia en Sitio",
        details: guardDesc,
      });
    }

    const newAlert: PanicAlert = {
      id: alertId,
      store: assignedStore,
      centralId: centralId || assignedStore.centralId || "CEN-CDMX-01",
      centralName: centralName || assignedStore.centralName || "C4 Centro de Comando Poniente - CDMX",
      timestamp: timestamp || new Date().toISOString(),
      images,
      triggerType: triggerType || "MANUAL_BUTTON",
      status: "ACTIVE",
      aiStatus: "pending",
      aiVerdict: null,
      guardDescription: guardDesc || undefined,
      guardName: guardOfficer || undefined,
      operatorNotes: guardDesc ? [`[${guardOfficer || "Guardia en Sitio"}]: ${guardDesc}`] : [],
      logs: initialLogs,
    };

    // Fast-path: Broadcast raw alert instantly (<1s) and start background Gemini analysis
    await processPanicAlert(newAlert);

    // Return instant HTTP 201 response to client
    res.status(201).json({
      success: true,
      alertId: newAlert.id,
      timestamp: newAlert.timestamp,
      message: "Alerta de pánico transmitida a la Central de Monitoreo",
    });
  } catch (err: any) {
    console.error("[REST Panic Error]:", err);
    res.status(500).json({ error: err.message || "Error al procesar alerta de pánico" });
  }
});

// Real-time add log note or guard description update to alert
app.post("/api/alerts/:id/notes", (req, res) => {
  const { note, author } = req.body;
  const alert = alertStore.get(req.params.id);

  if (!alert) {
    return res.status(404).json({ error: "Alerta no encontrada" });
  }

  if (!note || typeof note !== "string" || !note.trim()) {
    return res.status(400).json({ error: "Nota requerida" });
  }

  const trimmed = note.trim();
  const authorName = author || "Guardia en Sitio";
  alert.operatorNotes = alert.operatorNotes || [];
  alert.operatorNotes.push(`[${authorName}]: ${trimmed}`);

  if (authorName.toLowerCase().includes("guardia")) {
    alert.guardDescription = alert.guardDescription ? `${alert.guardDescription} | ${trimmed}` : trimmed;
  }

  alert.logs.push({
    timestamp: new Date().toISOString(),
    action: `Bitácora actualizada (${authorName}): ${trimmed}`,
    operator: authorName,
    details: trimmed,
  });

  alertStore.set(alert.id, alert);
  io.emit("alert:status_changed", alert);

  res.json({ success: true, alert });
});

// Geocoding Proxy Route for Address Resolution using Google Maps Geocoding API
app.get("/api/geocode", async (req, res) => {
  const addressQuery = typeof req.query.address === "string" ? req.query.address.trim() : "";
  const cityQuery = typeof req.query.city === "string" ? req.query.city.trim() : "";

  if (!addressQuery) {
    return res.status(400).json({ error: "Parámetro 'address' es requerido" });
  }

  const cleanAddress = addressQuery.replace(/^.*?—\s*/, "").trim();
  const combined = [cleanAddress, cityQuery, "México"].filter(Boolean).join(", ");
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

  // 1. Try Google Geocoding API if key is present
  if (apiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        combined
      )}&key=${apiKey}&region=mx&language=es`;
      const gRes = await fetch(gUrl);
      if (gRes.ok) {
        const gData: any = await gRes.json();
        if (gData.status === "OK" && gData.results?.length > 0) {
          const loc = gData.results[0].geometry?.location;
          if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
            return res.json({
              latitude: loc.lat,
              longitude: loc.lng,
              accuracy: 5,
              formattedAddress: gData.results[0].formatted_address,
              provider: "google",
            });
          }
        }
      }
    } catch (gErr) {
      console.warn("[Geocode Google API Error]:", gErr);
    }
  }

  // 2. Fallback to OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      combined
    )}&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "PanicGuard/1.0",
      },
    });
    if (osmRes.ok) {
      const osmData: any = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        const lat = parseFloat(osmData[0].lat);
        const lon = parseFloat(osmData[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          return res.json({
            latitude: lat,
            longitude: lon,
            accuracy: 10,
            formattedAddress: osmData[0].display_name,
            provider: "nominatim",
          });
        }
      }
    }
  } catch (osmErr) {
    console.warn("[Geocode OSM Fallback Error]:", osmErr);
  }

  return res.status(404).json({ error: "No se pudo geolocalizar la dirección especificada" });
});

// Update alert status
app.patch("/api/alerts/:id/status", (req, res) => {
  const { status, operator, notes, unit } = req.body;
  const alert = alertStore.get(req.params.id);

  if (!alert) {
    return res.status(404).json({ error: "Alerta no encontrada" });
  }

  if (status) alert.status = status;
  if (unit) alert.dispatchedUnit = unit;
  if (notes) {
    alert.operatorNotes = alert.operatorNotes || [];
    alert.operatorNotes.push(notes);
  }

  alert.logs.push({
    timestamp: new Date().toISOString(),
    action: `Estado actualizado a ${status}`,
    operator: operator || "Operador Central",
    details: notes,
  });

  alertStore.set(alert.id, alert);
  io.emit("alert:status_changed", alert);

  res.json({ success: true, alert });
});

// Clear all alerts from memory
app.post("/api/alerts/clear", (req, res) => {
  alertStore.clear();
  io.emit("alerts:sync", []);
  res.json({ success: true, message: "Todas las alertas han sido borradas de la memoria del servidor." });
});

// Delete individual alert
app.delete("/api/alerts/:id", (req, res) => {
  const { id } = req.params;
  if (alertStore.has(id)) {
    alertStore.delete(id);
    io.emit("alerts:sync", Array.from(alertStore.values()));
    res.json({ success: true, message: `Alerta ${id} eliminada.` });
  } else {
    res.status(404).json({ success: false, error: "Alerta no encontrada" });
  }
});

// Trigger simulation endpoint (for demonstration and testing)
app.post("/api/alerts/simulate", async (req, res) => {
  try {
    const { scenario, customStore, targetCentral } = req.body;

    const sampleSvgs = [
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%230f172a'/%3E%3Ccircle cx='320' cy='200' r='60' fill='%23334155'/%3E%3Cpath d='M200 380 Q320 300 440 380' stroke='%23475569' stroke-width='40' fill='none'/%3E%3Ctext x='320' y='440' fill='%23ef4444' font-size='20' font-family='sans-serif' text-anchor='middle'%3E[SIMULACIÓN] Frame 1 - Entrada sospechosa%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%230f172a'/%3E%3Ccircle cx='320' cy='190' r='60' fill='%23475569'/%3E%3Crect x='280' y='260' width='80' height='120' fill='%23ef4444'/%3E%3Ctext x='320' y='440' fill='%23ef4444' font-size='20' font-family='sans-serif' text-anchor='middle'%3E[SIMULACIÓN] Frame 2 - Amenaza mostrador%3C/text%3E%3C/svg%3E",
      "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Crect width='640' height='480' fill='%230f172a'/%3E%3Ctext x='320' y='240' fill='%2322c55e' font-size='28' font-family='sans-serif' text-anchor='middle'%3EPANIC BUTTON ACTIVATED%3C/text%3E%3Ctext x='320' y='440' fill='%23ef4444' font-size='20' font-family='sans-serif' text-anchor='middle'%3E[SIMULACIÓN] Frame 3 - Confirmación auxilio%3C/text%3E%3C/svg%3E",
    ];

    const randomCentrales = [
      { id: "CEN-CDMX-01", name: "C4 Centro de Comando Poniente - CDMX" },
      { id: "CEN-GDL-02", name: "C5 Escudo Metropolitano Zapopan - Jalisco" },
      { id: "CEN-MTY-03", name: "Central de Reacción Rápida San Pedro - N.L." },
    ];
    const pickedCentral = targetCentral || randomCentrales[Math.floor(Math.random() * randomCentrales.length)];

    const alertId = `ALT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const assignedStore = customStore || DEFAULT_STORE;
    const newAlert: PanicAlert = {
      id: alertId,
      store: {
        ...assignedStore,
        centralId: pickedCentral.id,
        centralName: pickedCentral.name,
      },
      centralId: pickedCentral.id,
      centralName: pickedCentral.name,
      timestamp: new Date().toISOString(),
      images: sampleSvgs,
      triggerType: scenario === "silent" ? "SILENT_TRIGGER" : "MANUAL_BUTTON",
      status: "ACTIVE",
      aiStatus: "pending",
      aiVerdict: null,
      logs: [
        {
          timestamp: new Date().toISOString(),
          action: `Simulación de Pánico Multi-Central (${pickedCentral.name})`,
        },
      ],
    };

    await processPanicAlert(newAlert);
    res.json({ success: true, alert: newAlert });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[PanicGuard Server] running on http://0.0.0.0:${PORT}`);
  });
}

start();
