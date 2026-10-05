# Smart Wildlife Conservation & Anti-Poaching Monitoring System
# Phase 3 — API Reference Documentation

This document describes the unified REST API foundation established in Phase 3. All endpoints adhere to a standardized 4-tier backend architecture:

$$\text{Route} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{PostgreSQL}$$

---

## 1. Global API Conventions

### Base URL
All API endpoints are mounted under the prefix:
```
http://<host>:<port>/api
```
In development: `http://localhost:5000/api` (proxied in web via Vite at `/api`, and in mobile via `EXPO_PUBLIC_API_URL`).

### Standard Success Response Envelope
All single-item or mutation responses return the standard `ApiResponse<T>` envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard List Response Envelope
All collection responses return the standard `ApiListResponse<T>` envelope:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "count": 12
  }
}
```

### Standard Error Response Envelope
All errors return the standardized error envelope with appropriate HTTP status codes:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | CONFLICT | BAD_REQUEST | DATABASE_ERROR | INTERNAL_ERROR",
    "message": "Human-readable explanation of error",
    "details": [
      {
        "field": "latitude",
        "message": "Latitude must be between -90 and 90"
      }
    ]
  }
}
```

### HTTP Status Code Mapping
| Status Code | Error Code | Description |
|---|---|---|
| `200 OK` | — | Successful query or idempotent operation |
| `201 Created` | — | Successful resource creation |
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON or unparseable input |
| `404 Not Found` | `NOT_FOUND` | Referenced entity or route does not exist |
| `409 Conflict` | `CONFLICT` | Unique constraint violation (e.g. duplicate email/badge) |
| `422 Unprocessable` | `VALIDATION_ERROR` | Request payload failed schema validation (e.g. invalid coordinates, missing fields) |
| `500 Server Error` | `INTERNAL_ERROR` / `DATABASE_ERROR` | Unexpected server failure (internal details logged on server only) |

---

## 2. Health & System Endpoints

### `GET /api/health`
Checks backend service status, uptime, environment, and PostgreSQL connection.

- **Query Parameters:** None
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-05T02:00:00.000Z",
  "database": "connected",
  "uptime": 125.4,
  "environment": "development"
}
```
- **Errors:** `503 Service Unavailable` if database health check fails.

---

## 3. Parks & Administrative Endpoints

### `GET /api/parks`
Retrieves all protected wildlife parks/reserves in the system.

- **Query Parameters:** None
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Yala National Park",
      "province": "Southern / Uva",
      "areaKm2": 978.8,
      "boundaryGeojson": { "type": "Polygon", "coordinates": [...] },
      "createdAt": "2026-10-01T00:00:00.000Z",
      "updatedAt": "2026-10-01T00:00:00.000Z"
    }
  ],
  "meta": { "count": 2 }
}
```

---

## 4. Users & Staff Endpoints

### `GET /api/users`
Retrieves system users and field personnel.

- **Query Parameters:**
  - `role` *(optional, string)*: Filter by `ADMIN`, `DISPATCHER`, `RANGER`, `CLO`, `COMMUNITY_MEMBER`.
  - `parkId` *(optional, UUID)*: Filter staff assigned to a specific park.
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "aaaa0002-0000-0000-0000-000000000002",
      "fullName": "Kasun Perera",
      "email": "kasun.perera@dwlc.gov.lk",
      "phone": "+94771234568",
      "role": "RANGER",
      "parkId": "11111111-1111-1111-1111-111111111111",
      "badgeNumber": "R-YAL-001",
      "isActive": true
    }
  ],
  "meta": { "count": 1 }
}
```

---

## 5. Ranger Patrols & Routes (UC01 Foundation)

### `GET /api/patrols`
Lists ranger patrols with optional status and personnel filters.

- **Query Parameters:**
  - `status` *(optional, string)*: `SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELLED`.
  - `rangerId` *(optional, UUID)*: Filter by lead ranger user ID.
  - `parkId` *(optional, UUID)*: Filter by protected park ID.
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cccc0001-0000-0000-0000-000000000001",
      "routeId": "22220001-0000-0000-0000-000000000001",
      "rangerId": "aaaa0002-0000-0000-0000-000000000002",
      "parkId": "11111111-1111-1111-1111-111111111111",
      "status": "ACTIVE",
      "startedAt": "2026-10-04T05:30:00.000Z",
      "completedAt": null,
      "notes": "Morning coastal perimeter monitoring"
    }
  ],
  "meta": { "count": 1 }
}
```

### `GET /api/patrols/:id`
Retrieves comprehensive details for a specific patrol, including associated ranger, route, and waypoints for the monitoring dashboard without multiple round-trips.

- **URL Parameters:**
  - `id` *(required, UUID)*: The unique patrol ID.
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "cccc0001-0000-0000-0000-000000000001",
    "routeId": "22220001-0000-0000-0000-000000000001",
    "rangerId": "aaaa0002-0000-0000-0000-000000000002",
    "parkId": "11111111-1111-1111-1111-111111111111",
    "status": "ACTIVE",
    "startedAt": "2026-10-04T05:30:00.000Z",
    "completedAt": null,
    "notes": "Morning coastal perimeter monitoring",
    "ranger": {
      "id": "aaaa0002-0000-0000-0000-000000000002",
      "fullName": "Kasun Perera",
      "badgeNumber": "R-YAL-001"
    },
    "route": {
      "id": "22220001-0000-0000-0000-000000000001",
      "name": "Block 1 Coastal Route",
      "waypoints": [
        { "id": "...", "latitude": 6.3721, "longitude": 81.5189, "sequenceOrder": 1, "isMandatory": true }
      ]
    }
  }
}
```
- **Errors:**
  - `404 Not Found` if patrol ID does not exist.
  - `422 Validation Error` if `id` is not a valid UUID.

### `GET /api/patrol-routes`
Lists standardized patrol routes configured for conservation parks.

- **Query Parameters:**
  - `parkId` *(optional, UUID)*: Filter routes belonging to a specific park.
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "22220001-0000-0000-0000-000000000001",
      "parkId": "11111111-1111-1111-1111-111111111111",
      "name": "Block 1 Coastal Route",
      "description": "Perimeter patrol along the southeastern boundary",
      "targetDurationMinutes": 240,
      "parkName": "Yala National Park"
    }
  ],
  "meta": { "count": 1 }
}
```

### `GET /api/patrol-routes/:id`
Retrieves a single patrol route including its ordered checkpoints/waypoints.

- **URL Parameters:**
  - `id` *(required, UUID)*: Route ID.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "22220001-0000-0000-0000-000000000001",
    "name": "Block 1 Coastal Route",
    "waypoints": [ ... ]
  }
}
```

---

## 6. Animals & Telemetry Ingestion (UC03 Foundation)

### `GET /api/animals`
Lists monitored wildlife individuals (elephants, leopards, etc.).

- **Query Parameters:**
  - `parkId` *(optional, UUID)*: Filter animals by home park.
  - `species` *(optional, string)*: Filter by species (e.g. `Elephas maximus maximus`).
- **Request Body:** None
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ffff0001-0000-0000-0000-000000000001",
      "parkId": "11111111-1111-1111-1111-111111111111",
      "species": "Elephas maximus maximus",
      "identifier": "ELE-YAL-001",
      "nickname": "Walagamba",
      "gender": "MALE",
      "status": "TRACKED"
    }
  ],
  "meta": { "count": 1 }
}
```

### `GET /api/animals/:id`
Retrieves details for a single tracked animal.

- **URL Parameters:**
  - `id` *(required, UUID)*: Animal ID.
- **Success Response (`200 OK`):** Returns the animal record or `404 Not Found`.

### `GET /api/animals/:id/locations`
Retrieves recent GPS location history for a given tracked animal.

- **URL Parameters:**
  - `id` *(required, UUID)*: Animal ID.
- **Query Parameters:**
  - `limit` *(optional, integer, default: 50)*: Number of historical records.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "animalId": "ffff0001-0000-0000-0000-000000000001",
      "collarId": "10100001-0000-0000-0000-000000000001",
      "latitude": 6.3812,
      "longitude": 81.5204,
      "recordedAt": "2026-10-04T08:15:00.000Z"
    }
  ],
  "meta": { "count": 1 }
}
```

### `POST /api/animal-locations`
Simulates telemetry transmission from an IoT wildlife GPS collar. Ingests raw coordinates, validates collar assignment, and writes a location record.

> [!NOTE]
> This endpoint forms the telemetry ingestion foundation. Point-in-polygon risk zone evaluation and automated alert dispatching will be attached in UC03.

- **Request Body:**
```json
{
  "animalId": "ffff0001-0000-0000-0000-000000000001",
  "collarId": "10100001-0000-0000-0000-000000000001",
  "latitude": 6.385,
  "longitude": 81.525,
  "recordedAt": "2026-10-05T07:00:00.000Z"
}
```
- **Validation Rules:**
  - `animalId`: valid UUID, must exist in `animals`.
  - `collarId`: valid UUID, must exist in `collars`.
  - Collar must be assigned to the given `animalId` (rejects collar mismatch with `422`).
  - `latitude`: number between $-90.0$ and $90.0$.
  - `longitude`: number between $-180.0$ and $180.0$.
  - `recordedAt`: valid ISO-8601 timestamp string.
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "animalId": "ffff0001-0000-0000-0000-000000000001",
    "collarId": "10100001-0000-0000-0000-000000000001",
    "latitude": 6.385,
    "longitude": 81.525,
    "recordedAt": "2026-10-05T07:00:00.000Z"
  }
}
```

---

## 7. Risk Zones & Wildlife Alerts (UC03 Foundation)

### `GET /api/risk-zones`
Lists defined geofenced zones (e.g. agricultural border, village perimeter, railway corridor).

- **Query Parameters:**
  - `parkId` *(optional, UUID)*: Filter zones by park.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "33330001-0000-0000-0000-000000000001",
      "parkId": "11111111-1111-1111-1111-111111111111",
      "name": "Kataragama Buffer Agriculture Zone",
      "riskLevel": "HIGH",
      "boundaryGeojson": { "type": "Polygon", "coordinates": [...] }
    }
  ],
  "meta": { "count": 1 }
}
```

### `GET /api/alerts`
Lists wildlife geofence breach / risk alerts.

- **Query Parameters:**
  - `status` *(optional, string)*: `ACTIVE`, `ACKNOWLEDGED`, `DISPATCHED`, `RESOLVED`, `FALSE_ALARM`.
  - `animalId` *(optional, UUID)*: Filter alerts triggered by a specific animal.
- **Success Response (`200 OK`):** Returns array of alert records with animal and risk zone metadata.

### `GET /api/alerts/:id`
Retrieves a single alert and its response log.

- **URL Parameters:**
  - `id` *(required, UUID)*: Alert ID.
- **Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "dddd0001-0000-0000-0000-000000000001",
    "animalId": "ffff0001-0000-0000-0000-000000000001",
    "zoneId": "33330001-0000-0000-0000-000000000001",
    "riskLevel": "HIGH",
    "status": "ACTIVE",
    "responses": []
  }
}
```

### `POST /api/alerts/:id/respond`
Records a field action taken by authorized conservation personnel in response to a geofence alert.

- **URL Parameters:**
  - `id` *(required, UUID)*: Target alert ID.
- **Request Body:**
```json
{
  "responderId": "aaaa0002-0000-0000-0000-000000000002",
  "actionTaken": "Dispatched field unit with acoustic deterrents to boundary fence.",
  "status": "INITIATED"
}
```
- **Validation Rules:**
  - Alert must exist in database (`404` if not found).
  - `responderId`: must be a valid user with staff role (`RANGER`, `CLO`, `DISPATCHER`, or `ADMIN`).
  - `status`: valid `ResponseStatus` (`INITIATED`, `EN_ROUTE`, `ON_SCENE`, `RESOLVED`).
  - `actionTaken`: non-empty string.
- **State Transition Logic:**
  - When response status is `INITIATED`, `EN_ROUTE`, or `ON_SCENE`, parent alert status automatically transitions from `ACTIVE` to `DISPATCHED`.
  - When response status is `RESOLVED`, parent alert status transitions to `RESOLVED`.
- **Success Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "alertId": "dddd0001-0000-0000-0000-000000000001",
    "responderId": "aaaa0002-0000-0000-0000-000000000002",
    "actionTaken": "Dispatched field unit with acoustic deterrents...",
    "status": "INITIATED",
    "respondedAt": "2026-10-05T07:15:00.000Z"
  }
}
```

---

## 8. Incidents & Poaching Events (UC02 Foundation)

### `GET /api/incidents`
Lists reported field incidents.

- **Query Parameters:**
  - `status` *(optional, string)*: `SUBMITTED`, `VERIFIED`, `INVESTIGATING`, `CLOSED`.
  - `rangerId` *(optional, UUID)*: Filter by reporting ranger.
- **Success Response (`200 OK`):** Returns list of incident records.

### `GET /api/incidents/:id`
Retrieves a specific incident by ID.

- **URL Parameters:**
  - `id` *(required, UUID)*: Incident ID.
- **Success Response (`200 OK`):** Returns incident record or `404 Not Found`.

### `POST /api/incidents`
Records a field incident reported by rangers. Supports direct online creation and idempotent retries via `clientMutationId`.

- **Request Body:**
```json
{
  "rangerId": "aaaa0002-0000-0000-0000-000000000002",
  "patrolId": "cccc0001-0000-0000-0000-000000000001",
  "incidentType": "WIRE_SNARE",
  "description": "Located wire snare trap concealed near water hole",
  "latitude": 6.3755,
  "longitude": 81.521,
  "reportedAt": "2026-10-05T07:10:00.000Z",
  "clientMutationId": "mut-inc-001"
}
```
- **Validation Rules:**
  - `rangerId`: valid UUID, user must exist and have `RANGER`, `DISPATCHER`, or `ADMIN` role.
  - `patrolId`: optional UUID; if provided, must exist in `patrols`.
  - `incidentType`: must match shared `IncidentType` (`POACHING`, `WIRE_SNARE`, `LOGGING`, `ENCROACHMENT`, `ANIMAL_CARCASS`, `SUSPICIOUS_ACTIVITY`, `OTHER`).
  - `latitude`: $[-90, 90]$.
  - `longitude`: $[-180, 180]$.
  - `reportedAt`: valid ISO-8601 string.
  - `clientMutationId`: optional client-generated idempotency key (1 to 100 chars).
- **Idempotency Guarantee:**
  - If a record with matching `clientMutationId` already exists, returns the existing incident with `200 OK` without creating duplicate records.
- **Success Response (`201 Created` or `200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "rangerId": "aaaa0002-0000-0000-0000-000000000002",
    "incidentType": "WIRE_SNARE",
    "status": "SUBMITTED",
    "latitude": 6.3755,
    "longitude": 81.521,
    "clientMutationId": "mut-inc-001"
  }
}
```

---

## 9. Community Conflict Reports (UC04 Foundation)

### `GET /api/conflict-reports`
Lists human-wildlife conflict reports submitted by community members or field officers.

- **Query Parameters:**
  - `status` *(optional, string)*: `SUBMITTED`, `UNDER_REVIEW`, `RESPONDING`, `RESOLVED`, `CLOSED`.
  - `parkId` *(optional, UUID)*: Filter reports by adjacent conservation park.
- **Success Response (`200 OK`):** Returns list of conflict reports.

### `GET /api/conflict-reports/:id`
Retrieves a single conflict report by ID.

- **URL Parameters:**
  - `id` *(required, UUID)*: Conflict report ID.
- **Success Response (`200 OK`):** Returns report record or `404 Not Found`.

### `POST /api/conflict-reports`
Submits a new human-wildlife conflict report. Supports direct online creation and idempotent retries via `clientMutationId`.

- **Request Body:**
```json
{
  "communityMemberId": "bbbb0001-0000-0000-0000-000000000001",
  "parkId": "11111111-1111-1111-1111-111111111111",
  "conflictType": "CROP_RAIDING",
  "description": "Herd of wild elephants breached banana plantation boundary",
  "latitude": 6.368,
  "longitude": 81.512,
  "reportedAt": "2026-10-05T07:20:00.000Z",
  "clientMutationId": "mut-cr-001"
}
```
- **Validation Rules:**
  - `communityMemberId`: valid UUID, must exist in `users`.
  - `parkId`: valid UUID, must exist in `parks`.
  - `conflictType`: must match `ConflictType` (`CROP_RAIDING`, `PROPERTY_DAMAGE`, `LIVESTOCK_ATTACK`, `HUMAN_INJURY`, `ANIMAL_INJURY`, `SIGHTING_NEAR_VILLAGE`, `OTHER`).
  - `latitude`: $[-90, 90]$.
  - `longitude`: $[-180, 180]$.
  - `reportedAt`: valid ISO-8601 string.
  - `clientMutationId`: optional client-generated idempotency key (1 to 100 chars).
- **Idempotency Guarantee:**
  - If a report with matching `clientMutationId` exists, returns the existing record with `200 OK`.
- **Success Response (`201 Created` or `200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "communityMemberId": "bbbb0001-0000-0000-0000-000000000001",
    "conflictType": "CROP_RAIDING",
    "status": "SUBMITTED",
    "clientMutationId": "mut-cr-001"
  }
}
```

### `PATCH /api/conflict-reports/:id/status`
Updates the operational triage status of a conflict report.

- **URL Parameters:**
  - `id` *(required, UUID)*: Conflict report ID.
- **Request Body:**
```json
{
  "status": "UNDER_REVIEW"
}
```
- **Allowed Statuses:** `SUBMITTED`, `UNDER_REVIEW`, `RESPONDING`, `RESOLVED`, `CLOSED`.
- **Success Response (`200 OK`):** Returns updated conflict report object.

---

## 10. Offline Batch Synchronization (`/api/sync/batch`)

### `POST /api/sync/batch`
Synchronizes an ordered batch of offline-enqueued mutations from mobile field devices.

- **Request Body (`BatchSyncRequestDTO`):**
```json
{
  "operations": [
    {
      "clientMutationId": "sync-batch-001",
      "entityType": "INCIDENT",
      "operationType": "CREATE",
      "payload": {
        "rangerId": "aaaa0002-0000-0000-0000-000000000002",
        "incidentType": "WIRE_SNARE",
        "description": "Snare found in dense bush during off-grid patrol",
        "latitude": 6.375,
        "longitude": 81.52,
        "reportedAt": "2026-10-05T06:00:00.000Z"
      },
      "createdAt": "2026-10-05T06:00:00.000Z"
    },
    {
      "clientMutationId": "sync-batch-002",
      "entityType": "CONFLICT_REPORT",
      "operationType": "CREATE",
      "payload": {
        "communityMemberId": "bbbb0001-0000-0000-0000-000000000001",
        "parkId": "11111111-1111-1111-1111-111111111111",
        "conflictType": "CROP_RAIDING",
        "description": "Crop raiding recorded while mobile was offline",
        "latitude": 6.368,
        "longitude": 81.512,
        "reportedAt": "2026-10-05T06:15:00.000Z"
      },
      "createdAt": "2026-10-05T06:15:00.000Z"
    }
  ]
}
```

### Supported Offline Operations
- `CREATE` on `INCIDENT`
- `CREATE` on `CONFLICT_REPORT`
- `CREATE` on `ALERT_RESPONSE`

### Processing Semantics & Guarantees
1. **Strict Idempotency:** Each operation is checked against `sync_operations` (and underlying tables) using `clientMutationId`. If already processed, the prior status (`SYNCHRONIZED`) and entity ID are returned immediately without reprocessing.
2. **Failure Isolation:** Each operation executes in an independent transactional scope. If operation #2 fails validation (e.g. invalid coordinates), operation #1 still commits successfully. The batch response returns individual results for each operation.
3. **Audit Trail:** Every processed or failed sync operation is permanently recorded in the `sync_operations` audit table.

### Success Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "clientMutationId": "sync-batch-001",
        "status": "SYNCHRONIZED",
        "entityId": "e001..."
      },
      {
        "clientMutationId": "sync-batch-002",
        "status": "FAILED",
        "error": "Latitude must be between -90 and 90"
      }
    ]
  }
}
```
