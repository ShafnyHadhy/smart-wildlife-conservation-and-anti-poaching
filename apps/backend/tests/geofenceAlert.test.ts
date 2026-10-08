import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { runSeeds } from '../src/db/seed';
import { closePool, query } from '../src/config/database';
import {
  isPointInPolygon,
  PolygonPoint,
  RiskLevel,
  AlertStatus,
} from '@wildlife/shared';
import { wildlifeService } from '../src/services/wildlifeService';
import { wildlifeRepository } from '../src/repositories/wildlifeRepository';

describe('UC03: Geofence Evaluation & Automated Risk Alert Generation', () => {
  // Seed Constants
  const SEED_YALA_PARK_ID = '11111111-1111-1111-1111-111111111111';
  const SEED_ELEPHANT_KUMANA_ID = 'ffff0002-0000-0000-0000-000000000002';
  const SEED_COLLAR_KUMANA_ID = '10100002-0000-0000-0000-000000000002';
  const SEED_LEOPARD_KULU_ID = 'ffff0003-0000-0000-0000-000000000003';
  const SEED_COLLAR_KULU_ID = '10100003-0000-0000-0000-000000000003';
  const SEED_ZONE_KITTULKOTE_ID = '20200001-0000-0000-0000-000000000001'; // CRITICAL
  const SEED_ZONE_KATARAGAMA_ID = '20200002-0000-0000-0000-000000000002'; // HIGH

  beforeAll(async () => {
    await runSeeds();
  }, 30000);

  afterAll(async () => {
    await closePool();
  });

  // ==========================================================================
  // PART 1: POINT-IN-POLYGON (RAY-CASTING) UNIT TESTS
  // ==========================================================================
  describe('Point-in-Polygon Ray-Casting Algorithm', () => {
    // Quadrilateral polygon: (0, 0) -> (0, 10) -> (10, 10) -> (10, 0)
    const testPolygon: PolygonPoint[] = [
      { latitude: 0, longitude: 0 },
      { latitude: 10, longitude: 0 },
      { latitude: 10, longitude: 10 },
      { latitude: 0, longitude: 10 },
    ];

    it('1. should return true when point is clearly inside polygon', () => {
      const insidePoint: PolygonPoint = { latitude: 5, longitude: 5 };
      expect(isPointInPolygon(insidePoint, testPolygon)).toBe(true);
    });

    it('2. should return false when point is clearly outside polygon', () => {
      const outsidePointNorth: PolygonPoint = { latitude: 15, longitude: 5 };
      const outsidePointEast: PolygonPoint = { latitude: 5, longitude: 15 };
      const outsidePointSouth: PolygonPoint = { latitude: -5, longitude: 5 };
      const outsidePointWest: PolygonPoint = { latitude: 5, longitude: -5 };

      expect(isPointInPolygon(outsidePointNorth, testPolygon)).toBe(false);
      expect(isPointInPolygon(outsidePointEast, testPolygon)).toBe(false);
      expect(isPointInPolygon(outsidePointSouth, testPolygon)).toBe(false);
      expect(isPointInPolygon(outsidePointWest, testPolygon)).toBe(false);
    });

    it('3. should return true when point is on or near the boundary edge', () => {
      const pointOnWestEdge: PolygonPoint = { latitude: 5, longitude: 0 };
      const pointOnNorthEdge: PolygonPoint = { latitude: 10, longitude: 5 };
      const pointOnVertex: PolygonPoint = { latitude: 0, longitude: 0 };

      expect(isPointInPolygon(pointOnWestEdge, testPolygon)).toBe(true);
      expect(isPointInPolygon(pointOnNorthEdge, testPolygon)).toBe(true);
      expect(isPointInPolygon(pointOnVertex, testPolygon)).toBe(true);
    });

    it('4. should correctly handle polygon with repeated first/last closing vertex', () => {
      const closedPolygon: PolygonPoint[] = [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 0 },
        { latitude: 10, longitude: 10 },
        { latitude: 0, longitude: 10 },
        { latitude: 0, longitude: 0 }, // Repeated closing point
      ];

      expect(isPointInPolygon({ latitude: 5, longitude: 5 }, closedPolygon)).toBe(true);
      expect(isPointInPolygon({ latitude: 15, longitude: 5 }, closedPolygon)).toBe(false);
    });

    it('5. should safely reject invalid or too-small polygons and invalid coordinates', () => {
      const twoPointPolygon: PolygonPoint[] = [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 10 },
      ];

      expect(isPointInPolygon({ latitude: 5, longitude: 5 }, twoPointPolygon)).toBe(false);
      expect(isPointInPolygon({ latitude: 5, longitude: 5 }, [])).toBe(false);
      expect(isPointInPolygon({ latitude: 5, longitude: 5 }, null as any)).toBe(false);
      expect(isPointInPolygon({ latitude: 95, longitude: 5 }, testPolygon)).toBe(false); // Invalid lat
      expect(isPointInPolygon(null as any, testPolygon)).toBe(false);
    });
  });

  // ==========================================================================
  // PART 2: AUTOMATIC RISK EVALUATION & ALERT GENERATION TESTS
  // ==========================================================================
  describe('Animal Telemetry Ingestion & Risk Evaluation', () => {
    it('6. Animal location outside all risk zones should NOT create an alert', async () => {
      // Kumana Raja at safe sanctuary interior (lat: 6.3750, lon: 81.5200)
      const res = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_ELEPHANT_KUMANA_ID,
          collarId: SEED_COLLAR_KUMANA_ID,
          latitude: 6.375,
          longitude: 81.52,
          recordedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.animalId).toBe(SEED_ELEPHANT_KUMANA_ID);
      // No alert should be generated
      expect(res.body.data.generatedAlert).toBeUndefined();
    }, 20000);

    it('7. Animal location inside HIGH risk zone should generate a HIGH ACTIVE alert', async () => {
      // Kumana Raja entering Kataragama Agricultural Buffer Zone (lat: 6.4180, lon: 81.3400)
      const res = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_ELEPHANT_KUMANA_ID,
          collarId: SEED_COLLAR_KUMANA_ID,
          latitude: 6.418,
          longitude: 81.34,
          recordedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generatedAlert).toBeDefined();

      const alert = res.body.data.generatedAlert;
      expect(alert.animalId).toBe(SEED_ELEPHANT_KUMANA_ID);
      expect(alert.riskZoneId).toBe(SEED_ZONE_KATARAGAMA_ID);
      expect(alert.severity).toBe(RiskLevel.HIGH);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
      expect(alert.notes).toContain('Automated geofence breach');

      // Verify persisted in database
      const dbAlert = await wildlifeRepository.findAlertById(alert.id);
      expect(dbAlert).toBeDefined();
      expect(dbAlert?.severity).toBe(RiskLevel.HIGH);
      expect(dbAlert?.status).toBe(AlertStatus.ACTIVE);
    }, 20000);

    it('8. Animal location inside CRITICAL risk zone should generate a CRITICAL ACTIVE alert', async () => {
      // Leopard Kulu entering Kittulkote Village Settlement Zone (lat: 6.3550, lon: 81.3350)
      const res = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_LEOPARD_KULU_ID,
          collarId: SEED_COLLAR_KULU_ID,
          latitude: 6.355,
          longitude: 81.335,
          recordedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generatedAlert).toBeDefined();

      const alert = res.body.data.generatedAlert;
      expect(alert.animalId).toBe(SEED_LEOPARD_KULU_ID);
      expect(alert.riskZoneId).toBe(SEED_ZONE_KITTULKOTE_ID);
      expect(alert.severity).toBe(RiskLevel.CRITICAL);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
    }, 20000);

    it('9. Repeated ping inside the same zone should NOT create a duplicate active alert', async () => {
      // First ping for Kulu inside Kittulkote generated the alert above.
      // Second ping inside the same Kittulkote zone:
      const res = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_LEOPARD_KULU_ID,
          collarId: SEED_COLLAR_KULU_ID,
          latitude: 6.356,
          longitude: 81.336,
          recordedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Location record must be retained, but NO new alert generated
      expect(res.body.data.generatedAlert).toBeUndefined();

      // Verify in DB that only 1 alert exists for Kulu in Kittulkote
      const kuluAlerts = await wildlifeRepository.findAlerts({
        animalId: SEED_LEOPARD_KULU_ID,
        status: AlertStatus.ACTIVE,
      });
      const kittulkoteAlerts = kuluAlerts.filter((a) => a.riskZoneId === SEED_ZONE_KITTULKOTE_ID);
      expect(kittulkoteAlerts.length).toBe(1);
    }, 20000);

    it('10. Existing resolved alert followed by a new zone entry should create a new alert', async () => {
      // Find Kulu's active alert in Kittulkote and resolve it
      const activeAlerts = await wildlifeRepository.findAlerts({
        animalId: SEED_LEOPARD_KULU_ID,
        status: AlertStatus.ACTIVE,
      });
      const activeAlert = activeAlerts.find((a) => a.riskZoneId === SEED_ZONE_KITTULKOTE_ID);
      expect(activeAlert).toBeDefined();

      await wildlifeRepository.updateAlertStatus(activeAlert!.id, AlertStatus.RESOLVED);

      // Verify status is now RESOLVED
      const resolvedAlert = await wildlifeRepository.findAlertById(activeAlert!.id);
      expect(resolvedAlert?.status).toBe(AlertStatus.RESOLVED);

      // Now Kulu pings inside Kittulkote again after resolution
      const res = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_LEOPARD_KULU_ID,
          collarId: SEED_COLLAR_KULU_ID,
          latitude: 6.355,
          longitude: 81.335,
          recordedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // A new ACTIVE alert should be created now that prior alert was resolved
      expect(res.body.data.generatedAlert).toBeDefined();
      expect(res.body.data.generatedAlert.id).not.toBe(activeAlert!.id);
      expect(res.body.data.generatedAlert.status).toBe(AlertStatus.ACTIVE);
    }, 20000);

    it('11. Multiple matching zones should select the highest-risk zone (CRITICAL > HIGH)', async () => {
      // Create a temporary MEDIUM risk zone that covers the exact Kittulkote area
      const insertZoneSql = `
        INSERT INTO risk_zones (id, park_id, name, zone_type, risk_level, boundary_coordinates, is_active)
        VALUES (
          '20200099-0000-0000-0000-000000000099',
          $1,
          'Overlapping Kittulkote General Perimeter',
          'BUFFER',
          'MEDIUM',
          '[
            {"latitude": 6.3400, "longitude": 81.3200},
            {"latitude": 6.3700, "longitude": 81.3200},
            {"latitude": 6.3700, "longitude": 81.3500},
            {"latitude": 6.3400, "longitude": 81.3500}
          ]'::jsonb,
          TRUE
        )
        ON CONFLICT (id) DO NOTHING
      `;
      await query(insertZoneSql, [SEED_YALA_PARK_ID]);

      try {
        // Resolve Kulu's previous alert so a fresh check occurs
        const activeAlerts = await wildlifeRepository.findAlerts({
          animalId: SEED_LEOPARD_KULU_ID,
          status: AlertStatus.ACTIVE,
        });
        for (const a of activeAlerts) {
          await wildlifeRepository.updateAlertStatus(a.id, AlertStatus.RESOLVED);
        }

        // Location (6.3550, 81.3350) is inside BOTH:
        // - CRITICAL zone: Kittulkote Village Settlement Zone
        // - MEDIUM zone: Overlapping Kittulkote General Perimeter
        const res = await request(app)
          .post('/api/animal-locations')
          .send({
            animalId: SEED_LEOPARD_KULU_ID,
            collarId: SEED_COLLAR_KULU_ID,
            latitude: 6.355,
            longitude: 81.335,
            recordedAt: new Date().toISOString(),
          });

        expect(res.status).toBe(201);
        expect(res.body.data.generatedAlert).toBeDefined();
        // Must select CRITICAL zone over MEDIUM zone
        expect(res.body.data.generatedAlert.severity).toBe(RiskLevel.CRITICAL);
        expect(res.body.data.generatedAlert.riskZoneId).toBe(SEED_ZONE_KITTULKOTE_ID);
      } finally {
        await query('DELETE FROM risk_zones WHERE id = $1', ['20200099-0000-0000-0000-000000000099']);
      }
    }, 20000);

    it('12. Invalid telemetry remains rejected by existing validation', async () => {
      // Invalid latitude > 90
      const resLat = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_ELEPHANT_KUMANA_ID,
          collarId: SEED_COLLAR_KUMANA_ID,
          latitude: 91.0,
          longitude: 81.34,
          recordedAt: new Date().toISOString(),
        });
      expect(resLat.status).toBe(400);
      expect(resLat.body.success).toBe(false);

      // Unknown animal ID
      const resUnknownAnimal = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: '00000000-0000-0000-0000-999999999999',
          collarId: SEED_COLLAR_KUMANA_ID,
          latitude: 6.355,
          longitude: 81.335,
          recordedAt: new Date().toISOString(),
        });
      expect(resUnknownAnimal.status).toBe(404);
      expect(resUnknownAnimal.body.success).toBe(false);

      // Mismatched collar
      const resMismatchedCollar = await request(app)
        .post('/api/animal-locations')
        .send({
          animalId: SEED_ELEPHANT_KUMANA_ID,
          collarId: SEED_COLLAR_KULU_ID, // Assigned to Kulu!
          latitude: 6.355,
          longitude: 81.335,
          recordedAt: new Date().toISOString(),
        });
      expect(resMismatchedCollar.status).toBe(400);
      expect(resMismatchedCollar.body.success).toBe(false);
      expect(resMismatchedCollar.body.error.message).toContain('not assigned to animal');
    }, 20000);
  });
});
