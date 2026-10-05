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

Spherical distances are calculated using the standard **Haversine formula** implemented directly in Node.js utility services. Geofencing for high-risk zones is implemented via polygon coordinate arrays stored as `JSONB` (`[{"latitude": 6.35, "longitude": 80.45}, ...]`) and evaluated via clean ray-casting point-in-polygon algorithms in the backend service layer, matching Sri Lankan wildlife buffer zones (e.g., 5km park perimeter) cleanly.

### 7.2 Phase 2 Implemented Relational Schema (16 Tables)

The system data layer is fully normalized into 16 tables using UUID primary keys (`gen_random_uuid()`):

1. **`parks`**: Protected national parks and conservation areas (Yala, Wilpattu, Udawalawe).
2. **`users`**: Unified internal conservation staff table with `role` check constraint (`PARK_MANAGER`, `RANGER`, `COMMUNITY_LIAISON_OFFICER`).
3. **`community_members`**: External rural citizen reporters living in park buffer zones.
4. **`patrol_routes`**: Pre-approved designated patrol corridors within parks.
5. **`patrols`**: Operational field missions led by rangers (`PLANNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
6. **`waypoints`**: Chronological breadcrumb GPS coordinates recorded on patrol.
7. **`wildlife_animals`**: Tracked individual animals (Asian Elephants, Leopards).
8. **`tracking_collars`**: Physical GPS telemetry collars ($1 \leftrightarrow 0..1$ with animal).
9. **`location_records`**: Time-series GPS telemetry fixes emitted by animal collars.
10. **`risk_zones`**: High-risk geofence areas with JSONB boundary coordinate arrays.
11. **`wildlife_risk_alerts`**: Automated risk alerts triggered by animal zone intrusion.
12. **`alert_responses`**: Field responses deployed by rangers or CLOs for an alert.
13. **`incidents`**: Field poaching/wildlife incident reports logged by rangers (UC02).
14. **`supporting_evidence`**: Photographic or file evidence attached to incidents.
15. **`conflict_reports`**: Human-wildlife conflict reports logged by villagers/CLOs (UC04).
16. **`sync_operations`**: Server-side audit log for mobile offline sync operations.

*For complete schema DDL, foreign keys, CHECK constraints, and B-Tree indexes, refer to [database-design.md](file:///d:/Academics/Y3S2/CSSE/Project/docs/database-design.md) and [001_initial_schema.sql](file:///d:/Academics/Y3S2/CSSE/Project/apps/backend/db/migrations/001_initial_schema.sql).*


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

All endpoints follow RESTful conventions, using JSON for payloads and standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`). Single entities and mutations return `{ success: true, data: ... }`, collections return `{ success: true, data: [...], meta: { count: ... } }`, and errors return `{ success: false, error: { code, message, details } }`.

*See [api.md](file:///d:/Academics/Y3S2/CSSE/Project/docs/api.md) for full endpoint specifications and [offline-sync.md](file:///d:/Academics/Y3S2/CSSE/Project/docs/offline-sync.md) for offline batch synchronization details.*

### 9.1 Phase 3 Implemented API Endpoints

| Resource Group | Method | Endpoint | Use Case | Purpose |
|---|---|---|---|---|
| **Health** | `GET` | `/api/health` | System | Healthcheck for backend service & database connectivity |
| **Parks & Users** | `GET` | `/api/parks` | Core | List protected parks / reserves |
| | `GET` | `/api/users` | Core | List staff & community users with role filters |
| **Patrols** | `GET` | `/api/patrols` | UC01 | List patrols with filters (`status`, `rangerId`, `parkId`) |
| | `GET` | `/api/patrols/:id` | UC01 | Fetch patrol details aggregated with ranger, route & waypoints |
| | `GET` | `/api/patrol-routes` | UC01 | List designated patrol routes |
| | `GET` | `/api/patrol-routes/:id` | UC01 | Fetch route details with ordered checkpoints |
| **Telemetry & Alerts** | `GET` | `/api/animals` | UC03 | List monitored wildlife individuals |
| | `GET` | `/api/animals/:id` | UC03 | Single tracked animal details |
| | `GET` | `/api/animals/:id/locations`| UC03 | Retrieve animal GPS fix history |
| | `POST`| `/api/animal-locations` | UC03 | Ingest simulated GPS collar telemetry fix |
| | `GET` | `/api/risk-zones` | UC03 | List defined geofenced zones |
| | `GET` | `/api/alerts` | UC03 | List alerts with status/animal filters |
| | `GET` | `/api/alerts/:id` | UC03 | Fetch single alert details with response history |
| | `POST`| `/api/alerts/:id/respond`| UC03 | Record field response and update alert state |
| **Incidents** | `GET` | `/api/incidents` | UC02 | List incident reports with filters |
| | `GET` | `/api/incidents/:id` | UC02 | Detailed incident view |
| | `POST`| `/api/incidents` | UC02 | Create incident (idempotent with `clientMutationId`) |
| **Conflict Reports** | `GET` | `/api/conflict-reports` | UC04 | List conflict reports with filters |
| | `GET` | `/api/conflict-reports/:id`| UC04 | Detailed conflict report view |
| | `POST`| `/api/conflict-reports` | UC04 | Create conflict report (idempotent with `clientMutationId`) |
| | `PATCH`| `/api/conflict-reports/:id/status`| UC04 | Update operational triage status |
| **Batch Sync** | `POST` | `/api/sync/batch` | UC02/03/04 | Bulk idempotent synchronizer for mobile devices returning online |


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
