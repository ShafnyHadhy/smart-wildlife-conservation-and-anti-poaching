# Database Design & Schema Specification
## Smart Wildlife Conservation and Anti-Poaching Monitoring System

- **Document Version:** 2.0.0
- **Phase:** Phase 2 — Database & Shared Domain Model
- **Database Engine:** PostgreSQL 16+ (Hosted on Neon Serverless Cloud)
- **Status:** Implemented & Verified

---

## 1. Database Architecture

The data architecture leverages a serverless cloud PostgreSQL instance hosted on Neon, accessed via a resilient, thread-safe connection pool using `node-postgres` (`pg`).

```
┌─────────────────────────────────────────────────────────────┐
│                       Express Backend                       │
│  (Controllers ──► Services ──► Repositories)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Parameterized SQL over TLS/SSL
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Neon Serverless PostgreSQL Database             │
│  ├── 16 Relational Tables (UUID PKs, Foreign Keys, Checks)  │
│  ├── Performance B-Tree Indexes                             │
│  └── JSONB Spatial Boundary Storage                         │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles
1. **Connection Pooling:** Centralized singleton connection pool (`apps/backend/src/config/database.ts`) with SSL termination (`rejectUnauthorized: false`) optimized for Neon cloud infrastructure.
2. **Reproducible SQL Migrations:** Pure SQL DDL migrations (`apps/backend/db/migrations/001_initial_schema.sql`) executed sequentially without external ORM dependencies, guaranteeing deterministic execution on clean databases.
3. **Universally Unique Identifiers (UUID v4):** Primary keys use `UUID` generated via `gen_random_uuid()`. This prevents sequence prediction, enables offline mobile client-side ID pre-generation, and avoids ID collisions during batch synchronization.
4. **Data Integrity & Invariants:** Enforced at the relational layer using foreign keys (`ON DELETE CASCADE` or `RESTRICT` as appropriate), `NOT NULL` constraints, unique indexes, and `CHECK` constraints.
5. **Precision Timestamps & Coordinates:** All timestamps use `TIMESTAMP WITH TIME ZONE` (`timestamptz`). Geographic positions use `NUMERIC(10, 7)`, providing sub-centimeter ground precision without binary GIS dependencies.

---

## 2. Table Catalog

The Phase 2 schema comprises exactly 16 relational tables organized by domain:

| # | Table Name | Domain | Primary Purpose |
|---|---|---|---|
| 1 | `parks` | Park & Patrol | Protected wildlife conservation areas (e.g., Yala, Wilpattu) |
| 2 | `users` | Core Staff | Internal staff accounts (Park Managers, Rangers, CLOs) |
| 3 | `community_members` | Community | External rural community reporters living in buffer zones |
| 4 | `patrol_routes` | Park & Patrol | Pre-approved, designated patrol route corridors within parks |
| 5 | `patrols` | Park & Patrol | Operational field patrol missions undertaken by rangers |
| 6 | `waypoints` | Park & Patrol | Chronological GPS location points along a patrol track |
| 7 | `wildlife_animals` | Wildlife Tracking | Individual tracked animals (Asian Elephants, Leopards) |
| 8 | `tracking_collars` | Wildlife Tracking | Physical GPS tracking collars attached to monitored animals |
| 9 | `location_records` | Wildlife Tracking | Time-series GPS telemetry pings transmitted by collars |
| 10 | `risk_zones` | Risk & Alerts | High-risk geofence areas (villages, crop fields, roads) |
| 11 | `wildlife_risk_alerts`| Risk & Alerts | Automated alerts generated when an animal enters a risk zone |
| 12 | `alert_responses` | Risk & Alerts | Mitigation responses deployed by rangers or CLOs for an alert |
| 13 | `incidents` | Incident Reporting | Poaching, snares, carcasses, and illegal activities logged |
| 14 | `supporting_evidence`| Incident Reporting | Photographic or file evidence attached to incidents |
| 15 | `conflict_reports` | Community Conflict | Human-wildlife conflict incidents reported by villagers/CLOs |
| 16 | `sync_operations` | Offline Sync | Audit log of mobile offline operations replayed to server |

---

## 3. Detailed Table Specifications & Columns

### 3.1 `parks`
Represents protected national parks, nature reserves, or sanctuaries.
- `id` (UUID, PK): Unique park identifier (`DEFAULT gen_random_uuid()`).
- `name` (VARCHAR(150), NOT NULL, UNIQUE): Official name (e.g., "Yala National Park").
- `code` (VARCHAR(20), NOT NULL, UNIQUE): Uppercase identifier code (e.g., "YALA", "WILP").
- `province` (VARCHAR(100), NOT NULL): Sri Lankan administrative province.
- `center_latitude` (NUMERIC(10, 7), NOT NULL): Map viewport center.
- `center_longitude` (NUMERIC(10, 7), NOT NULL): Map viewport center.
- `area_sq_km` (NUMERIC(10, 2)): Total park area in square kilometers.
- `boundary_coordinates` (JSONB): Optional polygon perimeter coordinates.
- `is_active` (BOOLEAN, DEFAULT TRUE): Operational status.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.2 `users`
Unified table for internal conservation staff.
- `id` (UUID, PK): Staff member identifier.
- `username` (VARCHAR(50), NOT NULL, UNIQUE): System login handle.
- `email` (VARCHAR(100), NOT NULL, UNIQUE): Staff email address.
- `full_name` (VARCHAR(150), NOT NULL): Human-readable name.
- `role` (VARCHAR(30), NOT NULL): `CHECK (role IN ('PARK_MANAGER', 'RANGER', 'COMMUNITY_LIAISON_OFFICER'))`.
- `phone_number` (VARCHAR(30)): Contact telephone number.
- `call_sign` (VARCHAR(50)): VHF radio call sign for field rangers (e.g., "Ranger-Alpha-1").
- `park_id` (UUID, FK -> `parks.id` ON DELETE SET NULL): Assigned duty station.
- `is_active` (BOOLEAN, DEFAULT TRUE): Account status.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

> **Architectural Decision:** Per project specifications, staff roles share a single `users` table with a `role` discriminator. `WildlifeRanger` and `RangerSupervisor` are eliminated; Park Manager handles supervision directly.

### 3.3 `community_members`
External rural community reporters living in buffer zones adjacent to national parks.
- `id` (UUID, PK): Citizen profile identifier.
- `full_name` (VARCHAR(150), NOT NULL): Community member name.
- `phone_number` (VARCHAR(30), NOT NULL): Primary contact for verification.
- `nic_number` (VARCHAR(20), UNIQUE): Sri Lankan National Identity Card (fictional/masked in demo).
- `village_name` (VARCHAR(150), NOT NULL): Village/settlement name.
- `gn_division` (VARCHAR(100)): Grama Niladhari division.
- `park_id` (UUID, FK -> `parks.id` ON DELETE SET NULL): Nearest national park.
- `is_verified` (BOOLEAN, DEFAULT FALSE): Liaison officer verification status.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

> **Architectural Decision:** `CommunityMember` is intentionally decoupled from `users` because villagers are external citizens without staff privileges, system credentials, or duty station requirements.

### 3.4 `patrol_routes`
Pre-planned or standard survey routes mapped across park sectors.
- `id` (UUID, PK): Route identifier.
- `park_id` (UUID, NOT NULL, FK -> `parks.id` ON DELETE CASCADE): Parent park.
- `route_name` (VARCHAR(150), NOT NULL): Descriptive route title.
- `route_code` (VARCHAR(30), NOT NULL, UNIQUE): Unique identifier code (e.g., "YALA-RT-01").
- `description` (TEXT): Sector description and terrain notes.
- `estimated_duration_hours` (NUMERIC(5, 2)): Estimated completion time.
- `distance_km` (NUMERIC(6, 2)): Length in kilometers.
- `planned_waypoints` (JSONB): Ordered array of planned coordinate checkpoints.
- `is_active` (BOOLEAN, DEFAULT TRUE): Availability for assignment.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.5 `patrols`
Operational patrol missions undertaken by rangers.
- `id` (UUID, PK): Patrol session identifier.
- `patrol_code` (VARCHAR(50), NOT NULL, UNIQUE): Mission code (e.g., "PAT-2026-YALA-001").
- `park_id` (UUID, NOT NULL, FK -> `parks.id` ON DELETE RESTRICT): Park location.
- `ranger_id` (UUID, NOT NULL, FK -> `users.id` ON DELETE RESTRICT): Lead ranger.
- `patrol_route_id` (UUID, NOT NULL, FK -> `patrol_routes.id` ON DELETE RESTRICT): Assigned route.
- `status` (VARCHAR(20), NOT NULL): `CHECK (status IN ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'))`.
- `start_time` (TIMESTAMPTZ, NOT NULL): Actual or planned commencement.
- `end_time` (TIMESTAMPTZ): Mission conclusion timestamp.
- `notes` (TEXT): Field observations and mission briefing.
- `coverage_distance_km` (NUMERIC(6, 2), DEFAULT 0.00): Accumulated patrol distance.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.6 `waypoints`
Individual breadcrumb GPS points and field observations recorded during a patrol.
- `id` (UUID, PK): Waypoint identifier.
- `patrol_id` (UUID, NOT NULL, FK -> `patrols.id` ON DELETE CASCADE): Parent patrol.
- `sequence_order` (INTEGER, NOT NULL): Chronological index along the patrol track.
- `latitude` (NUMERIC(10, 7), NOT NULL): Coordinate latitude.
- `longitude` (NUMERIC(10, 7), NOT NULL): Coordinate longitude.
- `location_type` (VARCHAR(20), DEFAULT 'GPS_FIX'): `CHECK (location_type IN ('GPS_FIX', 'MANUAL_ENTRY', 'OBSERVATION', 'CHECKPOINT'))`.
- `remarks` (TEXT): Ranger observations at this coordinate.
- `recorded_at` (TIMESTAMPTZ, NOT NULL): Device recording timestamp.
- `created_at` (TIMESTAMPTZ, NOT NULL).

### 3.7 `wildlife_animals`
Tracked individual animals of conservation concern.
- `id` (UUID, PK): Animal identifier.
- `identifier_tag` (VARCHAR(50), NOT NULL, UNIQUE): Unique conservation tag (e.g., "ELE-YALA-001").
- `common_name` (VARCHAR(100), NOT NULL): Species common name (e.g., "Sri Lankan Elephant").
- `scientific_name` (VARCHAR(150)): Binomial nomenclature (*Elephas maximus maximus*).
- `nickname` (VARCHAR(100)): Field nickname (e.g., "Walagamba", "Kumana Raja").
- `gender` (VARCHAR(10)): `CHECK (gender IN ('MALE', 'FEMALE', 'UNKNOWN'))`.
- `estimated_age_years` (INTEGER): Estimated age.
- `park_id` (UUID, NOT NULL, FK -> `parks.id` ON DELETE RESTRICT): Primary home range.
- `status` (VARCHAR(30), DEFAULT 'MONITORED'): Health and monitoring status.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.8 `tracking_collars`
Physical or simulated GPS telemetry collars.
- `id` (UUID, PK): Collar asset identifier.
- `device_serial_number` (VARCHAR(100), NOT NULL, UNIQUE): Hardware serial number.
- `collar_model` (VARCHAR(100)): Manufacturer and hardware revision.
- `animal_id` (UUID, UNIQUE, FK -> `wildlife_animals.id` ON DELETE SET NULL): 1-to-1 relationship with animal.
- `battery_percentage` (INTEGER, DEFAULT 100): `CHECK (battery_percentage >= 0 AND battery_percentage <= 100)`.
- `transmission_interval_minutes` (INTEGER, DEFAULT 15): Frequency of simulated GPS telemetry pings.
- `is_active` (BOOLEAN, DEFAULT TRUE): Operational state.
- `last_transmitted_at` (TIMESTAMPTZ): Timestamp of the last received ping.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

> **Cardinality Invariant:** `animal_id` has a `UNIQUE` constraint, enforcing that an animal has at most one active collar, and a collar belongs to at most one animal ($1 \leftrightarrow 0..1$).

### 3.9 `location_records`
Simulated time-series GPS collar telemetry transmissions.
- `id` (UUID, PK): Telemetry record identifier.
- `animal_id` (UUID, NOT NULL, FK -> `wildlife_animals.id` ON DELETE CASCADE): Monitored animal.
- `collar_id` (UUID, FK -> `tracking_collars.id` ON DELETE SET NULL): Emitting collar.
- `latitude` (NUMERIC(10, 7), NOT NULL): Recorded latitude.
- `longitude` (NUMERIC(10, 7), NOT NULL): Recorded longitude.
- `recorded_at` (TIMESTAMPTZ, NOT NULL): Telemetry capture timestamp.
- `speed_kmh` (NUMERIC(5, 2)): Movement speed.
- `heading_degrees` (NUMERIC(5, 2)): Compass bearing ($0^\circ - 360^\circ$).
- `is_simulated` (BOOLEAN, DEFAULT TRUE): Flags simulated vs. field telemetry.
- `created_at` (TIMESTAMPTZ, NOT NULL).

### 3.10 `risk_zones`
Configured high-risk geographical sectors (agricultural fields, human settlements, railway corridors).
- `id` (UUID, PK): Risk zone identifier.
- `park_id` (UUID, NOT NULL, FK -> `parks.id` ON DELETE CASCADE): Adjacent park.
- `zone_name` (VARCHAR(150), NOT NULL): Title (e.g., "Kittulkote Village Buffer Zone").
- `zone_code` (VARCHAR(30), NOT NULL, UNIQUE): Unique zone code.
- `risk_level` (VARCHAR(20), NOT NULL): `CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))`.
- `description` (TEXT): Risk assessment notes.
- `boundary_coordinates` (JSONB, NOT NULL): Simple JSON polygon coordinate array `[{"latitude": 6.35, "longitude": 80.45}, ...]`.
- `is_active` (BOOLEAN, DEFAULT TRUE): Active for alert monitoring.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.11 `wildlife_risk_alerts`
Automated risk events created when collar telemetry intersects a risk zone.
- `id` (UUID, PK): Alert identifier.
- `alert_code` (VARCHAR(50), NOT NULL, UNIQUE): Unique alert reference (e.g., "ALT-2026-0001").
- `animal_id` (UUID, NOT NULL, FK -> `wildlife_animals.id` ON DELETE RESTRICT): Monitored animal.
- `risk_zone_id` (UUID, NOT NULL, FK -> `risk_zones.id` ON DELETE RESTRICT): Triggering zone.
- `location_record_id` (UUID, NOT NULL, FK -> `location_records.id` ON DELETE RESTRICT): Specific GPS ping.
- `severity` (VARCHAR(20), NOT NULL): `CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))`.
- `status` (VARCHAR(20), NOT NULL): `CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'))`.
- `generated_at` (TIMESTAMPTZ, NOT NULL): Alert trigger timestamp.
- `acknowledged_at` (TIMESTAMPTZ): Staff acknowledgment timestamp.
- `resolved_at` (TIMESTAMPTZ): Resolution timestamp.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.12 `alert_responses`
Actions deployed by staff to intercept or mitigate wildlife risk alerts.
- `id` (UUID, PK): Response record identifier.
- `alert_id` (UUID, NOT NULL, FK -> `wildlife_risk_alerts.id` ON DELETE CASCADE): Target alert.
- `responder_id` (UUID, NOT NULL, FK -> `users.id` ON DELETE RESTRICT): Ranger or CLO who responded.
- `action_taken` (TEXT, NOT NULL): Narrative of intervention (e.g., "Thunder flashes deployed to herd elephant away").
- `response_status` (VARCHAR(20), NOT NULL): `CHECK (response_status IN ('INITIATED', 'IN_PROGRESS', 'COMPLETED'))`.
- `client_mutation_id` (VARCHAR(64), UNIQUE): Idempotency key for offline mobile replay.
- `responded_at` (TIMESTAMPTZ, NOT NULL): Intervention timestamp.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.13 `incidents`
Field incidents logged by rangers during patrols (UC02).
- `id` (UUID, PK): Incident report identifier.
- `incident_code` (VARCHAR(50), NOT NULL, UNIQUE): Reference code (e.g., "INC-2026-0001").
- `ranger_id` (UUID, NOT NULL, FK -> `users.id` ON DELETE RESTRICT): Reporting ranger.
- `patrol_id` (UUID, FK -> `patrols.id` ON DELETE SET NULL): Associated patrol mission (if on patrol).
- `incident_type` (VARCHAR(30), NOT NULL): `CHECK (incident_type IN ('SNARE', 'CARCASS', 'ILLEGAL_CAMPSITE', 'FOOTPRINT', 'POACHING_ACTIVITY', 'ILLEGAL_LOGGING', 'OTHER'))`.
- `description` (TEXT, NOT NULL): Detailed factual report.
- `latitude` (NUMERIC(10, 7), NOT NULL): Incident coordinate.
- `longitude` (NUMERIC(10, 7), NOT NULL): Incident coordinate.
- `status` (VARCHAR(20), NOT NULL): `CHECK (status IN ('PENDING', 'SUBMITTED', 'REVIEWED', 'CLOSED'))`.
- `client_mutation_id` (VARCHAR(64), UNIQUE): Idempotency key for offline sync replay.
- `is_offline_submission` (BOOLEAN, DEFAULT FALSE): Indicates record was queued offline.
- `reported_at` (TIMESTAMPTZ, NOT NULL): Field observation timestamp.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.14 `supporting_evidence`
Photographs or audio/document files attached to incident reports.
- `id` (UUID, PK): Evidence item identifier.
- `incident_id` (UUID, NOT NULL, FK -> `incidents.id` ON DELETE CASCADE): Parent incident.
- `evidence_type` (VARCHAR(30), NOT NULL): `CHECK (evidence_type IN ('PHOTO', 'AUDIO', 'DOCUMENT', 'OTHER'))`.
- `file_path` (VARCHAR(500), NOT NULL): Storage URI or relative path (`/uploads/incidents/...`).
- `file_name` (VARCHAR(255), NOT NULL): Original filename.
- `mime_type` (VARCHAR(100)): File MIME type.
- `file_size_bytes` (INTEGER): File size.
- `captured_at` (TIMESTAMPTZ): Image capture timestamp.
- `created_at` (TIMESTAMPTZ, NOT NULL).

### 3.15 `conflict_reports`
Human-wildlife conflict incidents reported by villagers or CLOs (UC04).
- `id` (UUID, PK): Conflict report identifier.
- `report_code` (VARCHAR(50), NOT NULL, UNIQUE): Reference code (e.g., "HWC-2026-0001").
- `community_member_id` (UUID, NOT NULL, FK -> `community_members.id` ON DELETE RESTRICT): Reporting villager.
- `park_id` (UUID, NOT NULL, FK -> `parks.id` ON DELETE RESTRICT): Affected park region.
- `conflict_type` (VARCHAR(30), NOT NULL): `CHECK (conflict_type IN ('ELEPHANT_HUMAN_CONFLICT', 'CROP_DAMAGE', 'ANIMAL_INTRUSION', 'LIVESTOCK_ATTACK', 'PROPERTY_DAMAGE', 'OTHER'))`.
- `description` (TEXT, NOT NULL): Factual account of the encounter.
- `latitude` (NUMERIC(10, 7), NOT NULL): Occurrence coordinates.
- `longitude` (NUMERIC(10, 7), NOT NULL): Occurrence coordinates.
- `status` (VARCHAR(20), NOT NULL): `CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'RESPONDING', 'RESOLVED', 'CLOSED'))`.
- `client_mutation_id` (VARCHAR(64), UNIQUE): Idempotency key for offline replay.
- `is_offline_submission` (BOOLEAN, DEFAULT FALSE): Offline sync indicator.
- `reported_at` (TIMESTAMPTZ, NOT NULL): Occurrence timestamp.
- `created_at`, `updated_at` (TIMESTAMPTZ, NOT NULL).

### 3.16 `sync_operations`
Audit log of mobile synchronization events.
- `id` (UUID, PK): Operation record identifier.
- `client_mutation_id` (VARCHAR(64), NOT NULL, UNIQUE): Unique mutation idempotency key from mobile.
- `operation_type` (VARCHAR(30), NOT NULL): Operation verb (e.g., `CREATE`, `UPDATE`).
- `entity_type` (VARCHAR(50), NOT NULL): Entity being modified (`INCIDENT`, `CONFLICT_REPORT`, `ALERT_RESPONSE`).
- `entity_id` (UUID): Resulting server entity ID.
- `status` (VARCHAR(20), NOT NULL): `CHECK (status IN ('PENDING', 'SYNCHRONIZED', 'FAILED'))`.
- `payload` (JSONB): Replayed mutation payload for audit and debugging.
- `error_message` (TEXT): Failure description if replay failed.
- `synchronized_at` (TIMESTAMPTZ): Server persistence timestamp.
- `created_at` (TIMESTAMPTZ, NOT NULL).

---

## 4. Entity-Relationship & Cardinality Diagram

```
                        ┌─────────────┐
                        │    Park     │
                        └──────┬──────┘
         ┌─────────────────────┼─────────────────────┬──────────────────┐
         │ 1                   │ 1                   │ 1                │ 1
         │ *                   │ *                   │ *                │ *
         ▼                     ▼                     ▼                  ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  ┌─────────────┐
│  PatrolRoute    │   │     Patrol      │   │    RiskZone     │  │WildlifeAnimal
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘  └──────┬──────┘
         │ 1                   │ 1                   │ 1                │ 1
         │ *                   │ *                   │ *                │ 0..1
         ▼                     ▼                     ▼                  ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  ┌─────────────┐
│    Waypoint     │   │    Waypoint     │   │WildlifeRiskAlert│  │TrackingCollar
└─────────────────┘   └────────┬────────┘   └────────┬────────┘  └──────┬──────┘
                               │ 1                   │ 1                │ 1
                               │ *                   │ *                │ *
                               ▼                     ▼                  ▼
                      ┌─────────────────┐   ┌─────────────────┐  ┌─────────────┐
                      │    Incident     │   │  AlertResponse  │  │LocationRec. │
                      └────────┬────────┘   └────────▲────────┘  └──────▲──────┘
                               │ 1                   │ 1                │ 1
                               │ *                   │ *                │ *
                               ▼                     │                  │
                      ┌─────────────────┐            │                  │
                      │Supp. Evidence   │            │                  │
                      └─────────────────┘            │                  │
                                                     │                  │
┌─────────────────┐                          ┌───────┴───────┐          │
│ CommunityMember │                          │     User      │          │
└────────┬────────┘                          │  (Ranger/CLO) │          │
         │ 1                                 └───────────────┘          │
         │ *                                                            │
         ▼                                                              │
┌─────────────────┐                                                     │
│ ConflictReport  │                                                     │
└─────────────────┘                                                     │
         ▲                                                              │
         └──────────────────────────────────────────────────────────────┘
```

### Cardinality Summary Table

| Source Entity | Relationship | Target Entity | Cardinality | Enforced By |
|---|---|---|---|---|
| `Park` | has many | `PatrolRoute` | $1 \to *$ | `patrol_routes.park_id` FK |
| `Park` | has many | `Patrol` | $1 \to *$ | `patrols.park_id` FK |
| `User` (Ranger) | leads | `Patrol` | $1 \to *$ | `patrols.ranger_id` FK |
| `PatrolRoute` | has planned | `Waypoint` | $1 \to *$ | Stored in JSONB / Route links |
| `Patrol` | records | `Waypoint` | $1 \to *$ | `waypoints.patrol_id` FK |
| `WildlifeAnimal` | carries | `TrackingCollar` | $1 \to 0..1$ | `tracking_collars.animal_id` UNIQUE FK |
| `WildlifeAnimal` | produces | `LocationRecord` | $1 \to *$ | `location_records.animal_id` FK |
| `TrackingCollar` | transmits | `LocationRecord` | $1 \to *$ | `location_records.collar_id` FK |
| `Park` | contains | `RiskZone` | $1 \to *$ | `risk_zones.park_id` FK |
| `WildlifeAnimal` | triggers | `WildlifeRiskAlert` | $1 \to *$ | `wildlife_risk_alerts.animal_id` FK |
| `RiskZone` | triggers | `WildlifeRiskAlert` | $1 \to *$ | `wildlife_risk_alerts.risk_zone_id` FK |
| `LocationRecord` | triggers | `WildlifeRiskAlert` | $1 \to *$ | `wildlife_risk_alerts.location_record_id` FK |
| `WildlifeRiskAlert` | receives | `AlertResponse` | $1 \to *$ | `alert_responses.alert_id` FK |
| `User` (Staff) | author of | `AlertResponse` | $1 \to *$ | `alert_responses.responder_id` FK |
| `User` (Ranger) | reports | `Incident` | $1 \to *$ | `incidents.ranger_id` FK |
| `Patrol` | associated with | `Incident` | $1 \to *$ | `incidents.patrol_id` FK (nullable) |
| `Incident` | has | `SupportingEvidence`| $1 \to *$ | `supporting_evidence.incident_id` FK |
| `CommunityMember`| submits | `ConflictReport` | $1 \to *$ | `conflict_reports.community_member_id` FK |
| `Park` | receives | `ConflictReport` | $1 \to *$ | `conflict_reports.park_id` FK |

---

## 5. Indexes for Query Performance

To ensure low latency during dashboard telemetry rendering and mobile sync processing, specialized B-Tree indexes are created:

```sql
-- Patrol queries (UC01)
CREATE INDEX idx_patrols_ranger ON patrols(ranger_id);
CREATE INDEX idx_patrols_status ON patrols(status);
CREATE INDEX idx_patrols_start_time ON patrols(start_time);
CREATE INDEX idx_patrol_routes_park ON patrol_routes(park_id);
CREATE INDEX idx_waypoints_patrol ON waypoints(patrol_id, sequence_order);

-- Animal tracking and risk alerts (UC03)
CREATE INDEX idx_location_records_animal_time ON location_records(animal_id, recorded_at);
CREATE INDEX idx_risk_zones_park ON risk_zones(park_id);
CREATE INDEX idx_wildlife_alerts_animal ON wildlife_risk_alerts(animal_id);
CREATE INDEX idx_wildlife_alerts_status ON wildlife_risk_alerts(status);
CREATE INDEX idx_wildlife_alerts_generated ON wildlife_risk_alerts(generated_at);
CREATE INDEX idx_alert_responses_alert ON alert_responses(alert_id);

-- Incidents (UC02)
CREATE INDEX idx_incidents_ranger ON incidents(ranger_id);
CREATE INDEX idx_incidents_patrol ON incidents(patrol_id);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX idx_supporting_evidence_incident ON supporting_evidence(incident_id);

-- Conflicts (UC04)
CREATE INDEX idx_conflict_reports_member ON conflict_reports(community_member_id);
CREATE INDEX idx_conflict_reports_park ON conflict_reports(park_id);
CREATE INDEX idx_conflict_reports_status ON conflict_reports(status);
CREATE INDEX idx_conflict_reports_reported_at ON conflict_reports(reported_at);

-- Mobile sync audit (Offline Engine)
CREATE INDEX idx_sync_ops_client_mutation ON sync_operations(client_mutation_id);
CREATE INDEX idx_sync_ops_status ON sync_operations(status);
```

---

## 6. Rationale: Why PostGIS Was Intentionally Not Used

1. **Deployment Portability & Zero Native C Dependencies:** PostGIS requires compilation against `GEOS`, `PROJ`, and `GDAL` native shared libraries. These create build incompatibilities on developer machines (Windows/macOS) and complicate serverless PostgreSQL deployments.
2. **Sub-Centimeter Precision via Numeric Coordinates:** Storing coordinates as `NUMERIC(10, 7)` guarantees millimeter-level precision ($10^{-7}$ degrees $\approx 1.1\text{ cm}$ at the equator). This is more than sufficient for tracking Asian Elephants or field patrols.
3. **Simple JSON Boundary Storage:** Risk zone perimeters and park boundaries are stored as clean JSONB arrays (`[{"latitude": 6.35, "longitude": 80.45}, ...]`). They serialize directly to React/Expo frontend mapping libraries (e.g. Leaflet, Mapbox, React Native Maps) without requiring GeoJSON transformation pipelines.
4. **Backend Computational Algorithms:** Haversine distance calculations and point-in-polygon ray-casting are implemented in pure TypeScript within the service layer. This keeps business rules testable with standard Vitest suites without requiring a running GIS server.

---

## 7. Offline Synchronization Strategy

Field rangers (UC02) and community liaison officers (UC03/UC04) operate in remote national park sectors with intermittent cellular connectivity. The system implements a robust, lightweight **Pending-Operation Queue** pattern:

```
[Mobile Client (Offline)]
      │
      ├── Generates deterministic UUID v4 (client_mutation_id)
      ├── Persists record locally in SQLite / AsyncStorage
      └── Enqueues mutation to FIFO sync queue
      │
[Connectivity Restored]
      │
      ├── POST /api/sync/batch (or idempotent resource endpoint)
      └── Payload includes { client_mutation_id, ...data }
      │
[Backend Ingestion]
      │
      ├── Check: SELECT id FROM incidents WHERE client_mutation_id = $1
      ├── IF EXISTS: Return HTTP 200 with existing record (Idempotent ACK)
      └── IF NEW: INSERT record within transaction, log in sync_operations, return HTTP 201
```

- **Idempotency Keys:** `incidents`, `conflict_reports`, `alert_responses`, and `sync_operations` feature unique `client_mutation_id VARCHAR(64)` columns.
- **Double-Submission Prevention:** If a mobile client experiences an ACK packet drop and retries submission, the database rejects duplicates or the API returns the existing record cleanly without duplicate side effects.

---

## 8. Alignment with Business Use Cases (UC01 – UC04)

### UC01: Monitor and Evaluate Ranger Patrol Activities
- Supported by `parks`, `users` (Rangers), `patrol_routes`, `patrols`, and `waypoints`.
- Tracks planned vs. active vs. completed patrols, breadcrumb coordinates, coverage distances, and timestamp intervals.

### UC02: Report Wildlife/Poaching Incident
- Supported by `users` (Ranger), `patrols`, `incidents`, and `supporting_evidence`.
- Records incident categories (traps, carcasses, logging), GPS coordinates, offline indicators, and photo references.

### UC03: Detect and Respond to Wildlife Risk Alert
- Supported by `wildlife_animals`, `tracking_collars`, `location_records`, `risk_zones`, `wildlife_risk_alerts`, and `alert_responses`.
- Simulates collar telemetry, detects geofence boundary intersections, tracks alert lifecycles (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESPONDING` $\to$ `RESOLVED`), and records mitigating field actions.

### UC04: Report Human-Wildlife Conflict
- Supported by `community_members`, `parks`, and `conflict_reports`.
- Tracks villager-reported crop damage and animal intrusions, village locations, status pipelines, and offline sync submissions.

---

## 9. Seed Data Strategy

The seed script (`apps/backend/db/seeds/001_initial_seed.sql`) populates realistic, fictional conservation data contextualized to Sri Lanka:

1. **Parks:**
   - Yala National Park (`YALA`, Southern Province, $978.8\text{ km}^2$)
   - Wilpattu National Park (`WILP`, North Western Province, $1,317.0\text{ km}^2$)
   - Udawalawe National Park (`UDAW`, Sabaragamuwa Province, $308.2\text{ km}^2$)
2. **Staff (`users`):**
   - 1 Park Manager: Dr. Gamini Jayasinghe (`mgr_gamini`)
   - 3 Field Rangers: Saman Perera (`ranger_saman`), Dinesh Silva (`ranger_dinesh`), Kasun Fernando (`ranger_kasun`)
   - 2 Community Liaison Officers: Anura Wickramasinghe (`clo_anura`), Niluka Bandara (`clo_niluka`)
3. **Community Members:**
   - Bandara Menike (Kittulkote Village, Yala border)
   - Sunil Karunaratne (Mawillu Village, Wilpattu border)
   - Chaminda Kumara (Galgamuwa East, Udawalawe border)
4. **Patrols & Waypoints (UC01):**
   - Active Patrol: `PAT-2026-YALA-001` (Ranger Saman, Yala Route 1, 5 waypoints)
   - Completed Patrol: `PAT-2026-WILP-001` (Ranger Dinesh, Wilpattu West, 4 waypoints)
   - Planned Patrol: `PAT-2026-UDAW-001` (Ranger Kasun, Udawalawe Northern)
5. **Tracked Wildlife & Telemetry (UC03):**
   - Elephant "Walagamba" (`ELE-YALA-001`) with active GPS collar `COL-001` (92% battery).
   - Elephant "Kumana Raja" (`ELE-YALA-002`) with active GPS collar `COL-002` (85% battery).
   - Leopard "Wilpattu Star" (`LEO-WILP-001`) with active GPS collar `COL-003` (78% battery).
6. **Deterministic Geofence Demonstration (UC03 Invariant):**
   - **Animal Inside Risk Zone:** "Walagamba" is positioned at `(6.3605000, 80.4550000)` inside the high-risk "Kittulkote Village Buffer Zone", generating active alert `ALT-2026-0001` and alert response record.
   - **Animal Outside Risk Zone:** "Kumana Raja" is positioned at `(6.3850000, 80.4850000)` safely within deep park interior (outside all risk zones), generating no alert.
7. **Incidents & Evidence (UC02):**
   - Wire snare trap found along Yala river bed with attached photographic evidence.
   - Illegal teak logging encampment detected in Wilpattu.
8. **Conflict Reports (UC04):**
   - Paddy field crop raid reported by Bandara Menike at Kittulkote.
   - Elephant herd home garden intrusion reported at Galgamuwa.
9. **Sync Operations:**
   - Sample offline sync audit logs demonstrating idempotent batch processing.

---

## 10. CLI Migration & Seeding Commands

The project root provides cross-platform npm commands:

```bash
# Run PostgreSQL migration (creates 16 tables, constraints, indexes)
npm run db:migrate

# Seed realistic Sri Lankan conservation demo data
npm run db:seed

# Reset database (drops all tables, applies migration, seeds fresh data)
npm run db:reset

# Execute all automated test suites
npm test
```
