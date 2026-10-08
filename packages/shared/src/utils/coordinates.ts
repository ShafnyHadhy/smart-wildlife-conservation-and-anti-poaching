import { Coordinates } from '../types/common';
import { PolygonPoint } from '../types/alert';

export interface CoordinateValidationResult {
  isValid: boolean;
  error?: string;
}

// Geographic boundary check: lat [-90, 90], lng [-180, 180]
export function isValidCoordinate(latitude: unknown, longitude: unknown): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

// Detailed coordinate validation returning field-level error messages
export function validateCoordinates(coords: Partial<Coordinates> | null | undefined): CoordinateValidationResult {

  if (!coords) {
    return { isValid: false, error: 'Coordinates object is required' };
  }

  const { latitude, longitude } = coords;

  if (latitude === undefined || latitude === null) {
    return { isValid: false, error: 'Latitude is required' };
  }
  if (longitude === undefined || longitude === null) {
    return { isValid: false, error: 'Longitude is required' };
  }

  if (typeof latitude !== 'number' || !Number.isFinite(latitude)) {
    return { isValid: false, error: 'Latitude must be a valid finite number' };
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude)) {
    return { isValid: false, error: 'Longitude must be a valid finite number' };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, error: `Latitude must be between -90 and 90. Received: ${latitude}` };
  }
  if (longitude < -180 || longitude > 180) {
    return { isValid: false, error: `Longitude must be between -180 and 180. Received: ${longitude}` };
  }

  return { isValid: true };
}

/**
 * Calculates great-circle distance between two geographic points using Haversine formula.
 * @returns Distance in kilometers rounded to 3 decimal places (meter precision).
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000) / 1000;
}

/**
 * Deterministic ray-casting algorithm to test whether a geographic point falls inside a polygon.
 * Handles open or closed vertex lists (repeated first/last points), protects against division by zero
 * on horizontal edges, and recognizes boundary points as inside.
 */
export function isPointInPolygon(
  point: PolygonPoint,
  polygon: PolygonPoint[]
): boolean {
  if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
    return false;
  }
  if (!isValidCoordinate(point.latitude, point.longitude)) {
    return false;
  }
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return false;
  }

  // Remove duplicate closing vertex if present
  let vertices = polygon;
  const n = polygon.length;
  if (
    n > 3 &&
    polygon[0].latitude === polygon[n - 1].latitude &&
    polygon[0].longitude === polygon[n - 1].longitude
  ) {
    vertices = polygon.slice(0, n - 1);
  }

  if (vertices.length < 3) {
    return false;
  }

  // Validate all vertices
  for (const v of vertices) {
    if (!v || typeof v.latitude !== 'number' || typeof v.longitude !== 'number') {
      return false;
    }
  }

  const py = point.latitude;
  const px = point.longitude;
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].longitude;
    const yi = vertices[i].latitude;
    const xj = vertices[j].longitude;
    const yj = vertices[j].latitude;

    // Check if point lies directly on boundary edge segment
    const cross = (py - yi) * (xj - xi) - (px - xi) * (yj - yi);
    if (Math.abs(cross) < 1e-10) {
      const minX = Math.min(xi, xj);
      const maxX = Math.max(xi, xj);
      const minY = Math.min(yi, yj);
      const maxY = Math.max(yi, yj);
      if (
        px >= minX - 1e-10 &&
        px <= maxX + 1e-10 &&
        py >= minY - 1e-10 &&
        py <= maxY + 1e-10
      ) {
        return true;
      }
    }

    // Ray-casting intersection check (+longitude ray)
    const intersect =
      yi > py !== yj > py &&
      yj !== yi &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}
