export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
}

export interface CentralStation {
  id: string; // e.g. "CEN-MEX-001"
  name: string; // e.g. "C4 Central Poniente - CDMX"
  code: string; // e.g. "C4-CDMX-PON"
  responsibleName: string;
  email: string;
  password?: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  registeredBy?: string;
  notes?: string;
  coordinates?: GeoCoordinates;
  platform?: 'panicguard.com.mx';
}

export interface StoreMetadata {
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  coordinates: GeoCoordinates;
  centralId?: string;
  centralName?: string;
  panicHotkey?: string; // e.g. "p"
  panicHotkeyMode?: 'DIRECT' | 'ALT_COMBINATION';
  cameraEnabled?: boolean;
}

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'FALSE_ALARM' | 'PENDING';

export type UserRole = 'SUPER_ADMIN' | 'CENTRAL' | 'TERMINAL' | 'ADMIN' | 'GUARD';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  storeId?: string;
  storeName?: string;
  centralId?: string;
  centralName?: string;
  guardSector?: string;
  createdAt: string;
  createdBy?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  photoURL?: string;
  platform?: 'panicguard.com.mx';
}

export interface TerminalRegistration {
  id: string;
  email: string;
  password?: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  assignedRole: 'TERMINAL' | 'CENTRAL' | 'SUPER_ADMIN' | 'GUARD';
  registeredBy: string;
  createdAt: string;
  lastActive?: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED';
  coordinates: GeoCoordinates;
  centralId?: string;
  centralName?: string;
  panicHotkey?: string; // e.g. "p"
  panicHotkeyMode?: 'DIRECT' | 'ALT_COMBINATION';
  cameraEnabled?: boolean;
  platform?: 'panicguard.com.mx';
}

export interface ThreatDetails {
  weaponsDetected: boolean;
  weaponTypes?: string[];
  intrudersCount?: number;
  physicalAggression: boolean;
  fireOrSmoke: boolean;
  distressSigns: boolean;
  facialCoverings: boolean;
}

export interface FrameAnalysis {
  frameIndex: number;
  description: string;
  detectedObjects: string[];
}

export interface AiVerdict {
  threatLevel: ThreatLevel;
  confidenceScore: number;
  summary: string;
  threatDetails: ThreatDetails;
  recommendedProtocol: string[];
  evidenceTimeline: FrameAnalysis[];
  analyzedAt: string;
  modelUsed: string;
  rawExplanation?: string;
}

export type AlertStatus = 'ACTIVE' | 'IN_REVIEW' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';

export type TriggerMode = 'MANUAL_BUTTON' | 'SILENT_TRIGGER' | 'KEYBOARD_HOTKEY' | 'DRILL_TEST' | 'VOLUME_BUTTON' | 'BLUETOOTH_BUTTON' | 'GUARD_PANIC' | 'TAP_BUTTON' | 'TRIPLE_TAP' | 'SHAKE_GESTURE';

export interface AlertLogItem {
  timestamp: string;
  action: string;
  operator?: string;
  details?: string;
}

export interface SystemSettings {
  aiEnabled: boolean; // Toggle multimodal analysis
  lastModifiedBy?: string;
  updatedAt?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  aiEnabled: false,
  lastModifiedBy: "Super Admin",
  updatedAt: new Date().toISOString(),
};

export interface PanicAlert {
  id: string;
  store: StoreMetadata;
  timestamp: string;
  images: string[]; // Base64 data URLs (3 frames)
  cameraEnabled?: boolean;
  triggerType: TriggerMode;
  status: AlertStatus;
  aiVerdict?: AiVerdict | null;
  aiStatus: 'pending' | 'analyzing' | 'completed' | 'failed' | 'disabled';
  aiError?: string;
  operatorNotes?: string[];
  dispatchedUnit?: string;
  logs: AlertLogItem[];
  centralId?: string;
  centralName?: string;
  guardDescription?: string;
  guardName?: string;
  platform?: 'panicguard.com.mx';
}

export interface SocketAlertEvent {
  type: 'NEW_ALERT' | 'AI_UPDATE' | 'STATUS_UPDATE';
  alert: PanicAlert;
}

export const DEFAULT_CENTRALES: CentralStation[] = [
  {
    id: "CEN-CDMX-01",
    name: "Centro de Comando y Control Poniente - CDMX",
    code: "CEN-CDMX-PONIENTE",
    responsibleName: "Inspector General de Guardia",
    email: "central.operador@panicguard.mx",
    phone: "+52 55 5200 9000",
    city: "Ciudad de México",
    state: "CDMX",
    address: "Av. Patriotismo 760, San Pedro de los Pinos, Benito Juárez",
    status: "ACTIVE",
    notes: "Central de Despacho y Monitoreo Metropolitano Activa",
    createdAt: "2026-01-01T00:00:00.000Z",
    registeredBy: "Super Admin (Matriz)"
  }
];

export const DEFAULT_STORE: StoreMetadata = {
  storeId: "STR-MEX-0842",
  storeName: "Joyería & Relojería Aurora Real",
  ownerName: "Carlos Méndez Sandoval",
  phone: "+52 55 9876 5432",
  address: "Av. Insurgentes Sur 1425, Col. Insurgentes Mixcoac",
  city: "Ciudad de México, CDMX",
  category: "Joyería y Artículos de Lujo",
  centralId: "CEN-CDMX-01",
  centralName: "C4 Centro de Comando Poniente - CDMX",
  coordinates: {
    latitude: 19.3731,
    longitude: -99.1793,
    accuracy: 4.5,
  },
};

export function formatTriggerType(type: TriggerMode | string): { label: string; isDrill: boolean } {
  switch (type) {
    case 'DRILL_TEST':
      return { label: 'SIMULACRO (PRUEBA)', isDrill: true };
    case 'SILENT_TRIGGER':
      return { label: 'ALERTA SILENCIOSA', isDrill: false };
    case 'KEYBOARD_HOTKEY':
      return { label: 'ATAJO DE TECLADO', isDrill: false };
    case 'VOLUME_BUTTON':
    case 'BLUETOOTH_BUTTON':
      return { label: 'BOTÓN BLUETOOTH / PULSADOR EXTERNO', isDrill: false };
    case 'GUARD_PANIC':
    case 'TAP_BUTTON':
      return { label: 'BOTÓN DE PÁNICO', isDrill: false };
    case 'MANUAL_BUTTON':
    default:
      return { label: 'BOTÓN DE PÁNICO', isDrill: false };
  }
}

export interface ParsedEmergencyReason {
  reason: string | null;
  cleanSummary: string;
}

const SYSTEM_LOG_OR_GENERIC_SOS_REGEX =
  /SOS\s+(?:SUPERVISOR|GUARDIA|OFICIAL)|activó\s+auxilio|Alerta\s+SOS\s+emitida|^Alerta\s+recibida|^Guardia\s+en\s+Turno|^Oficial\s+de\s+seguridad\s+en\s+turno|^Incidente\s+(?:controlado|resuelto)|^Estado\s+actualizado|^Patrulla\s+(?:y\s+guardia\s+)?despachad|^Marcada\s+como\s+Falsa\s+Alarma|^Operador\s+revisando|^Alerta\s+reactivada|^Reporte\s+de\s+Guardia\s+en\s+Sitio/i;

function normalizeAndDedupeReasons(rawParts: string[]): string | null {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const rawItem of rawParts) {
    // Split if there are multiple labeled segments inside a single string
    const subParts = rawItem.split(/\s*(?:\||•|;)\s*/);
    for (const part of subParts) {
      const cleanedPart = part
        .replace(/^(?:Tipo(?:\s+de\s+(?:emergencia|incidencia|alerta))?|Motivo(?:\s+de\s+(?:emergencia|alerta))?|Incidencia|Emergencia)\s*:\s*/i, "")
        .replace(/\.$/, "")
        .trim();

      if (!cleanedPart) continue;
      if (SYSTEM_LOG_OR_GENERIC_SOS_REGEX.test(cleanedPart)) continue;

      const norm = cleanedPart
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[🚨⚠️⚡.]/g, "")
        .trim()
        .toLowerCase();

      if (
        !norm ||
        norm === "null" ||
        norm === "undefined" ||
        norm === "n/a" ||
        norm === "s/m" ||
        norm === "ninguno" ||
        norm === "ninguna" ||
        norm === "sin motivo" ||
        norm === "sin especificar" ||
        norm === "no especificado" ||
        norm === "no seleccionado" ||
        norm === "motivo no seleccionado" ||
        norm === "motivo desconocido" ||
        norm === "desconocido" ||
        norm === "pulsador bluetooth" ||
        norm === "boton bluetooth" ||
        norm === "boton de panico"
      ) {
        continue;
      }

      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push(cleanedPart);
      }
    }
  }

  return unique.length > 0 ? unique.join(" • ") : null;
}

export function extractEmergencyReason(rawText?: string | null): ParsedEmergencyReason {
  if (!rawText) return { reason: null, cleanSummary: "" };
  const cleaned = rawText
    .replace(/["“”]/g, "")
    .replace(/^\[.*?\]:\s*/, "")
    .trim();
  if (!cleaned) return { reason: null, cleanSummary: "" };

  // 1. Buscar etiqueta explícita: "Tipo: ...", "Motivo: ...", "Incidencia: ...", "Emergencia: ..."
  const explicitMatch = cleaned.match(
    /(.*?)[\s.|,-]*\b(?:Tipo(?:\s+de\s+(?:emergencia|incidencia|alerta))?|Motivo(?:\s+de\s+(?:emergencia|alerta))?|Incidencia|Emergencia)\s*:\s*(.+)$/i
  );
  if (explicitMatch) {
    const prefix = explicitMatch[1]
      .replace(/\b(?:Tipo(?:\s+de\s+(?:emergencia|incidencia|alerta))?|Motivo(?:\s+de\s+(?:emergencia|alerta))?|Incidencia|Emergencia)\s*:\s*[^|]+/gi, "")
      .replace(/[\s.|,-]+$/, "")
      .trim();
    const rawSegments = explicitMatch[2].split(/\s*\|\s*/);
    const extractedReason = normalizeAndDedupeReasons(rawSegments);
    return {
      reason: extractedReason,
      cleanSummary: prefix,
    };
  }

  // 2. Buscar notas o motivos concatenados con " | " después de un prefijo SOS automático
  const isGenericOrSystem = SYSTEM_LOG_OR_GENERIC_SOS_REGEX.test(cleaned);
  if (cleaned.includes("|")) {
    const parts = cleaned
      .split(/\s*\|\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1 && isGenericOrSystem) {
      return {
        reason: normalizeAndDedupeReasons(parts.slice(1)),
        cleanSummary: parts[0].replace(/\.$/, "").trim(),
      };
    }
  }

  // 3. Si NO es un mensaje genérico de SOS ni de sistema, el texto limpio es el motivo directo
  if (!isGenericOrSystem) {
    const directReason = normalizeAndDedupeReasons([cleaned]);
    return {
      reason: directReason,
      cleanSummary: "",
    };
  }

  return {
    reason: null,
    cleanSummary: cleaned,
  };
}

export function getAlertEmergencyReason(alert?: PanicAlert | null): ParsedEmergencyReason {
  if (!alert) return { reason: null, cleanSummary: "" };

  const rawGuardReport =
    alert.guardDescription ||
    alert.operatorNotes?.find(
      (n) =>
        n.includes("Guardia") ||
        n.includes("PULSADOR") ||
        n.includes("SOS") ||
        (alert.guardName && n.includes(alert.guardName))
    );

  const primary = extractEmergencyReason(rawGuardReport);
  if (primary.reason) {
    return primary;
  }

  // Buscar solo en logs emitidos por el guardia o que contengan etiqueta explícita (Tipo:/Motivo:)
  if (Array.isArray(alert.logs)) {
    for (const log of alert.logs) {
      const text = log.details || log.action || "";
      const hasExplicitLabel = /\b(?:Tipo(?:\s+de\s+(?:emergencia|incidencia|alerta))?|Motivo(?:\s+de\s+(?:emergencia|alerta))?|Incidencia|Emergencia)\s*:/i.test(text);
      const isGuardNoteLog =
        /^Bitácora actualizada|^Reporte adicional del Guardia/i.test(log.action || "") &&
        log.operator &&
        !log.operator.toLowerCase().includes("operador") &&
        !log.operator.toLowerCase().includes("central");

      if (hasExplicitLabel || isGuardNoteLog) {
        const parsedLog = extractEmergencyReason(log.details || log.action);
        if (parsedLog.reason) {
          return {
            reason: parsedLog.reason,
            cleanSummary: primary.cleanSummary || parsedLog.cleanSummary,
          };
        }
      }
    }
  }

  return primary;
}



