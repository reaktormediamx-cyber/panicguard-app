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

export type TriggerMode = 'MANUAL_BUTTON' | 'SILENT_TRIGGER' | 'KEYBOARD_HOTKEY' | 'DRILL_TEST' | 'VOLUME_BUTTON' | 'GUARD_PANIC' | 'TRIPLE_TAP' | 'SHAKE_GESTURE';

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
      return { label: 'BOTÓN BLUETOOTH / PULSADOR EXTERNO', isDrill: false };
    case 'GUARD_PANIC':
      return { label: 'SOS GUARDIA (BOTÓN ROJO)', isDrill: false };
    case 'MANUAL_BUTTON':
    default:
      return { label: 'BOTÓN DE PÁNICO', isDrill: false };
  }
}

export interface ParsedEmergencyReason {
  reason: string | null;
  cleanSummary: string;
}

export function extractEmergencyReason(rawText?: string | null): ParsedEmergencyReason {
  if (!rawText) return { reason: null, cleanSummary: "" };
  const cleaned = rawText.replace(/["“”]/g, "").trim();
  if (!cleaned) return { reason: null, cleanSummary: "" };

  // 1. Buscar etiqueta explícita: "Tipo: ...", "Motivo: ...", "Incidencia: ...", "Emergencia: ..."
  const explicitMatch = cleaned.match(
    /(.*?)[\s.|,-]*\b(?:Tipo(?:\s+de\s+(?:emergencia|incidencia|alerta))?|Motivo(?:\s+de\s+(?:emergencia|alerta))?|Incidencia|Emergencia)\s*:\s*(.+)$/i
  );
  if (explicitMatch) {
    const prefix = explicitMatch[1].replace(/[\s.|,-]+$/, "").trim();
    const extractedReason = explicitMatch[2]
      .split(/\s*\|\s*/)
      .map((s) => s.trim().replace(/\.$/, ""))
      .filter(Boolean)
      .join(" • ");
    return {
      reason: extractedReason || null,
      cleanSummary: prefix,
    };
  }

  // 2. Buscar notas o motivos concatenados con " | " después de un prefijo SOS automático
  const isGenericSos = /SOS\s+(?:SUPERVISOR|GUARDIA|OFICIAL)|activó\s+auxilio/i.test(cleaned);
  if (cleaned.includes("|")) {
    const parts = cleaned
      .split(/\s*\|\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 1 && isGenericSos) {
      return {
        reason: parts.slice(1).join(" • "),
        cleanSummary: parts[0],
      };
    }
  }

  // 3. Si no es un mensaje genérico de SOS, todo el texto es el motivo directo de la emergencia
  if (!isGenericSos) {
    return {
      reason: cleaned.replace(/^\[.*?\]:\s*/, "").trim(),
      cleanSummary: "",
    };
  }

  return {
    reason: null,
    cleanSummary: cleaned,
  };
}

