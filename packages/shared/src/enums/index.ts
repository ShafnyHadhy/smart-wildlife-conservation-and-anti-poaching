// Staff user roles
export enum UserRole {
  PARK_MANAGER = 'PARK_MANAGER',
  RANGER = 'RANGER',
  COMMUNITY_LIAISON_OFFICER = 'COMMUNITY_LIAISON_OFFICER',
}
export const USER_ROLES = UserRole;

// Patrol statuses
export enum PatrolStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
export const PATROL_STATUSES = PatrolStatus;

export enum LocationType {
  GPS = 'GPS',
  MANUAL = 'MANUAL',
}

export enum AnimalGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

// Risk levels for zones and alerts
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
export const RISK_LEVELS = RiskLevel;

// Wildlife risk alert statuses
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
}
export const ALERT_STATUSES = AlertStatus;

// Operational alert response statuses
export enum ResponseStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}
export const RESPONSE_STATUSES = ResponseStatus;

// Poaching and wildlife incident types
export enum IncidentType {
  SNARE = 'SNARE',
  CARCASS = 'CARCASS',
  ILLEGAL_CAMPSITE = 'ILLEGAL_CAMPSITE',
  FOOTPRINT = 'FOOTPRINT',
  POACHING_ACTIVITY = 'POACHING_ACTIVITY',
  ILLEGAL_LOGGING = 'ILLEGAL_LOGGING',
  OTHER = 'OTHER',
}
export const INCIDENT_TYPES = IncidentType;

// Incident report statuses
export enum IncidentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  CLOSED = 'CLOSED',
}
export const INCIDENT_STATUSES = IncidentStatus;

export enum EvidenceType {
  PHOTO = 'PHOTO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  OTHER = 'OTHER',
}

// Human-wildlife conflict types
export enum ConflictType {
  ELEPHANT_HUMAN_CONFLICT = 'ELEPHANT_HUMAN_CONFLICT',
  CROP_DAMAGE = 'CROP_DAMAGE',
  ANIMAL_INTRUSION = 'ANIMAL_INTRUSION',
  LIVESTOCK_ATTACK = 'LIVESTOCK_ATTACK',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  OTHER = 'OTHER',
}
export const CONFLICT_TYPES = ConflictType;

// Conflict report triage statuses
export enum ConflictStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}
export const CONFLICT_STATUSES = ConflictStatus;

// Offline synchronization statuses
export enum SyncOperationStatus {
  PENDING = 'PENDING',
  SYNCHRONIZED = 'SYNCHRONIZED',
  FAILED = 'FAILED',
}
export const SYNC_OPERATION_STATUSES = SyncOperationStatus;

