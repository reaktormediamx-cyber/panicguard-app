import fs from "fs";
import path from "path";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Firestore,
} from "firebase/firestore";
import { PanicAlert } from "../src/types.js";

let db: Firestore | null = null;
let isConnected = false;

// Initialize Firestore for PanicGuard Backend
export function initFirestoreBackend(): Firestore | null {
  if (db) return db;

  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("[Firestore Backend] ⚠️ firebase-applet-config.json no encontrado.");
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = getApps().length > 0 ? getApp() : initializeApp(config, "panicguard-server");

    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
      db = getFirestore(app, config.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }

    isConnected = true;
    console.log(
      `[Firestore Backend] ✅ Base de datos conectada exitosamente: ${config.projectId} (${config.firestoreDatabaseId || "(default)"})`
    );
    return db;
  } catch (error) {
    console.error("[Firestore Backend] ❌ Error al inicializar Firestore:", error);
    isConnected = false;
    return null;
  }
}

export function isFirestoreBackendConnected(): boolean {
  return isConnected;
}

// Clean and sanitize alert for Firestore persistence (handles document size limits)
function sanitizeAlertForFirestore(alert: PanicAlert): Record<string, any> {
  let safeImages = alert.images || [];
  const totalLength = safeImages.reduce((acc, img) => acc + (img ? img.length : 0), 0);

  // If base64 payload is too large, store primary frame only to keep document size < 700KB
  if (totalLength > 650000 && safeImages.length > 1) {
    safeImages = [safeImages[0]];
  }

  return {
    id: alert.id,
    store: alert.store || {},
    timestamp: alert.timestamp || new Date().toISOString(),
    images: safeImages,
    cameraEnabled: Boolean(alert.cameraEnabled),
    triggerType: alert.triggerType || "MANUAL_BUTTON",
    status: alert.status || "ACTIVE",
    aiStatus: alert.aiStatus || "pending",
    aiVerdict: alert.aiVerdict || null,
    aiError: alert.aiError || null,
    operatorNotes: alert.operatorNotes || [],
    dispatchedUnit: alert.dispatchedUnit || null,
    logs: alert.logs || [],
    centralId: alert.centralId || alert.store?.centralId || "CEN-CDMX-01",
    centralName: alert.centralName || alert.store?.centralName || "",
    guardDescription: alert.guardDescription || null,
    guardName: alert.guardName || null,
    updatedAt: new Date().toISOString(),
  };
}

// Persist new alert to Firestore asynchronously
export async function saveAlertToFirestore(alert: PanicAlert): Promise<boolean> {
  const database = initFirestoreBackend();
  if (!database) return false;

  try {
    const alertDocRef = doc(database, "alerts", alert.id);
    const data = sanitizeAlertForFirestore(alert);
    await setDoc(alertDocRef, data, { merge: true });
    return true;
  } catch (error) {
    console.warn(`[Firestore Backend] ⚠️ Error guardando alerta ${alert.id}:`, error);
    return false;
  }
}

// Update existing alert in Firestore
export async function updateAlertInFirestore(
  alertId: string,
  updates: Partial<PanicAlert>
): Promise<boolean> {
  const database = initFirestoreBackend();
  if (!database) return false;

  try {
    const alertDocRef = doc(database, "alerts", alertId);
    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.status) payload.status = updates.status;
    if (updates.aiStatus) payload.aiStatus = updates.aiStatus;
    if (updates.aiVerdict !== undefined) payload.aiVerdict = updates.aiVerdict;
    if (updates.aiError !== undefined) payload.aiError = updates.aiError;
    if (updates.dispatchedUnit !== undefined) payload.dispatchedUnit = updates.dispatchedUnit;
    if (updates.operatorNotes) payload.operatorNotes = updates.operatorNotes;
    if (updates.logs) payload.logs = updates.logs;
    if (updates.guardDescription !== undefined) payload.guardDescription = updates.guardDescription;

    await updateDoc(alertDocRef, payload);
    return true;
  } catch (error) {
    console.warn(`[Firestore Backend] ⚠️ Error actualizando alerta ${alertId}:`, error);
    return false;
  }
}

// Delete alert from Firestore
export async function deleteAlertFromFirestore(alertId: string): Promise<boolean> {
  const database = initFirestoreBackend();
  if (!database) return false;

  try {
    const alertDocRef = doc(database, "alerts", alertId);
    await deleteDoc(alertDocRef);
    return true;
  } catch (error) {
    console.warn(`[Firestore Backend] ⚠️ Error eliminando alerta ${alertId}:`, error);
    return false;
  }
}

// Load recent alerts on server boot to warm up in-memory cache
export async function loadRecentAlertsFromFirestore(maxCount = 200): Promise<PanicAlert[]> {
  const database = initFirestoreBackend();
  if (!database) return [];

  try {
    const alertsQuery = query(
      collection(database, "alerts"),
      orderBy("timestamp", "desc"),
      limit(maxCount)
    );

    const snapshot = await getDocs(alertsQuery);
    const loadedAlerts: PanicAlert[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.id) {
        loadedAlerts.push(data as PanicAlert);
      }
    });

    console.log(
      `[Firestore Backend] 📦 Se cargaron ${loadedAlerts.length} incidentes históricos desde Firestore al arranque.`
    );
    return loadedAlerts;
  } catch (error) {
    console.warn("[Firestore Backend] ⚠️ Error cargando alertas históricas desde Firestore:", error);
    return [];
  }
}
