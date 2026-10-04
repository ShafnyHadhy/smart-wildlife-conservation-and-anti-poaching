# Smart Wildlife Conservation and Anti-Poaching Monitoring System
## Software Architecture Document

- **Project:** Smart Wildlife Conservation and Anti-Poaching Monitoring System
- **Context:** Sri Lankan Wildlife Conservation Organization
- **Authors:** Software Architecture Team
- **Document Version:** 1.0.0
- **Status:** Proposed (Awaiting Approval)

---

## 1. Executive Summary & Requirements Analysis

### 1.1 Project Overview
The Smart Wildlife Conservation and Anti-Poaching Monitoring System is an integrated, offline-capable multi-platform solution engineered for national parks and wildlife sanctuaries in Sri Lanka (e.g., Yala, Wilpattu, Udawalawe). The system coordinates park managers, field rangers, community liaison officers, and local community members across four core operational use cases:

1. **UC01: Monitor and Evaluate Ranger Patrol Activities (Park Manager)**
   - Live/recent patrol visualization, active routes, patrol progress, coverage gap analysis, stale/unavailable telemetry handling, and simulated GPS streaming.
2. **UC02: Report Wildlife/Poaching Incident (Ranger)**
   - Field incident recording (carcasses, traps/snares, suspicious activity, encroachment) with GPS tagging, photo attachments, offline local storage, and automatic queue synchronization.
3. **UC03: Detect and Respond to Wildlife Risk Alert (Ranger / Community Liaison Officer)**
   - Ingestion of simulated animal GPS collar telemetry (e.g., tracked Asian Elephants or Sri Lankan Leopards), geofence evaluation against configured high-risk agricultural/settlement boundary zones, automated alert generation, response assignment, and offline response logging.
4. **UC04: Report Human-Wildlife Conflict (Community Member / Community Liaison Officer)**
   - Public/community-accessible conflict reporting (crop raids, structural damage, animal sightings near villages), duplicate detection, offline caching, and review/escalation pipeline.

### 1.2 Scope Limits & Non-Goals
To prevent feature bloat and ensure high-integrity completion of core domain logic within project timelines, the following boundaries are strictly enforced:
- **No Real Hardware Integration:** GPS collars and ranger handheld units are simulated via deterministic data generators.
- **No Authentication / Role Administration:** Role simulation is context-driven (role headers / simulated actor switching) rather than full OAuth2/JWT user management.
- **No External Communication Gateways:** Push notifications, SMS gateways, and external mail servers are stubbed via unified event logging and internal in-app alert tables.
- **No Heavyweight GIS / Machine Learning:** Spatial checks use robust geometric algorithms (Haversine distance and point-in-polygon ray-casting) implemented natively in Node.js / PostgreSQL without heavy external GIS server dependencies.

---

## 2. Monorepo Structure

A lightweight npm/pnpm workspace monorepo layout is chosen to facilitate clean code sharing between backend and mobile/web clients while maintaining clear physical isolation.

```text
wildlife-monitoring/
├── docs/
│   ├── architecture.md               # System architecture and technical design
│   └── implementation-plan.md        # 5-day phased implementation roadmap
├── packages/
│   └── shared/                       # Shared domain types, DTOs, and validation schemas
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/                # Domain models & enums (Patrol, Incident, Alert, Conflict)
│           ├── schemas/              # Zod validation schemas shared between client & server
│           └── constants/            # Common domain constants (risk levels, incident categories)
├── apps/
│   ├── backend/                      # Node.js + Express + TypeScript REST API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── config/               # Environment variables, database connection pool
│   │   │   ├── routes/               # Express route definitions
│   │   │   ├── controllers/          # HTTP request parsing and response formatting
│   │   │   ├── services/             # Pure business rules & orchestration
│   │   │   ├── repositories/         # PostgreSQL queries & data access layer
│   │   │   ├── simulation/           # GPS collar telemetry and ranger movement simulators
│   │   │   ├── middleware/           # Error handling, request validation, actor context
│   │   │   └── utils/                # Geometry/Haversine math, logger, file storage helper
│   │   ├── db/
│   │   │   ├── migrations/           # SQL migration scripts (001_initial_schema.sql, etc.)
│   │   │   └── seeds/                # Demo parks, zones, animals, rangers, sample patrols
│   │   ├── uploads/                  # Attached photos storage directory
│   │   └── tests/
│   │       ├── unit/                 # Pure domain service and algorithm unit tests
│   │       └── integration/          # API endpoint and database integration tests
│   ├── web/                          # React + Tailwind CSS Web Dashboard (Desktop-oriented)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── src/
│   │   │   ├── api/                  # Axios/Fetch client service for backend endpoints
│   │   │   ├── components/           # Reusable UI widgets (MapViewer, StatusBadge, Cards)
│   │   │   ├── layouts/              # Dashboard layout, navigation bar, sidebar
│   │   │   ├── pages/                # Views: PatrolMonitoring, Alerts, Conflicts, Incidents
│   │   │   ├── hooks/                # Custom hooks for polling, telemetry feed, alert stream
│   │   │   └── utils/                # Coordinate formatters, time display helpers
│   └── mobile/                       # React Native + Expo Mobile Application (Offline-first)
│       ├── package.json
│       ├── app.json
│       ├── src/
│       │   ├── api/                  # Mobile API client
│       │   ├── offline/              # SQLite / AsyncStorage pending-sync queue engine
│       │   │   ├── syncQueue.ts      # Enqueue, dequeue, retry, and status tracker
│       │   │   ├── syncService.ts    # Replay pending operations to backend
│       │   │   └── networkStatus.ts  # Connectivity listener (NetInfo / mock switch)
│       │   ├── components/           # Mobile form components, camera picker, location banner
│       │   ├── screens/              # IncidentReportScreen, ConflictReportScreen, AlertResponseScreen
│       │   ├── navigation/           # Bottom tab or stack navigators
│       │   └── hooks/                # useSyncStatus, useLocationCapture
│       └── assets/
└── package.json                      # Root workspace configuration
```

---

## 3. Backend Architecture (Node.js + Express + TypeScript)

### 3.1 Layered Separation of Concerns
The backend strictly enforces the four-tier architectural pattern:

$$\text{Routes} \longrightarrow \text{Controllers} \longrightarrow \text{Services} \longrightarrow \text{Repositories} \longrightarrow \text{PostgreSQL}$$

```
┌────────────────────────────────────────────────────────┐
│                   HTTP Request                         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Routes Layer (src/routes/)                            │
│  - URL mapping & HTTP verb binding                     │
│  - Request validation middleware (Zod)                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Controllers Layer (src/controllers/)                  │
│  - Extract params, body, queries                       │
│  - Translate DTOs to service calls                     │
│  - Return standardized HTTP responses (200, 201, 400)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Services Layer (src/services/)                        │
│  - Core Business Logic & Invariants                    │
│  - Geofence risk evaluation & alert triggers           │
│  - Deduplication checks & state transitions            │
│  - Orchestrates repositories and simulator events      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Repositories Layer (src/repositories/)                │
│  - Encapsulated SQL Queries / DB client                │
│  - Transaction management                              │
│  - Raw row mapping to domain models                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  PostgreSQL Database (ACID Storage)                    │
└────────────────────────────────────────────────────────┘
```

### 3.2 Responsibility Guidelines
1. **Routes:** Zero logic. Sole responsibility is routing paths and mounting validation middleware.
2. **Controllers:** Strictly parse HTTP inputs and format HTTP outputs using standard response helpers (`res.success(data)`, `res.error(code, message)`).
3. **Services:** The heart of the application. All business rules (e.g. "when an animal enters a high-risk zone, transition status and create alert," "patrol location updates older than 15 minutes are marked STALE") reside here. Services are framework-agnostic and unit-testable without HTTP mocks.
4. **Repositories:** Manage SQL queries via parameterized queries using `pg` (node-postgres), shielding services from SQL syntax and dialect specifics.

### 3.3 Error Handling & Validation
- **Validation:** Shared Zod schemas validate request payloads at the middleware level. Malformed payloads return `422 Unprocessable Entity` with field-level error arrays.
- **Custom Exceptions:** A hierarchy of domain errors (`NotFoundError`, `ValidationError`, `ConflictError`, `SyncConflictError`) is caught by a centralized Express error handler, preventing unhandled promise rejections or server crashes.

---

## 4. Web Architecture (React + Tailwind CSS)

### 4.1 Purpose & User Persona
- **Primary Persona:** Park Manager (Desktop workstation at Park Headquarters).
- **Secondary Persona:** Community Liaison Officer (HQ triage).
- **Design Philosophy:** Responsive desktop dashboard optimized for situational awareness, high-contrast operational status indicators, and clear spatial layouts.

### 4.2 Web Modules
1. **Patrol Monitoring Command Center (UC01):**
   - Interactive SVG/Canvas/Leaflet-based Sri Lankan park grid (e.g., Yala Block I & II).
   - Live ranger breadcrumb trails, last known coordinates, and timestamp age indicators (Active = Green, Stale > 15m = Amber, Lost Signal > 1h = Red).
   - Patrol coverage heatmap overlay highlighting under-patrolled grid cells.
2. **Wildlife Risk & Incident Alert Desk (UC03):**
   - Real-time/polling list of animal collar intrusions into agricultural buffer zones.
   - Actionable response assignment and status updates.
3. **Conflict & Poaching Incident Review (UC02, UC04):**
   - Tabular and card views with filters (Incident Type, Urgency, Status, Date range).
   - High-resolution modal inspector for field photos and coordinates.

---

## 5. Mobile Architecture (React Native + Expo)

### 5.1 Purpose & Field Constraints
- **Primary Personas:** Field Ranger (patrolling on foot/jeep with intermittent cellular connectivity) and Community Member.
- **Form Factor:** Mobile-first, high contrast for outdoor visibility, large touch targets for gloved or rugged field use.

### 5.2 Key Mobile Modules
- **Location Capture Component:** Wraps Expo Location. If hardware/simulator GPS is active, fetches latitude/longitude; if unavailable or denied, seamlessly displays an interactive coordinate picker / preset landmark selector.
- **Photo Capture Component:** Wraps Expo ImagePicker. Supports direct camera capture or gallery selection, generating compact Base64/JPEG payloads with image compression for offline storage.
- **Sync Status Banner:** Persistent header component showing connectivity status (`ONLINE`, `OFFLINE`) and pending queue badge count (`"3 reports pending sync"`).

---

## 6. Offline Synchronization Architecture

The system implements a robust, lightweight **Pending-Operation Synchronization Queue** without external distributed database engines.

### 6.1 Architectural Workflow

```
[Mobile Device Action (UC02 / UC03 / UC04)]
         │
         ▼
[Check Network Availability]
   ├── ONLINE  ──► Attempt Direct REST API Submission
   │                 ├── Success: Persist local copy (status: SYNCED)
   │                 └── Failure (Network drop): Fallback to Offline Queue
   │
   └── OFFLINE ──► Persist in Local Mobile DB (SQLite / AsyncStorage)
                     - Record status: "PENDING_SYNC"
                     - Assign deterministic client_mutation_id (UUID v4)
                     - Add to FIFO Sync Queue
                     │
                     ▼
[Network Restored Event (NetInfo / Manual "Sync Now" button)]
         │
         ▼
[Mobile Sync Service]
   - Read all items with status == "PENDING_SYNC" ordered by created_at ASC
   - For each item:
         │
         ├── POST /api/sync/batch (or specific idempotent endpoint)
         │   with payload + client_mutation_id
         │
         ├── Backend checks client_mutation_id (Idempotency Key)
         │     ├── If already processed: return existing record (HTTP 200)
         │     └── If new: execute transaction & insert (HTTP 201)
         │
         └── Success received:
               Update local record status: "SYNCED", synced_at = now()
```

### 6.2 Data Model for Mobile Sync Queue
Stored in local SQLite / AsyncStorage:
```typescript
interface PendingSyncOperation {
  id: string;                      // Local internal UUID
  client_mutation_id: string;      // Idempotency key sent to server
  entity_type: 'INCIDENT' | 'CONFLICT' | 'ALERT_RESPONSE';
  action: 'CREATE' | 'UPDATE';
  endpoint: string;                // e.g. "/api/incidents"
  payload: Record<string, any>;   // Serialized request body
  photo_uri?: string;              // Local file URI if attachment exists
  attempts: number;
  last_error?: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  created_at: string;
  synced_at?: string;
}
```

### 6.3 Server-Side Idempotency Strategy
- PostgreSQL tables (`incidents`, `conflicts`, `alert_responses`) contain a unique column `client_mutation_id VARCHAR(64) UNIQUE`.
- If an offline report is submitted twice due to network timeout on the ACK, the backend returns the existing resource with HTTP `200 OK` rather than duplicating the record.

---

## 7. PostgreSQL Database Strategy

### 7.1 Spatial Strategy: Robust Numeric Coordinates vs. GIS
To ensure maximum cross-platform compatibility, zero binary dependency build issues on developer machines, and fast deterministic testing, geographic positions are stored as:
- `latitude NUMERIC(10, 7)`
- `longitude NUMERIC(10, 7)`

Spherical distances are calculated using the standard **Haversine formula** implemented directly in PostgreSQL SQL functions and mirrored in Node.js utility services. Geofencing for high-risk zones is implemented via polygon coordinate ray-casting or circular buffer radii (center lat/lng + radius_km), which fits Sri Lankan wildlife buffer zones (e.g., 5km park boundary perimeter) cleanly.

### 7.2 Core Relational Schema

```sql
-- 1. Rangers / Operational Personnel
CREATE TABLE rangers (
    id VARCHAR(36) PRIMARY KEY,
    call_sign VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, OFF_DUTY, DISPATCHED
    current_latitude NUMERIC(10, 7),
    current_longitude NUMERIC(10, 7),
    location_updated_at TIMESTAMP WITH TIME ZONE
);

-- 2. Patrol Routes & Active Sessions (UC01)
CREATE TABLE patrols (
    id VARCHAR(36) PRIMARY KEY,
    ranger_id VARCHAR(36) NOT NULL REFERENCES rangers(id),
    patrol_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL, -- PLANNED, ACTIVE, COMPLETED, SUSPENDED
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    target_area_geojson JSONB, -- Coordinates of assigned sector
    coverage_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patrol_locations (
    id BIGSERIAL PRIMARY KEY,
    patrol_id VARCHAR(36) NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_simulated BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_patrol_locations_patrol_time ON patrol_locations(patrol_id, recorded_at);

-- 3. Incident Reports (UC02)
CREATE TABLE incidents (
    id VARCHAR(36) PRIMARY KEY,
    client_mutation_id VARCHAR(64) UNIQUE NOT NULL,
    ranger_id VARCHAR(36) REFERENCES rangers(id),
    incident_type VARCHAR(50) NOT NULL, -- POACHING_TRAP, ILLEGAL_LOGGING, ENCOUNTER, CARCASS, OTHER
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location_description TEXT,
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'SUBMITTED', -- SUBMITTED, INVESTIGATING, RESOLVED
    is_offline_submission BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. High-Risk Zones & Tracked Wildlife (UC03)
CREATE TABLE high_risk_zones (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- VILLAGE_BORDER, CROP_FIELD, RAILWAY_CROSSING
    center_latitude NUMERIC(10, 7) NOT NULL,
    center_longitude NUMERIC(10, 7) NOT NULL,
    radius_km NUMERIC(6, 3) NOT NULL,
    boundary_polygon JSONB, -- Optional coordinate array [[lat, lng], ...]
    alert_severity VARCHAR(20) DEFAULT 'HIGH'
);

CREATE TABLE tracked_animals (
    id VARCHAR(36) PRIMARY KEY,
    collar_id VARCHAR(50) NOT NULL UNIQUE,
    species VARCHAR(50) NOT NULL, -- ELEPHANT, LEOPARD, SLOTH_BEAR
    animal_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    collar_battery_pct INT DEFAULT 100,
    status VARCHAR(20) DEFAULT 'MONITORED',
    last_latitude NUMERIC(10, 7),
    last_longitude NUMERIC(10, 7),
    last_ping_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE animal_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    collar_id VARCHAR(50) NOT NULL REFERENCES tracked_animals(collar_id),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE wildlife_risk_alerts (
    id VARCHAR(36) PRIMARY KEY,
    animal_id VARCHAR(36) NOT NULL REFERENCES tracked_animals(id),
    zone_id VARCHAR(36) NOT NULL REFERENCES high_risk_zones(id),
    severity VARCHAR(20) NOT NULL, -- MEDIUM, HIGH, EMERGENCY
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, DISPATCHED, RESOLVED, FALSE_ALARM
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    assigned_responder_id VARCHAR(36) REFERENCES rangers(id),
    response_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    client_mutation_id VARCHAR(64) UNIQUE
);

-- 5. Human-Wildlife Conflict Reports (UC04)
CREATE TABLE conflict_reports (
    id VARCHAR(36) PRIMARY KEY,
    client_mutation_id VARCHAR(64) UNIQUE NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_contact VARCHAR(50) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- CROP_DAMAGE, PROPERTY_DAMAGE, VILLAGE_INTRUSION, INJURY
    animal_species VARCHAR(50) DEFAULT 'ELEPHANT',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    description TEXT NOT NULL,
    potential_duplicate_of VARCHAR(36) REFERENCES conflict_reports(id),
    status VARCHAR(20) DEFAULT 'REPORTED', -- REPORTED, ACKNOWLEDGED, RANGER_DISPATCHED, CLOSED
    is_offline_submission BOOLEAN DEFAULT FALSE,
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. Shared Reusable Components & Services

To avoid code duplication across use cases and tiers, the following reusable core services are defined:

1. **`LocationService` (Shared Geometry / Distance):**
   - Implements Haversine distance: `calculateDistance(lat1, lon1, lat2, lon2): number` (returns kilometers).
   - Point-in-polygon verification: `isPointInPolygon(point, polygon): boolean`.
   - Stale telemetry calculation: determines if `Date.now() - timestamp > STALE_THRESHOLD_MS`.
2. **`OfflineSyncManager` (Mobile Reusable Engine):**
   - Reusable across UC02 (Incidents), UC03 (Alert Responses), and UC04 (Conflict Reports).
   - Generic queue schema and FIFO replay mechanism with backoff retry and deduplication keys.
3. **`AlertEvaluationEngine` (UC03):**
   - Evaluates incoming animal telemetry against all active `high_risk_zones`.
   - Filters out rapid oscillation alerts (debouncing alerts within 30 minutes for the same animal & zone).
4. **`TelemetrySimulator`:**
   - Background dummy data generator running on an interval (configurable), generating continuous realistic movement coordinates within Sri Lankan national park bounding boxes.

---

## 9. REST API Strategy

All endpoints follow RESTful conventions, using JSON for payloads and standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`).

### 9.1 API Group Summary

| Resource Group | Method | Endpoint | Use Case | Purpose |
|---|---|---|---|---|
| **Patrols** | `GET` | `/api/patrols` | UC01 | List all patrols with filters (status, ranger, date) |
| | `GET` | `/api/patrols/:id` | UC01 | Fetch patrol details, assigned route, and route history |
| | `GET` | `/api/patrols/overview/live` | UC01 | Fetch latest locations and staleness indicators for active rangers |
| | `GET` | `/api/patrols/:id/coverage` | UC01 | Calculate patrol coverage score & identify under-patrolled areas |
| | `POST` | `/api/patrols/:id/telemetry` | UC01 | Ingest live or simulated ranger coordinates |
| **Incidents** | `POST` | `/api/incidents` | UC02 | Create new incident report (idempotent with `client_mutation_id`) |
| | `GET` | `/api/incidents` | UC02 | List incident reports with filtering & photo URLs |
| | `GET` | `/api/incidents/:id` | UC02 | Detailed incident view |
| **Telemetry & Alerts** | `POST` | `/api/animals/telemetry` | UC03 | Ingest animal collar ping & trigger risk evaluation |
| | `GET` | `/api/alerts` | UC03 | List active and historical wildlife risk alerts |
| | `PATCH` | `/api/alerts/:id/respond`| UC03 | Respond to / resolve risk alert (offline-compatible) |
| | `GET` | `/api/zones` | UC03 | List high-risk zones and boundaries |
| **Conflict Reports** | `POST` | `/api/conflicts` | UC04 | Submit human-wildlife conflict report |
| | `GET` | `/api/conflicts` | UC04 | List conflict reports with duplicate detection flags |
| | `PATCH` | `/api/conflicts/:id/status`| UC04 | Update operational triage status |
| **Batch Sync** | `POST` | `/api/sync/batch` | UC02/03/04 | Bulk synchronizer for mobile devices returning online |
| **Simulation Harness**| `POST` | `/api/simulator/tick` | UC01/03 | Step simulation for testing / demo without waiting on timers |

---

## 10. Testing Strategy

### 10.1 Backend Unit & Integration Tests (Target: $\ge 80\%$ Coverage)
- **Framework:** Vitest or Jest with `supertest` for API integration.
- **Unit Test Focus Areas:**
  - `LocationService`: Haversine precision tests, boundary edge cases, stale timestamp detection.
  - `AlertEvaluationEngine`: Animal inside/outside zone boundaries, alert debounce logic, missing responder fallback.
  - `ConflictDeduplicationService`: Radius-based and temporal duplicate flag assignment.
  - `OfflineSyncService`: Idempotent deduplication when receiving duplicate `client_mutation_id`.
- **Integration Tests:**
  - Mocked or in-memory SQLite / test PostgreSQL container executing migrations, verifying end-to-end HTTP request-to-database persistence.

### 10.2 Frontend & Mobile Tests
- **Frontend:** Vitest + React Testing Library for core dashboard cards, alert badges, and status formatting components.
- **Mobile:** Unit testing the `syncQueue` state machine (offline enqueue, online replay, error retry).

---

## 11. Architectural Decisions & Frozen Specifications

| Decision Area | Chosen Strategy | Alternatives Considered | Rationale |
|---|---|---|---|
| **Language** | Full TypeScript across backend, web, mobile | Plain JavaScript | Guarantees type safety for coordinates, DTOs, and API responses across the stack. |
| **Spatial Engine** | Numeric(10,7) Lat/Lng + Native Haversine functions | PostGIS Extension | PostGIS requires custom OS packages and complicates deployment. Standard trigonometry is fast, portable, and sufficient for park-scale geometry. |
| **Offline Storage** | SQLite / AsyncStorage with UUID idempotency keys | WatermelonDB / CouchDB | Avoids heavy client-side synchronization engines. The pending-queue pattern is simple, transparent, and educational. |
| **Photo Uploads** | Local disk storage with URL paths / Base64 fallback | Cloud S3 / Cloudinary | Eliminates external cloud credentials and API bills for university assessment. |
| **Hardware Emulation**| In-memory & DB-persisted tick simulator | External IoT MQTT broker | Self-contained within the Node.js backend; tests and demonstrations run with zero external services. |
