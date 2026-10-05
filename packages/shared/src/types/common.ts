/**
 * Geographic coordinates representation (latitude & longitude)
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Common base entity fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
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
 * Standard API Success Envelope
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
}

/**
 * Standard API List Response Metadata
 */
export interface ApiListMeta {
  count: number;
  total?: number;
  limit?: number;
  offset?: number;
}

/**
 * Standard API List Envelope
 */
export interface ApiListResponse<T = any> {
  success: true;
  data: T[];
  meta: ApiListMeta;
}

/**
 * Standard API Error Detail
 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
  [key: string]: any;
}

/**
 * Standard API Error Structure
 */
export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

