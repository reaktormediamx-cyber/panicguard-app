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

export type TriggerMode = 'MANUAL_BUTTON' | 'SILENT_TRIGGER' | 'KEYBOARD_HOTKEY' | 'DRILL_TEST';

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
}

export interface SocketAlertEvent {
  type: 'NEW_ALERT' | 'AI_UPDATE' | 'STATUS_UPDATE';
  alert: PanicAlert;
}

export const DEFAULT_CENTRALES: CentralStation[] = [];

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
    case 'MANUAL_BUTTON':
    default:
      return { label: 'BOTÓN DE PÁNICO', isDrill: false };
  }
}
