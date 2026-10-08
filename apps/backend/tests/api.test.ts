import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { runSeeds } from '../src/db/seed';
import { closePool, query } from '../src/config/database';

describe('Phase 3: API Foundation, Validation & Offline Sync Verification', () => {
  // Common Seed IDs from 001_initial_seed.sql
  const SEED_YALA_PARK_ID = '11111111-1111-1111-1111-111111111111';
  const SEED_RANGER_SAMAN_ID = 'aaaa0002-0000-0000-0000-000000000002'; // Ranger Kasun Bandara
  const SEED_CLO_ANURA_ID = 'aaaa0005-0000-0000-0000-000000000005'; // CLO Anura Wickramasinghe
  const SEED_MEMBER_BANDARA_ID = 'bbbb0001-0000-0000-0000-000000000001'; // Member Gamini Senanayake
  const SEED_ELEPHANT_WALAGAMBA_ID = 'ffff0001-0000-0000-0000-000000000001'; // Elephant Walagamba
  const SEED_COLLAR_WALAGAMBA_ID = '10100001-0000-0000-0000-000000000001'; // Collar Walagamba
  const SEED_COLLAR_KUMANA_ID = '10100002-0000-0000-0000-000000000002'; // Belongs to Elephant Kumana Raja

  beforeAll(async () => {
    // Reset seeds to known deterministic state
    await runSeeds();
  });

  afterAll(async () => {
    await closePool();
  });

  // ==========================================================================
  // 1. Health & Root Endpoints
  // ==========================================================================
  describe('Health & Root API', () => {
    it('GET / should return API operational catalog', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('operational');
      expect(res.body.endpoints).toBeDefined();
    });

    it('GET /api/health should return 200 with database connected', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database.status).toBe('connected');
    });
  });

  // ==========================================================================
  // 2. Parks & Users
  // ==========================================================================
  describe('Parks & Staff API', () => {
    it('GET /api/parks should return list of seeded parks with standard envelope', async () => {
      const res = await request(app).get('/api/parks');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.count).toBeGreaterThanOrEqual(3);
      const names = res.body.data.map((p: any) => p.name);
      expect(names).toContain('Yala National Park');
    });

    it('GET /api/parks/:id should return single park detail', async () => {
      const res = await request(app).get(`/api/parks/${SEED_YALA_PARK_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('YALA');
    });

    it('GET /api/parks/:id should return 404 for non-existent park UUID', async () => {
      const res = await request(app).get('/api/parks/00000000-0000-0000-0000-999999999999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/users should return staff list', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    });
  });

  // ==========================================================================
  // 3. Patrols & Patrol Routes (UC01 Foundation)
  // ==========================================================================
  describe('Patrols API', () => {
    it('GET /api/patrols should return patrols with meta count', async () => {
      const res = await request(app).get('/api/patrols');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/patrols?status=ACTIVE should filter by active status', async () => {
      const res = await request(app).get('/api/patrols?status=ACTIVE');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const patrol of res.body.data) {
        expect(patrol.status).toBe('ACTIVE');
      }
    });

    it('GET /api/patrols/:id should return patrol aggregate with waypoints', async () => {
      // Find an active patrol ID
      const listRes = await request(app).get('/api/patrols?status=ACTIVE');
      const patrolId = listRes.body.data[0].id;

      const res = await request(app).get(`/api/patrols/${patrolId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(patrolId);
      expect(res.body.data.rangerName).toBeDefined();
      expect(Array.isArray(res.body.data.waypoints)).toBe(true);
      expect(res.body.data.waypoints.length).toBeGreaterThan(0);
    });

    it('GET /api/patrol-routes should return all designated routes', async () => {
      const res = await request(app).get('/api/patrol-routes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ==========================================================================
  // 4. Wildlife Telemetry & Risk Alerts (UC03 Foundation)
  // ==========================================================================
  describe('Wildlife Animals & Telemetry Ingestion API', () => {
    it('GET /api/animals should return monitored animals', async () => {
      const res = await request(app).get('/api/animals');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/animal-locations should accept valid telemetry fix', async () => {
      const payload = {
        animalId: SEED_ELEPHANT_WALAGAMBA_ID,
        collarId: SEED_COLLAR_WALAGAMBA_ID,
        latitude: 6.362,
        longitude: 80.458,
        recordedAt: new Date().toISOString(),
      };

      const res = await request(app).post('/api/animal-locations').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.animalId).toBe(SEED_ELEPHANT_WALAGAMBA_ID);
      expect(res.body.data.latitude).toBeCloseTo(6.362, 3);
    });

    it('POST /api/animal-locations should reject invalid latitude > 90', async () => {
      const payload = {
        animalId: SEED_ELEPHANT_WALAGAMBA_ID,
        collarId: SEED_COLLAR_WALAGAMBA_ID,
        latitude: 95.5, // Invalid!
        longitude: 80.458,
        recordedAt: new Date().toISOString(),
      };

      const res = await request(app).post('/api/animal-locations').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/animal-locations should reject invalid longitude < -180', async () => {
      const payload = {
        animalId: SEED_ELEPHANT_WALAGAMBA_ID,
        collarId: SEED_COLLAR_WALAGAMBA_ID,
        latitude: 6.362,
        longitude: -195.0, // Invalid!
        recordedAt: new Date().toISOString(),
      };

      const res = await request(app).post('/api/animal-locations').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/animal-locations should reject unknown animal ID', async () => {
      const payload = {
        animalId: '00000000-0000-0000-0000-999999999999',
        collarId: SEED_COLLAR_WALAGAMBA_ID,
        latitude: 6.362,
        longitude: 80.458,
        recordedAt: new Date().toISOString(),
      };

      const res = await request(app).post('/api/animal-locations').send(payload);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('POST /api/animal-locations should reject mismatched collar ID (collar belongs to different animal)', async () => {
      const payload = {
        animalId: SEED_ELEPHANT_WALAGAMBA_ID, // Elephant 1
        collarId: SEED_COLLAR_KUMANA_ID, // Collar assigned to Elephant 2!
        latitude: 6.362,
        longitude: 80.458,
        recordedAt: new Date().toISOString(),
      };

      const res = await request(app).post('/api/animal-locations').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('not assigned to animal');
    });

    it('GET /api/alerts should return seeded active alerts', async () => {
      const res = await request(app).get('/api/alerts?status=ACTIVE');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/alerts/:id/respond should record response and transition alert', async () => {
      const alertsRes = await request(app).get('/api/alerts?status=ACTIVE');
      const alertId = alertsRes.body.data[0].id;

      const payload = {
        responderId: SEED_RANGER_SAMAN_ID,
        actionTaken: 'Deployed acoustic thumper to steer elephant away from village border',
        status: 'IN_PROGRESS',
        notes: 'Elephant herd retreating south towards river',
      };

      const res = await request(app).post(`/api/alerts/${alertId}/respond`).send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alertId).toBe(alertId);
      expect(res.body.data.responderId).toBe(SEED_RANGER_SAMAN_ID);

      // Verify alert status updated to RESPONDING
      const updatedAlertRes = await request(app).get(`/api/alerts/${alertId}`);
      expect(updatedAlertRes.body.data.status).toBe('RESPONDING');
    });

    it('POST /api/alerts/:id/respond should reject invalid responder ID', async () => {
      const alertsRes = await request(app).get('/api/alerts');
      const alertId = alertsRes.body.data[0].id;

      const payload = {
        responderId: '00000000-0000-0000-0000-999999999999',
        actionTaken: 'Tested response with invalid responder',
        status: 'INITIATED',
      };

      const res = await request(app).post(`/api/alerts/${alertId}/respond`).send(payload);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // 5. Incident Reporting API (UC02 Foundation)
  // ==========================================================================
  describe('Incidents API', () => {
    it('GET /api/incidents should return seeded incident list', async () => {
      const res = await request(app).get('/api/incidents');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/incidents should record a valid incident', async () => {
      const payload = {
        rangerId: SEED_RANGER_SAMAN_ID,
        incidentType: 'SNARE',
        description: 'Active wire snare discovered attached to kumbuk tree',
        latitude: 6.368,
        longitude: 80.465,
        reportedAt: new Date().toISOString(),
        clientMutationId: `inc-test-${Date.now()}`,
      };

      const res = await request(app).post('/api/incidents').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.incidentType).toBe('SNARE');
    });

    it('POST /api/incidents should reject invalid coordinates (latitude out of range)', async () => {
      const payload = {
        rangerId: SEED_RANGER_SAMAN_ID,
        incidentType: 'SNARE',
        description: 'Invalid coordinate test',
        latitude: -110.0, // Invalid!
        longitude: 80.465,
      };

      const res = await request(app).post('/api/incidents').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/incidents should reject non-ranger staff member reporting incident', async () => {
      const payload = {
        rangerId: SEED_CLO_ANURA_ID, // CLO, not Ranger!
        incidentType: 'POACHING_ACTIVITY',
        description: 'Reported by CLO should be rejected for ranger incident',
        latitude: 6.368,
        longitude: 80.465,
      };

      const res = await request(app).post('/api/incidents').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Only rangers can file incident reports');
    });

    it('POST /api/incidents should reject invalid incident type', async () => {
      const payload = {
        rangerId: SEED_RANGER_SAMAN_ID,
        incidentType: 'INVALID_CATEGORY',
        description: 'Testing unknown category',
        latitude: 6.368,
        longitude: 80.465,
      };

      const res = await request(app).post('/api/incidents').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // 6. Conflict Reports API (UC04 Foundation)
  // ==========================================================================
  describe('Conflict Reports API', () => {
    it('GET /api/conflict-reports should return list', async () => {
      const res = await request(app).get('/api/conflict-reports');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/conflict-reports should create a valid report', async () => {
      const payload = {
        communityMemberId: SEED_MEMBER_BANDARA_ID,
        parkId: SEED_YALA_PARK_ID,
        conflictType: 'CROP_DAMAGE',
        description: 'Wild elephant entered paddy field bordering sanctuary perimeter',
        latitude: 6.358,
        longitude: 80.452,
        clientMutationId: `hwc-test-${Date.now()}`,
      };

      const res = await request(app).post('/api/conflict-reports').send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.conflictType).toBe('CROP_DAMAGE');
    });

    it('PATCH /api/conflict-reports/:id/status should transition operational status', async () => {
      const listRes = await request(app).get('/api/conflict-reports');
      const conflictId = listRes.body.data[0].id;

      const res = await request(app)
        .patch(`/api/conflict-reports/${conflictId}/status`)
        .send({ status: 'UNDER_REVIEW' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
    });

    it('POST /api/conflict-reports should reject invalid community member ID', async () => {
      const payload = {
        communityMemberId: '00000000-0000-0000-0000-999999999999',
        parkId: SEED_YALA_PARK_ID,
        conflictType: 'LIVESTOCK_ATTACK',
        description: 'Invalid member test',
        latitude: 6.358,
        longitude: 80.452,
      };

      const res = await request(app).post('/api/conflict-reports').send(payload);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // 7. Offline Batch Synchronization & Idempotency Engine
  // ==========================================================================
  describe('Offline Batch Sync API (/api/sync/batch)', () => {
    it('should process a batch of valid offline mutations', async () => {
      const mutationId1 = `sync-batch-1-${Date.now()}`;
      const mutationId2 = `sync-batch-2-${Date.now()}`;

      const batchPayload = {
        operations: [
          {
            clientMutationId: mutationId1,
            entityType: 'INCIDENT',
            operationType: 'CREATE',
            payload: {
              rangerId: SEED_RANGER_SAMAN_ID,
              incidentType: 'FOOTPRINT',
              description: 'Fresh poacher footprints heading east across dry riverbed',
              latitude: 6.37,
              longitude: 80.47,
            },
          },
          {
            clientMutationId: mutationId2,
            entityType: 'CONFLICT_REPORT',
            operationType: 'CREATE',
            payload: {
              communityMemberId: SEED_MEMBER_BANDARA_ID,
              parkId: SEED_YALA_PARK_ID,
              conflictType: 'ANIMAL_INTRUSION',
              description: 'Elephant spotted near school boundary fence',
              latitude: 6.359,
              longitude: 80.454,
            },
          },
        ],
      };

      const res = await request(app).post('/api/sync/batch').send(batchPayload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.syncedCount).toBe(2);
      expect(res.body.data.failedCount).toBe(0);

      const r1 = res.body.data.results.find((r: any) => r.clientMutationId === mutationId1);
      const r2 = res.body.data.results.find((r: any) => r.clientMutationId === mutationId2);
      expect(r1.status).toBe('SYNCHRONIZED');
      expect(r1.entityId).toBeDefined();
      expect(r2.status).toBe('SYNCHRONIZED');
      expect(r2.entityId).toBeDefined();
    });

    it('should guarantee idempotency when replaying the SAME clientMutationId', async () => {
      const idempotentMutationId = `sync-idem-${Date.now()}`;

      const initialPayload = {
        operations: [
          {
            clientMutationId: idempotentMutationId,
            entityType: 'INCIDENT',
            operationType: 'CREATE',
            payload: {
              rangerId: SEED_RANGER_SAMAN_ID,
              incidentType: 'ILLEGAL_LOGGING',
              description: 'Freshly cut teak logs staged for pickup',
              latitude: 6.372,
              longitude: 80.472,
            },
          },
        ],
      };

      // 1. First submission
      const firstRes = await request(app).post('/api/sync/batch').send(initialPayload);
      expect(firstRes.status).toBe(200);
      const firstEntityId = firstRes.body.data.results[0].entityId;
      expect(firstEntityId).toBeDefined();

      // Count incidents in database
      const countBefore = await query(
        'SELECT COUNT(*) FROM incidents WHERE client_mutation_id = $1',
        [idempotentMutationId]
      );
      expect(parseInt(countBefore.rows[0].count, 10)).toBe(1);

      // 2. Exact same submission replayed (simulating network retry upon dropped ACK)
      const replayRes = await request(app).post('/api/sync/batch').send(initialPayload);
      expect(replayRes.status).toBe(200);
      expect(replayRes.body.data.syncedCount).toBe(1);
      expect(replayRes.body.data.results[0].status).toBe('SYNCHRONIZED');
      expect(replayRes.body.data.results[0].entityId).toBe(firstEntityId);

      // Verify NO DUPLICATE was created in PostgreSQL
      const countAfter = await query(
        'SELECT COUNT(*) FROM incidents WHERE client_mutation_id = $1',
        [idempotentMutationId]
      );
      expect(parseInt(countAfter.rows[0].count, 10)).toBe(1);
    });

    it('should isolate failures: valid operation succeeds even when another operation in batch fails', async () => {
      const validMutationId = `sync-valid-${Date.now()}`;
      const invalidMutationId = `sync-invalid-${Date.now()}`;

      const mixedPayload = {
        operations: [
          {
            clientMutationId: validMutationId,
            entityType: 'INCIDENT',
            operationType: 'CREATE',
            payload: {
              rangerId: SEED_RANGER_SAMAN_ID,
              incidentType: 'CARCASS',
              description: 'Deer carcass discovered, cause of death natural/leopard kill',
              latitude: 6.375,
              longitude: 80.475,
            },
          },
          {
            clientMutationId: invalidMutationId,
            entityType: 'INCIDENT',
            operationType: 'CREATE',
            payload: {
              rangerId: '00000000-0000-0000-0000-999999999999', // Unknown ranger!
              incidentType: 'SNARE',
              description: 'This operation must fail',
              latitude: 6.375,
              longitude: 80.475,
            },
          },
        ],
      };

      const res = await request(app).post('/api/sync/batch').send(mixedPayload);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.syncedCount).toBe(1);
      expect(res.body.data.failedCount).toBe(1);

      const validResult = res.body.data.results.find((r: any) => r.clientMutationId === validMutationId);
      const invalidResult = res.body.data.results.find(
        (r: any) => r.clientMutationId === invalidMutationId
      );

      expect(validResult.status).toBe('SYNCHRONIZED');
      expect(validResult.entityId).toBeDefined();

      expect(invalidResult.status).toBe('FAILED');
      expect(invalidResult.error).toBeDefined();
    });
  });
});
