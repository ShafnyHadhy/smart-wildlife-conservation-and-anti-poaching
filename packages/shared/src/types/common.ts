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
