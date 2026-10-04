/**
 * User roles within the wildlife organization (staff only).
 * Community members are stored separately as external reporting users.
 */
export type UserRole = 'PARK_MANAGER' | 'RANGER' | 'COMMUNITY_LIAISON_OFFICER';

export const USER_ROLES: Record<UserRole, UserRole> = {
  PARK_MANAGER: 'PARK_MANAGER',
  RANGER: 'RANGER',
  COMMUNITY_LIAISON_OFFICER: 'COMMUNITY_LIAISON_OFFICER',
};

/**
 * Patrol status types (UC01)
 */
export type PatrolStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export const PATROL_STATUSES: Record<PatrolStatus, PatrolStatus> = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * Waypoint location capture mode
 */
export type LocationType = 'GPS' | 'MANUAL';

/**
 * Animal genders
 */
export type AnimalGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

/**
 * High risk zone severity and alert levels (UC03)
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const RISK_LEVELS: Record<RiskLevel, RiskLevel> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Wildlife risk alert lifecycle statuses (UC03)
 */
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESOLVED';

export const ALERT_STATUSES: Record<AlertStatus, AlertStatus> = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESPONDING: 'RESPONDING',
  RESOLVED: 'RESOLVED',
};

/**
 * Operational alert response execution status (UC03)
 */
export type ResponseStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED';

export const RESPONSE_STATUSES: Record<ResponseStatus, ResponseStatus> = {
  INITIATED: 'INITIATED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

/**
 * Poaching and wildlife incident categories (UC02)
 */
export type IncidentType =
  | 'SNARE'
  | 'CARCASS'
  | 'ILLEGAL_CAMPSITE'
  | 'FOOTPRINT'
  | 'POACHING_ACTIVITY'
  | 'ILLEGAL_LOGGING'
  | 'OTHER';

export const INCIDENT_TYPES: Record<IncidentType, IncidentType> = {
  SNARE: 'SNARE',
  CARCASS: 'CARCASS',
  ILLEGAL_CAMPSITE: 'ILLEGAL_CAMPSITE',
  FOOTPRINT: 'FOOTPRINT',
  POACHING_ACTIVITY: 'POACHING_ACTIVITY',
  ILLEGAL_LOGGING: 'ILLEGAL_LOGGING',
  OTHER: 'OTHER',
};

/**
 * Incident report triage status (UC02)
 */
export type IncidentStatus = 'PENDING' | 'SUBMITTED' | 'REVIEWED' | 'CLOSED';

export const INCIDENT_STATUSES: Record<IncidentStatus, IncidentStatus> = {
  PENDING: 'PENDING',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED',
  CLOSED: 'CLOSED',
};

/**
 * Supporting evidence attachment category (UC02)
 */
export type EvidenceType = 'PHOTO' | 'AUDIO' | 'DOCUMENT' | 'OTHER';

/**
 * Human-wildlife conflict categories (UC04)
 */
export type ConflictType =
  | 'ELEPHANT_HUMAN_CONFLICT'
  | 'CROP_DAMAGE'
  | 'ANIMAL_INTRUSION'
  | 'LIVESTOCK_ATTACK'
  | 'PROPERTY_DAMAGE'
  | 'OTHER';

export const CONFLICT_TYPES: Record<ConflictType, ConflictType> = {
  ELEPHANT_HUMAN_CONFLICT: 'ELEPHANT_HUMAN_CONFLICT',
  CROP_DAMAGE: 'CROP_DAMAGE',
  ANIMAL_INTRUSION: 'ANIMAL_INTRUSION',
  LIVESTOCK_ATTACK: 'LIVESTOCK_ATTACK',
  PROPERTY_DAMAGE: 'PROPERTY_DAMAGE',
  OTHER: 'OTHER',
};

/**
 * Human-wildlife conflict triage status (UC04)
 */
export type ConflictStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RESPONDING'
  | 'RESOLVED'
  | 'CLOSED';

export const CONFLICT_STATUSES: Record<ConflictStatus, ConflictStatus> = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESPONDING: 'RESPONDING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

/**
 * Offline synchronization operation status
 */
export type SyncOperationStatus = 'PENDING' | 'SYNCHRONIZED' | 'FAILED';

export const SYNC_OPERATION_STATUSES: Record<SyncOperationStatus, SyncOperationStatus> = {
  PENDING: 'PENDING',
  SYNCHRONIZED: 'SYNCHRONIZED',
  FAILED: 'FAILED',
};
