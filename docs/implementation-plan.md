# Smart Wildlife Conservation and Anti-Poaching Monitoring System
## Five-Day Phased Implementation Plan

- **Project:** Smart Wildlife Conservation and Anti-Poaching Monitoring System
- **Focus Area:** Sri Lankan Wildlife Conservation System
- **Target Coverage:** $\ge 80\%$ Unit Test Coverage on Domain Services & Business Logic
- **Document Version:** 1.0.0
- **Status:** Proposed (Awaiting Approval)

---

## 1. Plan Overview & Milestone Roadmap

This roadmap defines the day-by-day implementation strategy across 5 working phases. Each day delivers a standalone, testable milestone that increments the system towards full end-to-end completion of the four core business use cases (UC01, UC02, UC03, UC04).

```
┌────────────────────────────────────────────────────────────────────────┐
│ Day 1: Foundation, Data Layer, Monorepo Scaffolding & Contracts       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Day 2: UC01 - Patrol Monitoring, GPS Simulation & Manager Dashboard    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Day 3: UC02 - Poaching Incident Reporting & Offline Sync Engine        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Day 4: UC03 - Animal GPS Collar Telemetry, Risk Alerts & Responses     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Day 5: UC04 - Conflict Reporting, System Integration & Testing (≥80%)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Daily Execution Breakdown

### Day 1: Project Scaffolding, Core Infrastructure & Database Schema

#### Objectives
- Initialize the monorepo workspace structure (`apps/backend`, `apps/web`, `apps/mobile`, `packages/shared`).
- Configure TypeScript configurations, ESLint, and test runners (Vitest/Jest).
- Implement PostgreSQL schema migrations and seed scripts with realistic Sri Lankan national park data (Yala / Wilpattu sectors).
- Establish backend layered skeleton: database pool, base controller/service/repository classes, and shared Zod validation schemas.

#### Detailed Tasks
1. **Repository Setup:**
   - Initialize root `package.json` with npm/pnpm workspaces.
   - Setup `packages/shared` with common TypeScript interfaces (`Patrol`, `Incident`, `RiskAlert`, `ConflictReport`, `LocationPoint`) and validation schemas.
2. **Database & Migrations:**
   - Configure PostgreSQL connection pool in `apps/backend/src/config/database.ts`.
   - Write SQL migrations creating `rangers`, `patrols`, `patrol_locations`, `incidents`, `high_risk_zones`, `tracked_animals`, `animal_telemetry_logs`, `wildlife_risk_alerts`, and `conflict_reports`.
   - Create comprehensive database seed scripts (`db/seeds/initial_seed.sql`) containing:
     - 5 Rangers with call signs (e.g., "Ranger Sunil", "Ranger Kasun").
     - 4 High-Risk Zones (e.g., "Kataragama Buffer Zone", "Kittulkote Farm Boundary").
     - 3 Tracked Asian Elephants and 2 Leopards with collar IDs.
     - 2 Historical and 1 Active Patrol sessions.
3. **Backend Base Layer:**
   - Express server entry point with JSON parsing, CORS, static uploads serving, and centralized error handler middleware.
4. **Day 1 Verification Gate:**
   - Database connection tests succeed.
   - Seed script executes cleanly and populates all tables.
   - Shared package builds and types are accessible by backend and web apps.

---

### Day 2: UC01 - Monitor and Evaluate Ranger Patrol Activities

#### Objectives
- Implement backend service, repository, and controller for Patrols.
- Create realistic GPS location simulation service for active patrols.
- Build the web desktop dashboard for the Park Manager with interactive map and coverage metrics.

#### Detailed Tasks
1. **Backend Implementation (UC01):**
   - `PatrolRepository`: Queries for active patrols, location history, and patrol route coordinates.
   - `PatrolService`:
     - Calculate patrol progress and coverage score against assigned target route sectors.
     - Evaluate ranger location staleness (Active if $< 15$ min, Stale if $15 - 60$ min, Unavailable if $> 60$ min).
     - Provide fallback when ranger location is unavailable or outdated.
   - `PatrolController` & Routes (`/api/patrols`):
     - `GET /api/patrols` (list with filters by status, ranger, date).
     - `GET /api/patrols/:id` (individual patrol inspection with breadcrumb trail).
     - `GET /api/patrols/overview/live` (live snapshot of all patrolling rangers).
     - `POST /api/patrols/:id/telemetry` (ingest live/simulated coordinates).
2. **Simulated Ranger Movement Engine:**
   - Background utility (`src/simulation/rangerMovementSimulator.ts`) generating realistic progressive latitude/longitude coordinates along Sri Lankan park trails.
3. **Web Frontend (Park Manager View):**
   - Header with operational status and active patrol tally.
   - Interactive Map Viewer: Renders assigned boundary polygons, ranger breadcrumb paths, and color-coded status markers (Active = Emerald, Stale = Amber, Signal Lost = Crimson).
   - Patrol Detail Drawer: Shows start time, elapsed duration, distance covered, and under-patrolled zone warnings.
   - Filter bar: Filter by ranger, patrol status, and date.
4. **Day 2 Verification Gate:**
   - Unit tests for `PatrolService` pass (staleness logic, coverage computation).
   - Web UI connects to `/api/patrols` and correctly visualizes live ranger positions and status tags.

---

### Day 3: UC02 - Report Wildlife/Poaching Incident & Offline Sync Engine

#### Objectives
- Build mobile incident reporting interface (Ranger persona) with camera/photo picker and location capture.
- Implement the reusable mobile offline pending-sync queue.
- Implement backend incident ingestion with idempotency and duplicate protection.

#### Detailed Tasks
1. **Backend Implementation (UC02):**
   - `IncidentRepository` & `IncidentService`:
     - Validate incident data (category, coordinates, severity, description).
     - Prevent duplicate submissions via unique `client_mutation_id`.
     - File storage utility for incident photo uploads (local file system storage).
   - `IncidentController` & Routes (`/api/incidents`):
     - `POST /api/incidents` (multipart or JSON with Base64/uploaded URL).
     - `GET /api/incidents` (search and filter by severity, type, and date).
2. **Mobile Offline Synchronization Engine (Shared Component):**
   - Create `apps/mobile/src/offline/syncQueue.ts`:
     - Persistent storage using SQLite / AsyncStorage.
     - Actions: `enqueueOperation()`, `getPendingOperations()`, `markAsSynced()`, `markAsFailed()`.
   - Create `apps/mobile/src/offline/syncService.ts`:
     - Listens to connectivity transitions.
     - Replays pending operations in FIFO order with retry backoff.
     - Triggers server sync and marks local queue records as `SYNCED`.
3. **Mobile Screen (UC02 - Ranger Incident Form):**
   - Form fields: Incident Type selector (Poaching Trap, Animal Carcass, Illegal Logging, Encroachment), Description, Severity.
   - Location Selector: Auto-detects GPS; allows manual coordinate entry or map pin drop if GPS is unavailable.
   - Photo Attachment: Camera capture or gallery selection with preview.
   - Offline Submission Banner: Informs the ranger when report is queued locally due to lack of network.
4. **Day 3 Verification Gate:**
   - Disconnect network in mobile app / mock offline toggle $\rightarrow$ Submit incident $\rightarrow$ Verify queued in local storage.
   - Reconnect network $\rightarrow$ Verify automatic sync to backend $\rightarrow$ Verify record appears in PostgreSQL database without duplicates.
   - Backend unit tests for `IncidentService` and idempotency logic pass.

---

### Day 4: UC03 - Detect and Respond to Wildlife Risk Alert

#### Objectives
- Implement animal GPS collar telemetry ingestion and automated geofence risk detection.
- Build simulated GPS collar telemetry generator (e.g., Asian Elephants nearing village boundaries).
- Implement responder alert assessment, response recording, and offline response logging.

#### Detailed Tasks
1. **Backend Implementation (UC03):**
   - `HighRiskZoneRepository`: Fetch configured agricultural buffer zones and settlement perimeters.
   - `AlertEvaluationEngine` (`src/services/alertEvaluationEngine.ts`):
     - Calculates Haversine distance from animal collar coordinates to high-risk zone centroids and checks polygon boundaries.
     - Generates `wildlife_risk_alerts` record when an animal enters a high-risk zone.
     - Debounce logic: Avoids generating flood alerts if an animal hovers at the zone boundary within 30 minutes.
     - In-memory event dispatcher to notify assigned rangers / community officers.
   - Alert Response Service:
     - Allows responders to acknowledge, assign, add field response notes, and resolve alerts.
     - Supports offline responses with `client_mutation_id`.
   - `AlertController` & Routes (`/api/alerts`, `/api/animals/telemetry`, `/api/zones`).
2. **Collar Telemetry Simulator:**
   - Background task or manual API trigger (`/api/simulator/tick`) that moves tracked animals across safe zones into high-risk agricultural corridors to test alert detection.
3. **Web & Mobile Alert Interfaces:**
   - Web: Operational alerts ticker with audible/visual pulse for new high-severity intrusion alerts.
   - Mobile (Ranger / Community Liaison Officer): Alert detail view with distance to animal, animal details, and form to record field response actions (Dispatched firecrackers, herd guided back to reserve, etc.).
4. **Day 4 Verification Gate:**
   - Telemetry simulator steps animal into high-risk zone $\rightarrow$ Backend detects intrusion $\rightarrow$ Alert is created in database.
   - Ranger submits alert response while offline $\rightarrow$ Queues locally $\rightarrow$ Synchronizes when online.
   - Unit tests for geofence calculation, alert debounce, and response state machine pass.

---

### Day 5: UC04 - Human-Wildlife Conflict, End-to-End Integration & Testing

#### Objectives
- Implement community conflict reporting (UC04) with validation and duplicate detection.
- Execute full end-to-end integration and polish UI across Web and Mobile.
- Achieve $\ge 80\%$ unit test coverage on core business logic.
- Conduct final walkthrough and documentation verification.

#### Detailed Tasks
1. **Backend Implementation (UC04):**
   - `ConflictReportService`:
     - Validates community report input (reporter name, contact, incident type, coordinates).
     - Intelligent Duplicate Detection: Checks if another conflict report exists within a $1.5\text{ km}$ radius reported within the last 6 hours; automatically flags as `potential_duplicate_of`.
     - Supports offline submissions.
   - `ConflictController` & Routes (`/api/conflicts`).
2. **Community Mobile / Web Portal (UC04):**
   - Clean, user-friendly conflict reporting form for community members.
   - Field for conflict type (Crop Damage, Property Damage, Village Intrusion, Human Injury).
   - Review and submit step with summary confirmation.
   - Offline queue integration.
3. **Testing & Coverage Hardening ($\ge 80\%$ Target):**
   - Write comprehensive unit tests for all business services:
     - `PatrolService.test.ts` (coverage scores, stale locations, route filtering).
     - `IncidentService.test.ts` (validation, idempotency, photo handling).
     - `AlertEvaluationEngine.test.ts` (zone boundary checks, debounce, severity rules).
     - `ConflictReportService.test.ts` (duplicate detection logic, validation).
     - `LocationUtils.test.ts` (Haversine math precision, polygon containment).
   - Run test coverage reporter (`vitest run --coverage` or `jest --coverage`) and verify $\ge 80\%$ on all service modules.
4. **Final System Polish:**
   - Verify all four use cases end-to-end.
   - Ensure clean build without lint errors or broken imports.
   - Verify sample demo scripts and comprehensive documentation.

---

## 3. Risk Management & Pre-Implementation Checklist

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **GIS / Coordinate Complexity** | Delays caused by heavy GIS extensions (PostGIS) or native library builds. | Use standard `NUMERIC(10, 7)` columns and pure TypeScript/SQL Haversine math. Completely removes native binary dependencies. |
| **Mobile Offline Sync Flakiness** | Data loss, duplicate records upon re-connection. | Enforce client-generated UUID `client_mutation_id` on all mutations; backend applies unique constraint and returns existing record on duplicates. |
| **GPS Availability in Mobile Simulators** | Location unavailable during testing on laptops. | Provide automatic fallback to interactive map selection and pre-seeded Sri Lankan park coordinates. |
| **Test Coverage Deficit** | Failing university requirement for $\ge 80\%$ coverage. | Focus unit tests directly on domain services and pure utility functions (`services/*` and `utils/*`), which contain the core business rules without requiring heavy HTTP or UI mocks. |
