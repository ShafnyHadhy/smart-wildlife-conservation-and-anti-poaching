import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { runSeeds } from '../src/db/seed';
import { closePool, query } from '../src/config/database';
import {
  RiskLevel,
  AlertStatus,
  ResponseStatus,
} from '@wildlife/shared';
import { wildlifeRepository } from '../src/repositories/wildlifeRepository';

describe('UC03: Telemetry Simulation & Alert Response Lifecycle', () => {
  // Seed identifiers
  const SEED_ELEPHANT_KUMANA_ID = 'ffff0002-0000-0000-0000-000000000002';
  const SEED_LEOPARD_KULU_ID = 'ffff0003-0000-0000-0000-000000000003';
  const SEED_ZONE_KITTULKOTE_ID = '20200001-0000-0000-0000-000000000001'; // CRITICAL
  const SEED_ZONE_KATARAGAMA_ID = '20200002-0000-0000-0000-000000000002'; // HIGH
  const SEED_RANGER_KASUN_ID = 'aaaa0002-0000-0000-0000-000000000002';
  const SEED_RANGER_NIMAL_ID = 'aaaa0003-0000-0000-0000-000000000003';

  // Safe interior sanctuary coordinate outside all risk polygons
  const SAFE_COORDINATES = { latitude: 6.375, longitude: 81.52 };
  // Inside Kataragama Agricultural Buffer Zone (HIGH risk)
  const HIGH_ZONE_COORDINATES = { latitude: 6.418, longitude: 81.34 };
  // Inside Kittulkote Village Settlement Zone (CRITICAL risk)
  const CRITICAL_ZONE_COORDINATES = { latitude: 6.355, longitude: 81.335 };

  beforeAll(async () => {
    await runSeeds();
  }, 45000);

  afterAll(async () => {
    await closePool();
  });

  // ==========================================================================
  // PART 1: TELEMETRY SIMULATOR ENDPOINT (POST /api/animals/:id/simulate-ping)
  // ==========================================================================
  describe('Telemetry Simulator Endpoint (POST /api/animals/:id/simulate-ping)', () => {
    it('1. Valid simulated ping outside risk zone creates LocationRecord with is_simulated=true and no alert', async () => {
      const res = await request(app)
        .post(`/api/animals/${SEED_ELEPHANT_KUMANA_ID}/simulate-ping`)
        .send(SAFE_COORDINATES);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBeDefined();
      expect(res.body.data.location.animalId).toBe(SEED_ELEPHANT_KUMANA_ID);
      expect(res.body.data.location.latitude).toBe(SAFE_COORDINATES.latitude);
      expect(res.body.data.location.longitude).toBe(SAFE_COORDINATES.longitude);
      expect(res.body.data.location.isSimulated).toBe(true);
      expect(res.body.data.alert).toBeNull();
    }, 25000);

    it('2. Valid simulated ping inside HIGH risk zone creates LocationRecord and generates HIGH ACTIVE alert', async () => {
      const res = await request(app)
        .post(`/api/animals/${SEED_ELEPHANT_KUMANA_ID}/simulate-ping`)
        .send(HIGH_ZONE_COORDINATES);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBeDefined();
      expect(res.body.data.location.isSimulated).toBe(true);
      expect(res.body.data.alert).toBeDefined();

      const alert = res.body.data.alert;
      expect(alert.animalId).toBe(SEED_ELEPHANT_KUMANA_ID);
      expect(alert.riskZoneId).toBe(SEED_ZONE_KATARAGAMA_ID);
      expect(alert.severity).toBe(RiskLevel.HIGH);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
      expect(alert.notes).toContain('Automated geofence breach');

      // Verify alert in database
      const dbAlert = await wildlifeRepository.findAlertById(alert.id);
      expect(dbAlert).toBeDefined();
      expect(dbAlert?.severity).toBe(RiskLevel.HIGH);
      expect(dbAlert?.status).toBe(AlertStatus.ACTIVE);
    }, 25000);

    it('3. Valid simulated ping inside CRITICAL risk zone generates CRITICAL ACTIVE alert', async () => {
      const res = await request(app)
        .post(`/api/animals/${SEED_LEOPARD_KULU_ID}/simulate-ping`)
        .send(CRITICAL_ZONE_COORDINATES);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.location).toBeDefined();
      expect(res.body.data.alert).toBeDefined();

      const alert = res.body.data.alert;
      expect(alert.animalId).toBe(SEED_LEOPARD_KULU_ID);
      expect(alert.riskZoneId).toBe(SEED_ZONE_KITTULKOTE_ID);
      expect(alert.severity).toBe(RiskLevel.CRITICAL);
      expect(alert.status).toBe(AlertStatus.ACTIVE);
    }, 25000);

    it('4. Simulator rejects invalid coordinates (latitude out of range, missing fields)', async () => {
      const invalidLatRes = await request(app)
        .post(`/api/animals/${SEED_ELEPHANT_KUMANA_ID}/simulate-ping`)
        .send({ latitude: 120, longitude: 81.34 });

      expect(invalidLatRes.status).toBe(400);
      expect(invalidLatRes.body.success).toBe(false);
      expect(invalidLatRes.body.error.code).toBe('VALIDATION_ERROR');

      const missingLngRes = await request(app)
        .post(`/api/animals/${SEED_ELEPHANT_KUMANA_ID}/simulate-ping`)
        .send({ latitude: 6.4 });

      expect(missingLngRes.status).toBe(400);
      expect(missingLngRes.body.success).toBe(false);
      expect(missingLngRes.body.error.code).toBe('VALIDATION_ERROR');
    }, 25000);

    it('5. Simulator rejects non-existent animal UUID with 404', async () => {
      const nonExistentAnimalId = '00000000-0000-0000-0000-999999999999';
      const res = await request(app)
        .post(`/api/animals/${nonExistentAnimalId}/simulate-ping`)
        .send(SAFE_COORDINATES);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    }, 25000);

    it('6. Simulator rejects animal without an assigned tracking collar', async () => {
      const uncollaredAnimalId = 'ffff9999-0000-0000-0000-000000000099';
      await query(
        `INSERT INTO wildlife_animals (id, name, species, gender, identification_tag, health_status)
         VALUES ($1, 'Uncollared Elephant', 'Asian Elephant', 'FEMALE', 'ELE-UNCOLLARED-99', 'HEALTHY')
         ON CONFLICT (id) DO NOTHING`,
        [uncollaredAnimalId]
      );

      const res = await request(app)
        .post(`/api/animals/${uncollaredAnimalId}/simulate-ping`)
        .send(SAFE_COORDINATES);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('no assigned tracking collar');
    }, 25000);

    it('7. Simulator rejects animal whose collar is inactive', async () => {
      const inactiveAnimalId = 'ffff8888-0000-0000-0000-000000000088';
      const inactiveCollarId = '10108888-0000-0000-0000-000000000088';

      await query(
        `INSERT INTO wildlife_animals (id, name, species, gender, identification_tag, health_status)
         VALUES ($1, 'Inactive Collar Elephant', 'Asian Elephant', 'MALE', 'ELE-INACTIVE-88', 'HEALTHY')
         ON CONFLICT (id) DO NOTHING`,
        [inactiveAnimalId]
      );
      await query(
        `INSERT INTO tracking_collars (id, animal_id, collar_code, model, battery_percentage, is_active)
         VALUES ($1, $2, 'COLLAR-INACT-88', 'SolarPro', 10, FALSE)
         ON CONFLICT (id) DO UPDATE SET is_active = FALSE`,
        [inactiveCollarId, inactiveAnimalId]
      );

      const res = await request(app)
        .post(`/api/animals/${inactiveAnimalId}/simulate-ping`)
        .send(SAFE_COORDINATES);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('is inactive');
    }, 25000);
  });

  // ==========================================================================
  // PART 2: ALERT RESPONSE LIFECYCLE (ACTIVE -> ACKNOWLEDGED -> RESPONDING -> RESOLVED)
  // ==========================================================================
  describe('Alert Response Lifecycle Transitions & Validation', () => {
    let testAlertId: string;

    beforeAll(async () => {
      // Create a fresh test alert for lifecycle testing
      const createdAlert = await wildlifeRepository.createAlert({
        animalId: SEED_ELEPHANT_KUMANA_ID,
        riskZoneId: SEED_ZONE_KATARAGAMA_ID,
        severity: RiskLevel.HIGH,
        status: AlertStatus.ACTIVE,
        notes: 'Lifecycle test base alert',
      });
      testAlertId = createdAlert.id;
    });

    it('8. ACTIVE alert can be acknowledged (INITIATED -> ACKNOWLEDGED)', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_KASUN_ID,
          actionTaken: 'Acknowledged alert via mobile control terminal. Ranger unit alerted.',
          status: ResponseStatus.INITIATED,
          notes: 'Dispatched patrol unit to boundary',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alertId).toBe(testAlertId);
      expect(res.body.data.status).toBe(ResponseStatus.INITIATED);

      // Verify alert transitioned to ACKNOWLEDGED
      const alert = await wildlifeRepository.findAlertById(testAlertId);
      expect(alert?.status).toBe(AlertStatus.ACKNOWLEDGED);
    }, 25000);

    it('9. Reject invalid transition: ACKNOWLEDGED alert cannot be re-initiated', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_NIMAL_ID,
          actionTaken: 'Attempting duplicate acknowledgement',
          status: ResponseStatus.INITIATED,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('already ACKNOWLEDGED');
    }, 25000);

    it('10. ACKNOWLEDGED alert transitions to RESPONDING when field action begins (IN_PROGRESS)', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_KASUN_ID,
          actionTaken: 'Arrived at agricultural fence boundary; initiating herd redirection thumper.',
          status: ResponseStatus.IN_PROGRESS,
          notes: 'Elephant spotted near sugarcane perimeter',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ResponseStatus.IN_PROGRESS);

      const alert = await wildlifeRepository.findAlertById(testAlertId);
      expect(alert?.status).toBe(AlertStatus.RESPONDING);
    }, 25000);

    it('11. Reject backwards transition: RESPONDING alert cannot transition back to INITIATED', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_NIMAL_ID,
          actionTaken: 'Attempting invalid backwards acknowledgement',
          status: ResponseStatus.INITIATED,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('cannot move backwards');
    }, 25000);

    it('12. RESPONDING alert transitions to RESOLVED when action completes (COMPLETED)', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_KASUN_ID,
          actionTaken: 'Elephant safely guided back into core forest park boundary. Area secured.',
          status: ResponseStatus.COMPLETED,
          notes: 'No crop damage or human injury reported',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ResponseStatus.COMPLETED);

      const alert = await wildlifeRepository.findAlertById(testAlertId);
      expect(alert?.status).toBe(AlertStatus.RESOLVED);
    }, 25000);

    it('13. Resolved alert cannot be reopened or responded to', async () => {
      const res = await request(app)
        .post(`/api/alerts/${testAlertId}/respond`)
        .send({
          responderId: SEED_RANGER_KASUN_ID,
          actionTaken: 'Trying to reopen or append response to resolved alert',
          status: ResponseStatus.IN_PROGRESS,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('already RESOLVED');
    }, 25000);

    it('14. Full response history is persisted and queryable', async () => {
      const alert = await wildlifeRepository.findAlertById(testAlertId);
      expect(alert?.responses).toBeDefined();
      // Should have 3 responses recorded: INITIATED, IN_PROGRESS, COMPLETED
      expect(alert?.responses?.length).toBe(3);

      const statuses = alert?.responses?.map((r) => r.status);
      expect(statuses).toContain(ResponseStatus.INITIATED);
      expect(statuses).toContain(ResponseStatus.IN_PROGRESS);
      expect(statuses).toContain(ResponseStatus.COMPLETED);

      // Verify response properties
      for (const response of alert?.responses || []) {
        expect(response.alertId).toBe(testAlertId);
        expect(response.responderId).toBeDefined();
        expect(response.actionTaken).toBeDefined();
        expect(response.respondedAt).toBeDefined();
      }
    }, 25000);
  });

  // ==========================================================================
  // PART 3: OFFLINE SYNC IDEMPOTENCY FOR ALERT RESPONSES
  // ==========================================================================
  describe('Offline Sync Idempotency for Alert Responses', () => {
    it('15. Replaying the SAME clientMutationId in /api/sync/batch does NOT duplicate response records', async () => {
      // Create a fresh active alert
      const alert = await wildlifeRepository.createAlert({
        animalId: SEED_ELEPHANT_KUMANA_ID,
        riskZoneId: SEED_ZONE_KATARAGAMA_ID,
        severity: RiskLevel.HIGH,
        status: AlertStatus.ACTIVE,
      });

      const idempotentMutationId = `sync-alert-resp-${Date.now()}`;
      const syncBatchPayload = {
        operations: [
          {
            clientMutationId: idempotentMutationId,
            entityType: 'ALERT_RESPONSE',
            operationType: 'CREATE',
            payload: {
              alertId: alert.id,
              responderId: SEED_RANGER_KASUN_ID,
              actionTaken: 'Offline synced response action',
              status: ResponseStatus.INITIATED,
              notes: 'Recorded in low-signal field',
            },
          },
        ],
      };

      // First sync submission
      const firstRes = await request(app).post('/api/sync/batch').send(syncBatchPayload);
      expect(firstRes.status).toBe(200);
      expect(firstRes.body.success).toBe(true);
      expect(firstRes.body.data.results[0].status).toBe('SYNCHRONIZED');
      const responseEntityId = firstRes.body.data.results[0].entityId;
      expect(responseEntityId).toBeDefined();

      // Count responses for this alert
      const responsesAfterFirst = await wildlifeRepository.findResponsesByAlertId(alert.id);
      expect(responsesAfterFirst.length).toBe(1);

      // Replay the SAME sync payload with same clientMutationId
      const secondRes = await request(app).post('/api/sync/batch').send(syncBatchPayload);
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);
      expect(secondRes.body.data.results[0].status).toBe('SYNCHRONIZED');
      expect(secondRes.body.data.results[0].entityId).toBe(responseEntityId);

      // Verify no duplicate response was created
      const responsesAfterSecond = await wildlifeRepository.findResponsesByAlertId(alert.id);
      expect(responsesAfterSecond.length).toBe(1);
    }, 30000);
  });

  // ==========================================================================
  // PART 4: COMPLETE END-TO-END DEMONSTRATION WORKFLOW
  // ==========================================================================
  describe('Complete End-to-End UC03 Demonstration Scenario', () => {
    it('16. Executes full lifecycle from outside zone ping to resolved alert without duplicates', async () => {
      // Ensure clean alert state for test animal in the zone
      await query(
        `UPDATE wildlife_risk_alerts SET status = 'RESOLVED' WHERE animal_id = $1 AND risk_zone_id = $2`,
        [SEED_LEOPARD_KULU_ID, SEED_ZONE_KITTULKOTE_ID]
      );

      // Step 1: Animal outside risk zone -> simulate ping
      const ping1 = await request(app)
        .post(`/api/animals/${SEED_LEOPARD_KULU_ID}/simulate-ping`)
        .send(SAFE_COORDINATES);

      expect(ping1.status).toBe(201);
      expect(ping1.body.data.location.id).toBeDefined();
      expect(ping1.body.data.alert).toBeNull(); // No alert outside zones

      // Step 2: Animal enters CRITICAL zone -> simulate ping
      const ping2 = await request(app)
        .post(`/api/animals/${SEED_LEOPARD_KULU_ID}/simulate-ping`)
        .send(CRITICAL_ZONE_COORDINATES);

      expect(ping2.status).toBe(201);
      expect(ping2.body.data.location.id).toBeDefined();
      expect(ping2.body.data.alert).toBeDefined();
      const generatedAlert = ping2.body.data.alert;
      expect(generatedAlert.severity).toBe(RiskLevel.CRITICAL);
      expect(generatedAlert.status).toBe(AlertStatus.ACTIVE);

      // Step 3: Same animal sends repeated ping in same zone -> No duplicate alert
      const ping3 = await request(app)
        .post(`/api/animals/${SEED_LEOPARD_KULU_ID}/simulate-ping`)
        .send({
          latitude: CRITICAL_ZONE_COORDINATES.latitude + 0.001,
          longitude: CRITICAL_ZONE_COORDINATES.longitude + 0.001,
        });

      expect(ping3.status).toBe(201);
      expect(ping3.body.data.location.id).toBeDefined();
      expect(ping3.body.data.alert).toBeNull(); // Suppressed as existing active alert exists

      // Step 4: Responder acknowledges alert (ACTIVE -> ACKNOWLEDGED)
      const resp1 = await request(app)
        .post(`/api/alerts/${generatedAlert.id}/respond`)
        .send({
          responderId: SEED_RANGER_NIMAL_ID,
          actionTaken: 'Acknowledged CRITICAL leopard breach alert at Kittulkote checkpoint.',
          status: ResponseStatus.INITIATED,
        });

      expect(resp1.status).toBe(201);
      const alertAfterAck = await wildlifeRepository.findAlertById(generatedAlert.id);
      expect(alertAfterAck?.status).toBe(AlertStatus.ACKNOWLEDGED);

      // Step 5: Responder starts response (ACKNOWLEDGED -> RESPONDING)
      const resp2 = await request(app)
        .post(`/api/alerts/${generatedAlert.id}/respond`)
        .send({
          responderId: SEED_RANGER_NIMAL_ID,
          actionTaken: 'Arrived on site with spotlight and vehicle deterrents.',
          status: ResponseStatus.IN_PROGRESS,
        });

      expect(resp2.status).toBe(201);
      const alertAfterResp = await wildlifeRepository.findAlertById(generatedAlert.id);
      expect(alertAfterResp?.status).toBe(AlertStatus.RESPONDING);

      // Step 6: Responder completes response (RESPONDING -> RESOLVED)
      const resp3 = await request(app)
        .post(`/api/alerts/${generatedAlert.id}/respond`)
        .send({
          responderId: SEED_RANGER_NIMAL_ID,
          actionTaken: 'Leopard redirected back into protected boundary away from settlement. Threat cleared.',
          status: ResponseStatus.COMPLETED,
        });

      expect(resp3.status).toBe(201);
      const alertAfterComplete = await wildlifeRepository.findAlertById(generatedAlert.id);
      expect(alertAfterComplete?.status).toBe(AlertStatus.RESOLVED);
    }, 40000);
  });
});
