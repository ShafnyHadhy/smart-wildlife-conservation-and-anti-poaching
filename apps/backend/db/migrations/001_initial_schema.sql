-- ============================================================================
-- SMART WILDLIFE CONSERVATION AND ANTI-POACHING SYSTEM
-- Migration 001: Initial Relational Database Schema
-- Target: PostgreSQL 13+ (Neon Serverless PostgreSQL Compatible)
-- ============================================================================

-- Ensure pgcrypto or native gen_random_uuid() is accessible
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PARKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS parks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    area_sq_km NUMERIC(8, 2),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. USERS (Single table for staff roles: PARK_MANAGER, RANGER, COMMUNITY_LIAISON_OFFICER)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(30),
    role VARCHAR(30) NOT NULL CHECK (role IN ('PARK_MANAGER', 'RANGER', 'COMMUNITY_LIAISON_OFFICER')),
    badge_number VARCHAR(50) UNIQUE,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. COMMUNITY MEMBERS (External reporting users, distinct from staff users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    national_id VARCHAR(50) UNIQUE,
    phone_number VARCHAR(30) NOT NULL,
    village_name VARCHAR(100) NOT NULL,
    address TEXT,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. PATROL ROUTES (Assigned within parks, contains waypoints, used by patrols)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patrol_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    estimated_duration_minutes INT DEFAULT 180,
    route_type VARCHAR(50) DEFAULT 'STANDARD_FOOT_PATROL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_park_route_code UNIQUE (park_id, code)
);

-- ============================================================================
-- 5. PATROLS (UC01: Specific patrol execution assigned to a Ranger on a Route)
-- ============================================================================
CREATE TABLE IF NOT EXISTS patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_code VARCHAR(50) NOT NULL UNIQUE,
    park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
    ranger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    patrol_route_id UUID NOT NULL REFERENCES patrol_routes(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    coverage_score NUMERIC(5, 2) DEFAULT 0.00 CHECK (coverage_score BETWEEN 0.00 AND 100.00),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. WAYPOINTS (Route checkpoints and actual breadcrumb trail points of patrols)
-- ============================================================================
CREATE TABLE IF NOT EXISTS waypoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patrol_id UUID REFERENCES patrols(id) ON DELETE CASCADE,
    patrol_route_id UUID REFERENCES patrol_routes(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    sequence_order INT NOT NULL,
    location_type VARCHAR(20) NOT NULL DEFAULT 'GPS' CHECK (location_type IN ('GPS', 'MANUAL')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    CONSTRAINT chk_waypoint_parent CHECK (patrol_id IS NOT NULL OR patrol_route_id IS NOT NULL)
);

-- ============================================================================
-- 7. WILDLIFE ANIMALS (Tracked elephants, leopards, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wildlife_animals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'UNKNOWN')),
    identification_tag VARCHAR(50) UNIQUE NOT NULL,
    health_status VARCHAR(50) DEFAULT 'HEALTHY',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. TRACKING COLLARS (1:0..1 relationship with WildlifeAnimal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracking_collars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID UNIQUE REFERENCES wildlife_animals(id) ON DELETE SET NULL,
    collar_code VARCHAR(50) NOT NULL UNIQUE,
    model VARCHAR(100) DEFAULT 'GPS-COLLAR-V2',
    battery_percentage INT NOT NULL DEFAULT 100 CHECK (battery_percentage BETWEEN 0 AND 100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_transmission_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. LOCATION RECORDS (Simulated collar GPS telemetry transmissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES wildlife_animals(id) ON DELETE CASCADE,
    collar_id UUID REFERENCES tracking_collars(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. RISK ZONES (Configured high-risk agricultural/settlement boundary polygons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50) NOT NULL,
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    boundary_coordinates JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. WILDLIFE RISK ALERTS (UC03: Triggered when animal telemetry breaches risk zone)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wildlife_risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    animal_id UUID NOT NULL REFERENCES wildlife_animals(id) ON DELETE CASCADE,
    risk_zone_id UUID NOT NULL REFERENCES risk_zones(id) ON DELETE CASCADE,
    location_record_id UUID REFERENCES location_records(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. ALERT RESPONSES (Operational field response recorded by Ranger or CLO)
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES wildlife_risk_alerts(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_taken TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED')),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. INCIDENTS (UC02: Poaching/Wildlife incidents recorded by Rangers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ranger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    patrol_id UUID REFERENCES patrols(id) ON DELETE SET NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (
        incident_type IN (
            'SNARE',
            'CARCASS',
            'ILLEGAL_CAMPSITE',
            'FOOTPRINT',
            'POACHING_ACTIVITY',
            'ILLEGAL_LOGGING',
            'OTHER'
        )
    ),
    description TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('PENDING', 'SUBMITTED', 'REVIEWED', 'CLOSED')),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_mutation_id VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 14. SUPPORTING EVIDENCE (Photos/media attached to incident reports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS supporting_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'PHOTO',
    file_path TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 15. CONFLICT REPORTS (UC04: Human-Wildlife conflicts reported by Community Members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conflict_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE RESTRICT,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    conflict_type VARCHAR(50) NOT NULL CHECK (
        conflict_type IN (
            'ELEPHANT_HUMAN_CONFLICT',
            'CROP_DAMAGE',
            'ANIMAL_INTRUSION',
            'LIVESTOCK_ATTACK',
            'PROPERTY_DAMAGE',
            'OTHER'
        )
    ),
    description TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN ('SUBMITTED', 'UNDER_REVIEW', 'RESPONDING', 'RESOLVED', 'CLOSED')
    ),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_mutation_id VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 16. SYNC OPERATIONS (Idempotent server-side audit of offline mutations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_mutation_id VARCHAR(64) NOT NULL UNIQUE,
    operation_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCHRONIZED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    synchronized_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES FOR FREQUENT QUERY ACCESS PATTERNS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_park_id ON users(park_id);

CREATE INDEX IF NOT EXISTS idx_patrol_routes_park_id ON patrol_routes(park_id);

CREATE INDEX IF NOT EXISTS idx_patrols_park_id ON patrols(park_id);
CREATE INDEX IF NOT EXISTS idx_patrols_ranger_id ON patrols(ranger_id);
CREATE INDEX IF NOT EXISTS idx_patrols_status ON patrols(status);
CREATE INDEX IF NOT EXISTS idx_patrols_start_time ON patrols(start_time);

CREATE INDEX IF NOT EXISTS idx_waypoints_patrol_id ON waypoints(patrol_id);
CREATE INDEX IF NOT EXISTS idx_waypoints_patrol_route_id ON waypoints(patrol_route_id);
CREATE INDEX IF NOT EXISTS idx_waypoints_sequence ON waypoints(patrol_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_location_records_animal_id ON location_records(animal_id);
CREATE INDEX IF NOT EXISTS idx_location_records_recorded_at ON location_records(recorded_at);

CREATE INDEX IF NOT EXISTS idx_risk_zones_park_id ON risk_zones(park_id);
CREATE INDEX IF NOT EXISTS idx_risk_zones_risk_level ON risk_zones(risk_level);

CREATE INDEX IF NOT EXISTS idx_wildlife_risk_alerts_animal_id ON wildlife_risk_alerts(animal_id);
CREATE INDEX IF NOT EXISTS idx_wildlife_risk_alerts_status ON wildlife_risk_alerts(status);
CREATE INDEX IF NOT EXISTS idx_wildlife_risk_alerts_generated_at ON wildlife_risk_alerts(generated_at);

CREATE INDEX IF NOT EXISTS idx_alert_responses_alert_id ON alert_responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_responses_responder_id ON alert_responses(responder_id);

CREATE INDEX IF NOT EXISTS idx_incidents_ranger_id ON incidents(ranger_id);
CREATE INDEX IF NOT EXISTS idx_incidents_patrol_id ON incidents(patrol_id);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);

CREATE INDEX IF NOT EXISTS idx_supporting_evidence_incident_id ON supporting_evidence(incident_id);

CREATE INDEX IF NOT EXISTS idx_conflict_reports_community_member_id ON conflict_reports(community_member_id);
CREATE INDEX IF NOT EXISTS idx_conflict_reports_park_id ON conflict_reports(park_id);
CREATE INDEX IF NOT EXISTS idx_conflict_reports_status ON conflict_reports(status);
CREATE INDEX IF NOT EXISTS idx_conflict_reports_reported_at ON conflict_reports(reported_at);

CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);
