/**
 * Geographic coordinates representation (latitude & longitude)
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Health check status response
 */
export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'unconfigured';
  provider: 'neon-postgres';
  latencyMs?: number;
  message?: string;
  error?: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: DatabaseHealth;
}

/**
 * User roles within the wildlife conservation context
 */
export type UserRole = 'PARK_MANAGER' | 'RANGER' | 'COMMUNITY_OFFICER' | 'COMMUNITY_MEMBER';

/**
 * Patrol status types (UC01)
 */
export type PatrolStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';

/**
 * Poaching and wildlife incident categories (UC02)
 */
export type IncidentType =
  | 'POACHING_TRAP'
  | 'ILLEGAL_LOGGING'
  | 'ANIMAL_CARCASS'
  | 'SUSPICIOUS_ENCAMPMENT'
  | 'ARMED_INTRUSION'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Wildlife risk alert severity and status (UC03)
 */
export type RiskSeverity = 'MEDIUM' | 'HIGH' | 'EMERGENCY';
export type AlertStatus = 'PENDING' | 'DISPATCHED' | 'RESOLVED' | 'FALSE_ALARM';

/**
 * Human-wildlife conflict categories (UC04)
 */
export type ConflictType =
  | 'CROP_DAMAGE'
  | 'PROPERTY_DAMAGE'
  | 'VILLAGE_INTRUSION'
  | 'HUMAN_INJURY'
  | 'LIVESTOCK_ATTACK'
  | 'OTHER';

export type ConflictStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED';

/**
 * Offline synchronization operation status
 */
export type SyncOperationStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
