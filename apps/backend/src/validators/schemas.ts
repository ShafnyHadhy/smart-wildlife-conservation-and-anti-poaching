import { z } from 'zod';
import {
  PatrolStatus,
  AlertStatus,
  ResponseStatus,
  IncidentType,
  IncidentStatus,
  ConflictType,
  ConflictStatus,
  EvidenceType,
} from '@wildlife/shared';

// Common UUID Schema
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const idParamSchema = z.object({
  id: uuidSchema,
});

// Common Coordinate Schema
export const coordinateSchema = z.object({
  latitude: z
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
});

// Date string validator that accepts standard ISO dates
const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid date/time format. Must be a valid ISO-8601 timestamp.',
});

// Query filters
export const patrolFilterSchema = z.object({
  status: z.nativeEnum(PatrolStatus).optional(),
  rangerId: uuidSchema.optional(),
  parkId: uuidSchema.optional(),
});

export const alertFilterSchema = z.object({
  status: z.nativeEnum(AlertStatus).optional(),
  animalId: uuidSchema.optional(),
});

export const incidentFilterSchema = z.object({
  status: z.nativeEnum(IncidentStatus).optional(),
  rangerId: uuidSchema.optional(),
  patrolId: uuidSchema.optional(),
  incidentType: z.nativeEnum(IncidentType).optional(),
});

export const conflictFilterSchema = z.object({
  status: z.nativeEnum(ConflictStatus).optional(),
  parkId: uuidSchema.optional(),
  communityMemberId: uuidSchema.optional(),
  conflictType: z.nativeEnum(ConflictType).optional(),
  search: z.string().optional(),
});

// Request bodies


// POST /api/animal-locations
export const createAnimalLocationSchema = z.object({
  animalId: uuidSchema,
  collarId: uuidSchema,
  latitude: coordinateSchema.shape.latitude,
  longitude: coordinateSchema.shape.longitude,
  recordedAt: isoDateString,
});

// POST /api/alerts/:id/respond
export const createAlertResponseSchema = z.object({
  responderId: uuidSchema,
  actionTaken: z.string().trim().min(3, 'Action taken must be at least 3 characters'),
  status: z.nativeEnum(ResponseStatus).default(ResponseStatus.INITIATED),
  notes: z.string().optional(),
});

// POST /api/incidents
export const createIncidentSchema = z.object({
  rangerId: uuidSchema,
  patrolId: uuidSchema.optional().nullable(),
  incidentType: z.nativeEnum(IncidentType, {
    errorMap: () => ({
      message: 'Invalid incident type. Must be SNARE, CARCASS, ILLEGAL_CAMPSITE, FOOTPRINT, POACHING_ACTIVITY, ILLEGAL_LOGGING, or OTHER',
    }),
  }),
  description: z.string().trim().min(3, 'Description must be at least 3 characters'),
  latitude: coordinateSchema.shape.latitude,
  longitude: coordinateSchema.shape.longitude,
  reportedAt: isoDateString.optional(),
  clientMutationId: z.string().max(64).optional(),
});

// POST /api/incidents/:id/evidence
export const createEvidenceSchema = z.object({
  evidenceType: z.nativeEnum(EvidenceType).default(EvidenceType.PHOTO),
  filePath: z.string().trim().min(1, 'File path is required'),
  fileName: z.string().trim().optional(),
  fileType: z.string().trim().optional(),
  capturedAt: isoDateString.optional(),
  notes: z.string().trim().optional(),
});

// POST /api/conflict-reports
export const createConflictReportSchema = z.object({
  communityMemberId: uuidSchema,
  parkId: uuidSchema.optional().nullable(),
  conflictType: z.nativeEnum(ConflictType, {
    errorMap: () => ({
      message: 'Invalid conflict type. Must be ELEPHANT_HUMAN_CONFLICT, CROP_DAMAGE, ANIMAL_INTRUSION, LIVESTOCK_ATTACK, PROPERTY_DAMAGE, or OTHER',
    }),
  }),
  description: z.string().trim().min(3, 'Description must be at least 3 characters'),
  latitude: coordinateSchema.shape.latitude,
  longitude: coordinateSchema.shape.longitude,
  reportedAt: isoDateString.optional(),
  clientMutationId: z.string().max(64).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

// PATCH /api/conflict-reports/:id/status
export const updateConflictStatusSchema = z.object({
  status: z.nativeEnum(ConflictStatus, {
    errorMap: () => ({
      message: 'Invalid status. Must be SUBMITTED, UNDER_REVIEW, RESPONDING, RESOLVED, or CLOSED',
    }),
  }),
  triageNotes: z.string().optional(),
  mitigationAction: z.string().optional(),
});

// POST /api/sync/batch
export const batchSyncSchema = z.object({
  operations: z
    .array(
      z.object({
        clientMutationId: z.string().min(1, 'clientMutationId is required'),
        entityType: z.enum(['INCIDENT', 'CONFLICT_REPORT', 'ALERT_RESPONSE'], {
          errorMap: () => ({
            message: "entityType must be 'INCIDENT', 'CONFLICT_REPORT', or 'ALERT_RESPONSE'",
          }),
        }),
        operationType: z.enum(['CREATE'], {
          errorMap: () => ({
            message: "operationType must be 'CREATE'",
          }),
        }),
        payload: z.record(z.any()),
        createdAt: z.string().optional(),
      })
    )
    .min(1, 'At least one operation is required in the batch'),
});