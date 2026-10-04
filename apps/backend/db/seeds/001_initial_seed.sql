-- ============================================================================
-- SMART WILDLIFE CONSERVATION AND ANTI-POACHING SYSTEM
-- Seed Script 001: Comprehensive Development & Demonstration Dataset
-- Target: PostgreSQL 13+ (Neon Serverless PostgreSQL Compatible)
-- ============================================================================

-- Clean up existing data in reverse dependency order
TRUNCATE TABLE
    sync_operations,
    supporting_evidence,
    incidents,
    conflict_reports,
    alert_responses,
    wildlife_risk_alerts,
    location_records,
    tracking_collars,
    wildlife_animals,
    risk_zones,
    waypoints,
    patrols,
    patrol_routes,
    community_members,
    users,
    parks
CASCADE;

-- ============================================================================
-- 1. SEED PARKS
-- ============================================================================
INSERT INTO parks (id, name, code, latitude, longitude, area_sq_km, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Yala National Park', 'YALA', 6.3725000, 81.5165000, 978.80, 'Premier wildlife sanctuary in Southern Sri Lanka renowned for high leopard density and elephant corridors.'),
    ('22222222-2222-2222-2222-222222222222', 'Wilpattu National Park', 'WILPATTU', 8.4410000, 80.0125000, 1317.00, 'Largest national park in Sri Lanka characterized by natural sand-rimmed water basins (villus).'),
    ('33333333-3333-3333-3333-333333333333', 'Udawalawe National Park', 'UDAWALAWE', 6.4740000, 80.8985000, 308.20, 'Crucial elephant habitat on the boundary of Sabaragamuwa and Uva Provinces.');

-- ============================================================================
-- 2. SEED USERS (Staff: Park Manager, Rangers, Community Liaison Officers)
-- ============================================================================
INSERT INTO users (id, full_name, email, phone_number, role, badge_number, park_id, is_active)
VALUES
    -- 1 Park Manager
    ('aaaa0001-0000-0000-0000-000000000001', 'Sunil Jayawardena', 'sunil.manager@wildlife.gov.lk', '+94771122334', 'PARK_MANAGER', 'PM-001', '11111111-1111-1111-1111-111111111111', TRUE),
    
    -- 3 Field Rangers
    ('aaaa0002-0000-0000-0000-000000000002', 'Kasun Bandara', 'kasun.ranger@wildlife.gov.lk', '+94772233445', 'RANGER', 'RN-101', '11111111-1111-1111-1111-111111111111', TRUE),
    ('aaaa0003-0000-0000-0000-000000000003', 'Nimal Perera', 'nimal.ranger@wildlife.gov.lk', '+94773344556', 'RANGER', 'RN-102', '11111111-1111-1111-1111-111111111111', TRUE),
    ('aaaa0004-0000-0000-0000-000000000004', 'Chaminda Silva', 'chaminda.ranger@wildlife.gov.lk', '+94774455667', 'RANGER', 'RN-103', '22222222-2222-2222-2222-222222222222', TRUE),
    
    -- 2 Community Liaison Officers
    ('aaaa0005-0000-0000-0000-000000000005', 'Anura Wickramasinghe', 'anura.clo@wildlife.gov.lk', '+94775566778', 'COMMUNITY_LIAISON_OFFICER', 'CLO-201', '11111111-1111-1111-1111-111111111111', TRUE),
    ('aaaa0006-0000-0000-0000-000000000006', 'Priyantha Kumara', 'priyantha.clo@wildlife.gov.lk', '+94776677889', 'COMMUNITY_LIAISON_OFFICER', 'CLO-202', '33333333-3333-3333-3333-333333333333', TRUE);

-- ============================================================================
-- 3. SEED COMMUNITY MEMBERS (External local community reporters)
-- ============================================================================
INSERT INTO community_members (id, full_name, national_id, phone_number, village_name, address, park_id)
VALUES
    ('bbbb0001-0000-0000-0000-000000000001', 'Gamini Senanayake', '197512345678', '+94711112233', 'Palatupana', 'Post Office Road, Palatupana, Yala', '11111111-1111-1111-1111-111111111111'),
    ('bbbb0002-0000-0000-0000-000000000002', 'Kamal Gunaratne', '198223456789', '+94712223344', 'Kataragama Boundary', 'Farm Plot 14, Kataragama Outer Ring', '11111111-1111-1111-1111-111111111111'),
    ('bbbb0003-0000-0000-0000-000000000003', 'Sarath Dissanayake', '196934567890', '+94713334455', 'Kittulkote', 'Main Canal Road, Kittulkote Village', '11111111-1111-1111-1111-111111111111');

-- ============================================================================
-- 4. SEED PATROL ROUTES
-- ============================================================================
INSERT INTO patrol_routes (id, park_id, name, code, description, estimated_duration_minutes, route_type)
VALUES
    ('cccc0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Yala Block 1 Coastal Route', 'YALA-RT-01', 'Coastal patrol monitoring turtle nesting beaches and fisheries buffer zone.', 240, 'FOOT_PATROL'),
    ('cccc0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Yala Northern Buffer Corridor', 'YALA-RT-02', 'High-risk boundary route bordering agricultural lands and fence lines.', 180, 'VEHICLE_PATROL'),
    ('cccc0003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Wilpattu West Villu Route', 'WIL-RT-01', 'Deep forest route covering interior villus vulnerable to illegal camping.', 300, 'FOOT_PATROL');

-- ============================================================================
-- 5. SEED PATROLS (UC01: 1 ACTIVE, 1 COMPLETED, 1 PLANNED)
-- ============================================================================
INSERT INTO patrols (id, patrol_code, park_id, ranger_id, patrol_route_id, status, start_time, end_time, coverage_score, notes)
VALUES
    -- 1 ACTIVE patrol (Ranger Kasun Bandara)
    ('dddd0001-0000-0000-0000-000000000001', 'PAT-2026-YAL-001', '11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000002', 'cccc0001-0000-0000-0000-000000000001', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes', NULL, 65.50, 'Regular coastal perimeter sweep. Weather fair, radio check clear.'),
    
    -- 1 COMPLETED patrol (Ranger Nimal Perera)
    ('dddd0002-0000-0000-0000-000000000002', 'PAT-2026-YAL-002', '11111111-1111-1111-1111-111111111111', 'aaaa0003-0000-0000-0000-000000000003', 'cccc0002-0000-0000-0000-000000000002', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '1 day 4 hours', CURRENT_TIMESTAMP - INTERVAL '1 day', 92.00, 'Northern corridor fully inspected. Fence repairs required at Post 8.'),
    
    -- 1 PLANNED patrol (Ranger Chaminda Silva)
    ('dddd0003-0000-0000-0000-000000000003', 'PAT-2026-WIL-001', '22222222-2222-2222-2222-222222222222', 'aaaa0004-0000-0000-0000-000000000004', 'cccc0003-0000-0000-0000-000000000003', 'PLANNED', CURRENT_TIMESTAMP + INTERVAL '12 hours', NULL, 0.00, 'Scheduled anti-poaching villu inspection sweep.');

-- ============================================================================
-- 6. SEED WAYPOINTS
-- ============================================================================
INSERT INTO waypoints (id, patrol_id, patrol_route_id, latitude, longitude, sequence_order, location_type, recorded_at, notes)
VALUES
    -- Route checkpoints for Route 1
    ('eeee0001-0000-0000-0000-000000000001', NULL, 'cccc0001-0000-0000-0000-000000000001', 6.3725000, 81.5165000, 1, 'GPS', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Palatupana Base Gate Entry'),
    ('eeee0002-0000-0000-0000-000000000002', NULL, 'cccc0001-0000-0000-0000-000000000001', 6.3780000, 81.5230000, 2, 'GPS', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Patangala Sand Dune Checkpoint'),
    ('eeee0003-0000-0000-0000-000000000003', NULL, 'cccc0001-0000-0000-0000-000000000001', 6.3850000, 81.5300000, 3, 'GPS', CURRENT_TIMESTAMP - INTERVAL '2 days', 'Menik Ganga Estuary Point'),
    
    -- Live breadcrumbs for Active Patrol (PAT-2026-YAL-001)
    ('eeee0004-0000-0000-0000-000000000004', 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', 6.3725000, 81.5165000, 1, 'GPS', CURRENT_TIMESTAMP - INTERVAL '90 minutes', 'Departure logged'),
    ('eeee0005-0000-0000-0000-000000000005', 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', 6.3752000, 81.5195000, 2, 'GPS', CURRENT_TIMESTAMP - INTERVAL '45 minutes', 'Passing coastal rock formation'),
    ('eeee0006-0000-0000-0000-000000000006', 'dddd0001-0000-0000-0000-000000000001', 'cccc0001-0000-0000-0000-000000000001', 6.3780000, 81.5230000, 3, 'GPS', CURRENT_TIMESTAMP - INTERVAL '5 minutes', 'Reached Patangala Dune checkpoint');

-- ============================================================================
-- 7. SEED WILDLIFE ANIMALS
-- ============================================================================
INSERT INTO wildlife_animals (id, name, species, gender, identification_tag, health_status, notes)
VALUES
    ('ffff0001-0000-0000-0000-000000000001', 'Walagamba', 'Asian Elephant', 'MALE', 'ELE-YAL-001', 'HEALTHY', 'Adult tusker known to traverse agricultural buffer boundaries.'),
    ('ffff0002-0000-0000-0000-000000000002', 'Kumana Raja', 'Asian Elephant', 'MALE', 'ELE-YAL-002', 'HEALTHY', 'Dominant bull frequenting central reserve waterholes.'),
    ('ffff0003-0000-0000-0000-000000000003', 'Kulu', 'Sri Lankan Leopard', 'MALE', 'LEP-WIL-001', 'HEALTHY', 'Radio-tagged leopard in Wilpattu dense forest.');

-- ============================================================================
-- 8. SEED TRACKING COLLARS (1:0..1 attached to animals)
-- ============================================================================
INSERT INTO tracking_collars (id, animal_id, collar_code, model, battery_percentage, is_active, last_transmission_at)
VALUES
    ('10100001-0000-0000-0000-000000000001', 'ffff0001-0000-0000-0000-000000000001', 'COLLAR-ELE-001', 'WildlifeTracker-SolarPro', 88, TRUE, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
    ('10100002-0000-0000-0000-000000000002', 'ffff0002-0000-0000-0000-000000000002', 'COLLAR-ELE-002', 'WildlifeTracker-SolarPro', 95, TRUE, CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
    ('10100003-0000-0000-0000-000000000003', 'ffff0003-0000-0000-0000-000000000003', 'COLLAR-LEP-001', 'VHF-BioPulse-Lite', 72, TRUE, CURRENT_TIMESTAMP - INTERVAL '1 hour');

-- ============================================================================
-- 9. SEED RISK ZONES (HIGH and CRITICAL zones with JSONB boundary polygons)
-- ============================================================================
INSERT INTO risk_zones (id, park_id, name, zone_type, risk_level, boundary_coordinates, description, is_active)
VALUES
    -- CRITICAL Risk Zone: Kittulkote Village Settlement Zone
    ('20200001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Kittulkote Village Settlement Zone', 'VILLAGE_SETTLEMENT', 'CRITICAL',
    '[
        {"latitude": 6.3500, "longitude": 81.3300},
        {"latitude": 6.3600, "longitude": 81.3300},
        {"latitude": 6.3600, "longitude": 81.3400},
        {"latitude": 6.3500, "longitude": 81.3400}
    ]'::jsonb,
    'High density human settlement with primary school and unprotected homesteads. Severe conflict risk.', TRUE),

    -- HIGH Risk Zone: Kataragama Agricultural Buffer Zone
    ('20200002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Kataragama Agricultural Buffer Zone', 'AGRICULTURAL_BUFFER', 'HIGH',
    '[
        {"latitude": 6.4100, "longitude": 81.3300},
        {"latitude": 6.4250, "longitude": 81.3300},
        {"latitude": 6.4250, "longitude": 81.3500},
        {"latitude": 6.4100, "longitude": 81.3500}
    ]'::jsonb,
    'Sugar cane and paddy crop fields adjoining southern forest boundary. Seasonal crop raiding area.', TRUE);

-- ============================================================================
-- 10. SEED LOCATION RECORDS (Simulated GPS collar data)
-- IMPORTANT FOR UC03:
-- 1. Elephant "Kumana Raja" is OUTSIDE all risk zones -> NO alert.
-- 2. Elephant "Walagamba" is INSIDE "Kittulkote Village Settlement Zone" -> Triggers Alert!
-- ============================================================================
INSERT INTO location_records (id, animal_id, collar_id, latitude, longitude, recorded_at, is_simulated)
VALUES
    -- Record 1: Kumana Raja - Deep safe interior of Yala (lat: 6.3750, lon: 81.5200) -> OUTSIDE risk zones (No Alert)
    ('30300001-0000-0000-0000-000000000001', 'ffff0002-0000-0000-0000-000000000002', '10100002-0000-0000-0000-000000000002', 6.3750000, 81.5200000, CURRENT_TIMESTAMP - INTERVAL '20 minutes', TRUE),

    -- Record 2: Walagamba - INSIDE Kittulkote Village Settlement Zone (lat: 6.3550, lon: 81.3350) -> IN HIGH RISK ZONE!
    ('30300002-0000-0000-0000-000000000002', 'ffff0001-0000-0000-0000-000000000001', '10100001-0000-0000-0000-000000000001', 6.3550000, 81.3350000, CURRENT_TIMESTAMP - INTERVAL '10 minutes', TRUE),

    -- Record 3: Walagamba - Earlier location breaching Kataragama buffer boundary yesterday
    ('30300003-0000-0000-0000-000000000003', 'ffff0001-0000-0000-0000-000000000001', '10100001-0000-0000-0000-000000000001', 6.4150000, 81.3380000, CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE);

-- ============================================================================
-- 11. SEED WILDLIFE RISK ALERTS (UC03: 1 ACTIVE alert, 1 RESOLVED alert)
-- ============================================================================
INSERT INTO wildlife_risk_alerts (id, animal_id, risk_zone_id, location_record_id, severity, status, generated_at, notes)
VALUES
    -- ACTIVE Alert for Walagamba entering Kittulkote
    ('40400001-0000-0000-0000-000000000001', 'ffff0001-0000-0000-0000-000000000001', '20200001-0000-0000-0000-000000000001', '30300002-0000-0000-0000-000000000002', 'CRITICAL', 'ACTIVE', CURRENT_TIMESTAMP - INTERVAL '9 minutes', 'Breach detected: Walagamba within 200m of residential houses in Kittulkote.'),
    
    -- RESOLVED Alert from yesterday
    ('40400002-0000-0000-0000-000000000002', 'ffff0001-0000-0000-0000-000000000001', '20200002-0000-0000-0000-000000000002', '30300003-0000-0000-0000-000000000003', 'HIGH', 'RESOLVED', CURRENT_TIMESTAMP - INTERVAL '24 hours', 'Animal entered sugarcane plot. Driven back into park boundary safely.');

-- ============================================================================
-- 12. SEED ALERT RESPONSES (UC03: Operational response by Ranger/CLO)
-- ============================================================================
INSERT INTO alert_responses (id, alert_id, responder_id, action_taken, status, responded_at, notes)
VALUES
    ('50500001-0000-0000-0000-000000000001', '40400002-0000-0000-0000-000000000002', 'aaaa0002-0000-0000-0000-000000000002', 'Dispatched ranger quick response vehicle with thunder flashes. Safely escorted herd 3km back towards sanctuary core.', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '23 hours 30 minutes', 'Zero human casualty, no crop damage reported.');

-- ============================================================================
-- 13. SEED INCIDENTS (UC02: Poaching & Field incidents)
-- ============================================================================
INSERT INTO incidents (id, ranger_id, patrol_id, incident_type, description, latitude, longitude, status, reported_at, client_mutation_id)
VALUES
    ('60600001-0000-0000-0000-000000000001', 'aaaa0002-0000-0000-0000-000000000002', 'dddd0001-0000-0000-0000-000000000001', 'SNARE', 'Discovered active steel wire snare cable set on game trail leading to waterhole. Neutralized immediately.', 6.3765000, 81.5210000, 'SUBMITTED', CURRENT_TIMESTAMP - INTERVAL '35 minutes', 'mut-inc-001'),
    ('60600002-0000-0000-0000-000000000002', 'aaaa0004-0000-0000-0000-000000000004', NULL, 'ILLEGAL_CAMPSITE', 'Abandoned poacher encampment with campfire ashes and dried deer meat remnants.', 8.4350000, 80.0210000, 'REVIEWED', CURRENT_TIMESTAMP - INTERVAL '3 days', 'mut-inc-002');

-- ============================================================================
-- 14. SEED SUPPORTING EVIDENCE
-- ============================================================================
INSERT INTO supporting_evidence (id, incident_id, evidence_type, file_path, file_name, file_type, captured_at, notes)
VALUES
    ('70700001-0000-0000-0000-000000000001', '60600001-0000-0000-0000-000000000001', 'PHOTO', '/uploads/evidence/snare_yala_01.jpg', 'snare_yala_01.jpg', 'image/jpeg', CURRENT_TIMESTAMP - INTERVAL '35 minutes', 'Close-up photograph of wire snare attached to tree trunk.'),
    ('70700002-0000-0000-0000-000000000002', '60600002-0000-0000-0000-000000000002', 'PHOTO', '/uploads/evidence/camp_wilpattu_01.jpg', 'camp_wilpattu_01.jpg', 'image/jpeg', CURRENT_TIMESTAMP - INTERVAL '3 days', 'Photograph of improvised shelter and campfire.');

-- ============================================================================
-- 15. SEED CONFLICT REPORTS (UC04: Community reported human-wildlife conflicts)
-- ============================================================================
INSERT INTO conflict_reports (id, community_member_id, park_id, conflict_type, description, latitude, longitude, status, reported_at, client_mutation_id)
VALUES
    ('80800001-0000-0000-0000-000000000001', 'bbbb0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'CROP_DAMAGE', 'Lone bull elephant entered banana plantation overnight. Damaged perimeter fence and approximately 40 trees.', 6.3680000, 81.3320000, 'UNDER_REVIEW', CURRENT_TIMESTAMP - INTERVAL '5 hours', 'mut-cnf-001'),
    ('80800002-0000-0000-0000-000000000002', 'bbbb0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'ANIMAL_INTRUSION', 'Elephant herd spotted near village irrigation tank at dusk. Community requesting ranger patrol presence.', 6.4180000, 81.3410000, 'RESPONDING', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'mut-cnf-002');

-- ============================================================================
-- 16. SEED SYNC OPERATIONS (Offline audit record)
-- ============================================================================
INSERT INTO sync_operations (id, client_mutation_id, operation_type, entity_type, entity_id, payload, status, synchronized_at)
VALUES
    ('90900001-0000-0000-0000-000000000001', 'mut-inc-001', 'CREATE_INCIDENT', 'INCIDENT', '60600001-0000-0000-0000-000000000001',
    '{"incident_type": "SNARE", "latitude": 6.3765, "longitude": 81.521, "description": "Discovered active steel wire snare cable"}'::jsonb,
    'SYNCHRONIZED', CURRENT_TIMESTAMP - INTERVAL '30 minutes');
