import { Coordinates } from '../types/common';

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
