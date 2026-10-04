import { AnimalGender } from '../enums';
import { Coordinates } from './common';

export interface TrackingCollar {
  id: string;
  animalId?: string;
  collarCode: string;
  model: string;
  batteryPercentage: number;
  isActive: boolean;
  lastTransmissionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WildlifeAnimal {
  id: string;
  name: string;
  species: string;
  gender: AnimalGender;
  identificationTag: string;
  healthStatus: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched relationship
  activeCollar?: TrackingCollar;
}

export interface LocationRecord {
  id: string;
  animalId: string;
  collarId?: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
  isSimulated: boolean;
  createdAt: string;
}

export interface IngestTelemetryDTO {
  animalId: string;
  collarId?: string;
  location: Coordinates;
  recordedAt: string;
  isSimulated?: boolean;
}
