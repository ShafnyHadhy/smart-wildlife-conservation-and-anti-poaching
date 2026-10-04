import { Coordinates } from './common';

export interface Park {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  areaSqKm?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParkDTO {
  name: string;
  code: string;
  location: Coordinates;
  areaSqKm?: number;
  description?: string;
}
