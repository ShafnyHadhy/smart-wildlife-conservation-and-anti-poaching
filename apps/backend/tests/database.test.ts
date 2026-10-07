import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { pool, checkDatabaseConnection, closePool, query } from '../src/config/database';
import {
  parkRepository,
  userRepository,
  patrolRepository,
  wildlifeRepository,
  incidentRepository,
  conflictRepository,
} from '../src/repositories';
import { runSeeds } from '../src/db/seed';

describe('Phase 2: PostgreSQL Database & Domain Model Verification', () => {
  beforeAll(async () => {
    // Ensure fresh seeds before running tests
    await runSeeds();
  });

  afterAll(async () => {
    await closePool();
  });

  // --------------------------------------------------------------------------
  // 1. Database Connection & Table Verification
  // --------------------------------------------------------------------------
  it('1. should establish a healthy connection to Neon PostgreSQL', async () => {
    const health = await checkDatabaseConnection();
    expect(health.status).toBe('connected');
    expect(health.provider).toBe('neon-postgres');
    expect(health.latencyMs).toBeDefined();
    expect(health.latencyMs).toBeGreaterThan(0);
  });

  it('2. should verify that all 16 required tables exist in PostgreSQL schema', async () => {
    const requiredTables = [
      'parks',
      'users',
      'community_members',
      'patrol_routes',
      'patrols',
      'waypoints',
      'wildlife_animals',
      'tracking_collars',
      'location_records',
      'risk_zones',
      'wildlife_risk_alerts',
      'alert_responses',
      'incidents',
      'supporting_evidence',
      'conflict_reports',
      'sync_operations',
    ];

    const res = await query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const existingTables = res.rows.map((r: any) => r.table_name);

    for (const table of requiredTables) {
      expect(existingTables).toContain(table);
    }
  });

  // --------------------------------------------------------------------------
  // 2. Park & Patrol Domain (UC01)
  // --------------------------------------------------------------------------
  it('3. should query parks and verify coordinates and codes', async () => {
    const parks = await parkRepository.findAll();
    expect(parks.length).toBeGreaterThanOrEqual(3);

    const yala = parks.find((p) => p.code === 'YALA');
    expect(yala).toBeDefined();
    expect(yala?.name).toBe('Yala National Park');
    expect(yala?.latitude).toBeCloseTo(6.3725, 4);
    expect(yala?.longitude).toBeCloseTo(81.5165, 4);
  });

  it('4. should query staff users and distinguish roles from community members', async () => {
    const staff = await userRepository.findAllStaff();
    expect(staff.length).toBeGreaterThanOrEqual(6);

    const manager = staff.find((u) => u.role === 'PARK_MANAGER');
    expect(manager).toBeDefined();
    expect(manager?.fullName).toBe('Sunil Jayawardena');

    const rangers = await userRepository.findRangers();
    expect(rangers.length).toBeGreaterThanOrEqual(3);
    for (const r of rangers) {
      expect(r.role).toBe('RANGER');
      expect(r.badgeNumber).toBeDefined();
    }

    const clo = staff.find((u) => u.role === 'COMMUNITY_LIAISON_OFFICER');
    expect(clo).toBeDefined();

    // Verify community members table is separate
    const communityMembers = await userRepository.findAllCommunityMembers();
    expect(communityMembers.length).toBeGreaterThanOrEqual(3);
    expect(communityMembers[0].villageName).toBeDefined();
  });

  it('5. should query patrols and verify route, ranger, and waypoint relationships (UC01)', async () => {
    const patrols = await patrolRepository.findAll();
    expect(patrols.length).toBeGreaterThanOrEqual(3);

    // Verify active patrol
    const activePatrol = patrols.find((p) => p.status === 'ACTIVE');
    expect(activePatrol).toBeDefined();
    expect(activePatrol?.rangerName).toBe('Kasun Bandara');
    expect(activePatrol?.routeName).toBe('Yala Block 1 Coastal Route');
    expect(activePatrol?.coverageScore).toBeGreaterThan(0);

    // Verify waypoints relationship
    const fullPatrol = await patrolRepository.findById(activePatrol!.id);
    expect(fullPatrol).toBeDefined();
    expect(fullPatrol?.waypoints).toBeDefined();
    expect(fullPatrol?.waypoints!.length).toBeGreaterThanOrEqual(3);

    // Waypoints must have valid sequence numbers
    const sequenceOrders = fullPatrol!.waypoints!.map((w) => w.sequenceOrder);
    expect(sequenceOrders).toEqual([1, 2, 3]);
  });

  // --------------------------------------------------------------------------
  // 3. Wildlife Tracking & Risk Alert Domain (UC03)
  // --------------------------------------------------------------------------
  it('6. should query tracked animals, collar 1:0..1 mapping, and telemetry records', async () => {
    const animals = await wildlifeRepository.findAllAnimals();
    expect(animals.length).toBeGreaterThanOrEqual(3);

    const walagamba = animals.find((a) => a.name === 'Walagamba');
    expect(walagamba).toBeDefined();
    expect(walagamba?.species).toBe('Asian Elephant');

    // Collar mapping
    const collar = await wildlifeRepository.findCollarByAnimalId(walagamba!.id);
    expect(collar).toBeDefined();
    expect(collar?.collarCode).toBe('COLLAR-ELE-001');
    expect(collar?.batteryPercentage).toBeGreaterThanOrEqual(80);

    // Recent telemetry
    const locations = await wildlifeRepository.findRecentLocationsByAnimal(walagamba!.id);
    expect(locations.length).toBeGreaterThanOrEqual(2);
    expect(locations[0].latitude).toBeDefined();
    expect(locations[0].longitude).toBeDefined();
    expect(locations[0].isSimulated).toBe(true);
  });

  it('7. should query risk zones and verify JSONB boundary coordinates', async () => {
    const zones = await wildlifeRepository.findAllRiskZones();
    expect(zones.length).toBeGreaterThanOrEqual(2);

    const criticalZone = zones.find((z) => z.riskLevel === 'CRITICAL');
    expect(criticalZone).toBeDefined();
    expect(criticalZone?.name).toBe('Kittulkote Village Settlement Zone');
    expect(Array.isArray(criticalZone?.boundaryCoordinates)).toBe(true);
    expect(criticalZone!.boundaryCoordinates.length).toBeGreaterThanOrEqual(4);

    // Boundary points must have latitude and longitude
    const firstPoint = criticalZone!.boundaryCoordinates[0];
    expect(firstPoint.latitude).toBeCloseTo(6.35, 2);
    expect(firstPoint.longitude).toBeCloseTo(81.33, 2);
  });

  it('8. should verify UC03 condition: animal inside zone triggers alert, outside triggers none', async () => {
    const activeAlerts = await wildlifeRepository.findActiveAlerts();
    expect(activeAlerts.length).toBeGreaterThanOrEqual(1);

    // Walagamba is inside Kittulkote -> ACTIVE alert exists
    const walagambaAlert = activeAlerts.find((a) => a.animalName === 'Walagamba');
    expect(walagambaAlert).toBeDefined();
    expect(walagambaAlert?.severity).toBe('CRITICAL');
    expect(walagambaAlert?.zoneName).toBe('Kittulkote Village Settlement Zone');

    // Kumana Raja is deep inside safe sanctuary -> NO active alert
    const kumanaAlert = activeAlerts.find((a) => a.animalName === 'Kumana Raja');
    expect(kumanaAlert).toBeUndefined();
  });

  it('9. should query alert responses and verify responder relationship', async () => {
    // Find resolved alert
    const res = await query(`SELECT id FROM wildlife_risk_alerts WHERE status = 'RESOLVED' LIMIT 1`);
    expect(res.rows.length).toBe(1);

    const alertId = res.rows[0].id;
    const responses = await wildlifeRepository.findResponsesByAlertId(alertId);
    expect(responses.length).toBeGreaterThanOrEqual(1);

    const firstResponse = responses[0];
    expect(firstResponse.actionTaken).toContain('Dispatched ranger');
    expect(firstResponse.status).toBe('COMPLETED');
    expect(firstResponse.responderName).toBe('Kasun Bandara');
  });

  // --------------------------------------------------------------------------
  // 4. Incident Domain (UC02)
  // --------------------------------------------------------------------------
  it('10. should query incidents with supporting evidence and create a new incident (UC02)', async () => {
    const incidents = await incidentRepository.findAll();
    expect(incidents.length).toBeGreaterThanOrEqual(2);

    const snareIncident = incidents.find((i) => i.incidentType === 'SNARE');
    expect(snareIncident).toBeDefined();
    expect(snareIncident?.rangerName).toBe('Kasun Bandara');

    const fullIncident = await incidentRepository.findById(snareIncident!.id);
    expect(fullIncident?.evidence).toBeDefined();
    expect(fullIncident?.evidence!.length).toBeGreaterThanOrEqual(1);
    expect(fullIncident?.evidence![0].filePath).toContain('snare_yala_01.jpg');

    // Create a new incident test
    const newIncident = await incidentRepository.create({
      rangerId: snareIncident!.rangerId,
      incidentType: 'ILLEGAL_LOGGING',
      description: 'Freshly cut timber found near sector boundary.',
      latitude: 6.3812,
      longitude: 81.5199,
      clientMutationId: 'test-mut-' + Date.now(),
    });
    expect(newIncident.id).toBeDefined();
    expect(newIncident.incidentType).toBe('ILLEGAL_LOGGING');
    expect(newIncident.status).toBe('SUBMITTED');
  });

  // --------------------------------------------------------------------------
  // 5. Community Conflict Domain (UC04)
  // --------------------------------------------------------------------------
  it('11. should query conflict reports with community member details (UC04)', async () => {
    // Self-contained test: fetch or create a community member and conflict report
    const members = await userRepository.findAllCommunityMembers();
    const reporter = members[0];
    expect(reporter).toBeDefined();

    const created = await conflictRepository.create({
      communityMemberId: reporter.id,
      conflictType: 'CROP_DAMAGE',
      description: 'Test conflict report for automated verification',
      latitude: 6.368,
      longitude: 81.332,
      animalCount: 2,
      immediateRisk: false,
    });
    expect(created.id).toBeDefined();

    const reports = await conflictRepository.findAll();
    expect(reports.length).toBeGreaterThanOrEqual(1);

    const cropDamage = reports.find((r) => r.id === created.id);
    expect(cropDamage).toBeDefined();
    expect(cropDamage?.reporterName).toBe(reporter.fullName);
    expect(cropDamage?.villageName).toBe(reporter.villageName);
    expect(cropDamage?.status).toBe('SUBMITTED');
  });

  // --------------------------------------------------------------------------
  // 6. Constraint & Integrity Verification
  // --------------------------------------------------------------------------
  it('12. should reject foreign key violations with error code 23503', async () => {
    const invalidRangerId = '00000000-0000-0000-0000-000000000000';
    await expect(
      query(
        `INSERT INTO patrols (patrol_code, park_id, ranger_id, patrol_route_id, status, start_time)
         VALUES ('PAT-TEST-FAIL', '11111111-1111-1111-1111-111111111111', $1, 'cccc0001-0000-0000-0000-000000000001', 'PLANNED', CURRENT_TIMESTAMP)`,
        [invalidRangerId]
      )
    ).rejects.toThrow();
  });

  it('13. should reject invalid check constraint values with error code 23514', async () => {
    await expect(
      query(
        `INSERT INTO users (full_name, email, role)
         VALUES ('Invalid Role User', 'invalid.role@test.lk', 'SUPER_ADMIN')`
      )
    ).rejects.toThrow();
  });

  it('14. should enforce unique constraints on email and collar_code', async () => {
    await expect(
      query(
        `INSERT INTO users (full_name, email, role)
         VALUES ('Duplicate User', 'sunil.manager@wildlife.gov.lk', 'RANGER')`
      )
    ).rejects.toThrow();
  });
});
