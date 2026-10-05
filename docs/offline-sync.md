# Smart Wildlife Conservation & Anti-Poaching Monitoring System
# Phase 3 — Offline Synchronization Architecture & Specification

This document details the offline synchronization architecture implemented in Phase 3 for field operations across Sri Lankan national parks and conservation reserves.

---

## 1. Why Offline Operation is Required

Field rangers and community liaisons operating in protected areas such as **Yala National Park** and **Kumana National Park** frequently encounter zero or intermittent cellular connectivity. These areas feature:
- Dense tropical dry zone forests and rocky outcrops that obstruct cellular signals.
- Vast border buffers and coastal sectors with no cell towers.
- Dangerous field situations (poachers, aggressive bull elephants, active snare lines) where rangers must log observations **immediately** without waiting for network access.
- Critical human-elephant conflict incidents (e.g. crop raiding, village boundary breaches) where villagers need to record time-stamped details immediately before evidence is disturbed.

The system therefore implements an **offline-first local queue and replay architecture** ensuring zero data loss and guaranteed eventual consistency.

---

## 2. Local Mobile Queue

On mobile devices (React Native + Expo), mutations that cannot be immediately sent over the network are placed into a local, durable queue:

```
[User Action in Field]
         ↓
 [Mobile API Client]
         │ (isOnline === false or Network Timeout)
         ▼
[Persistent Offline Queue]
         │ (Stores in Expo FileSystem / durable storage)
         ▼
[Pending Queue Items Surviving App Restart]
```

### Queue Entry Structure
Each item in the mobile offline queue contains:
```typescript
interface QueuedMutation {
  localId: string;             // Local UUID for queue indexing
  clientMutationId: string;    // Globally unique idempotency key
  entityType: EntityType;      // 'INCIDENT' | 'CONFLICT_REPORT' | 'ALERT_RESPONSE'
  operationType: OperationType;// 'CREATE' | 'UPDATE' | 'DELETE'
  payload: Record<string, any>;// Exact JSON payload for the mutation
  createdAt: string;           // ISO timestamp when user recorded the action
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retryCount: number;          // Number of sync attempts
  lastError?: string;          // Error message from server if validation failed
}
```

### Persistence Guarantee
The queue uses persistent file storage via `expo-file-system` (with fallback to `localStorage` on web or in-memory in mock environments). Queue items are written to disk upon enqueueing and survive app crashes, battery exhaustion, and system restarts.

---

## 3. The `clientMutationId` Idempotency Key

Every mutation created on a client device is assigned a cryptographically unique `clientMutationId` (UUID v4 or nanoid) **at the moment of creation**:
- For example: `c6f2a890-a3bc-4251-b84f-e23a67d0f10b`
- This ID remains permanently associated with that specific user action across all offline retries, network reconnects, and batch submissions.
- The `clientMutationId` is passed in direct POST requests and in offline batch payloads.

---

## 4. Batch Synchronization (`POST /api/sync/batch`)

When connectivity is restored, the mobile `syncService` retrieves all `PENDING` mutations and sends them to the backend in an atomic HTTP POST batch request:

```json
POST /api/sync/batch
{
  "operations": [
    {
      "clientMutationId": "mut-001",
      "entityType": "INCIDENT",
      "operationType": "CREATE",
      "payload": {
        "rangerId": "aaaa0002-0000-0000-0000-000000000002",
        "incidentType": "WIRE_SNARE",
        "description": "Found active wire snare on patrol path",
        "latitude": 6.375,
        "longitude": 81.52,
        "reportedAt": "2026-10-05T06:00:00.000Z"
      },
      "createdAt": "2026-10-05T06:00:00.000Z"
    }
  ]
}
```

Batch sync minimizes mobile radio battery consumption by bundling up to dozens of field entries into a single compressed HTTP round-trip rather than making separate connections over weak 2G/3G links.

---

## 5. Strict Idempotency Implementation

Mobile networks in national parks often drop connections *after* the server receives and commits a request but *before* the mobile device receives the `200 OK` response. When the client reconnects, it inevitably retries sending the same operation.

The backend enforces strict idempotency at two levels:

### Level 1: The `sync_operations` Audit Table
Before processing any operation, the `syncService` queries:
```sql
SELECT * FROM sync_operations WHERE client_mutation_id = $1;
```
If an existing record is found with status `SYNCHRONIZED`:
1. The server **does not re-execute** the domain logic or insert another row.
2. It returns the already-created `entityId` and status `SYNCHRONIZED`.

### Level 2: Domain Entity Secondary Lookup
If not found in `sync_operations`, the service checks the domain table directly (e.g. `incidents.client_mutation_id` or `conflict_reports.client_mutation_id`). If the entity exists:
1. It records the existing entity in `sync_operations`.
2. It returns status `SYNCHRONIZED` with the existing entity ID.

This guarantees that **no matter how many times a device retries a batch, duplicate domain records will never be created**.

---

## 6. Retry Behaviour

The mobile `syncService` implements the following lifecycle for queued items:

```
[User Action] → Status: PENDING
                      ↓
               Network Online
                      ↓
               Status: SYNCING (prevents concurrent submission)
                      ↓
              POST /api/sync/batch
             /                    \
  Server Result: SYNCHRONIZED     Server Result: FAILED
           ↓                               ↓
   Remove from Queue              Increment retryCount
                                  Record lastError
                                  Status: FAILED / PENDING
```

- When the server confirms an item as `SYNCHRONIZED`, it is immediately deleted from local persistent storage (`offlineQueue.remove(item.localId)`).
- If the batch request fails due to a network drop (e.g. timeout, no DNS), all items remain in `PENDING` state and will be retried on the next reconnect cycle.

---

## 7. Failure Handling & Isolation

A critical requirement is that **one malformed mutation in a batch must not fail or roll back the entire batch**:

1. **Independent Operation Processing:** Each operation in `syncService.processBatch()` is evaluated inside an isolated `try...catch` block.
2. **Graceful Error Capture:** If an operation fails schema validation (e.g. latitude out of range, nonexistent ranger ID):
   - The error is logged to `sync_operations` with status `FAILED` and `error_message`.
   - The server response returns `{ clientMutationId: "...", status: "FAILED", error: "..." }`.
3. **Valid Siblings Commit:** Valid operations preceding or following the failing operation in the same batch are committed normally and return `{ status: "SYNCHRONIZED", entityId: "..." }`.
4. **Mobile Queue Response:** The mobile client only removes items confirmed `SYNCHRONIZED`. Items marked `FAILED` are retained in the local queue with their `lastError` populated, allowing field officers or the app UI to inspect and correct the entry.

---

## 8. Online / Offline Transitions

The mobile application detects and handles connectivity transitions through the following triggers:

1. **Foreground / App Launch Sync:** Whenever the app starts up, `syncService.syncPending()` runs to clear any mutations queued during prior offline sessions.
2. **Connectivity Event Sync:** When the mobile network state transitions from `offline` to `online` (simulated via the top bar toggle or detected via netinfo), `syncPending()` automatically triggers.
3. **Manual Sync Trigger:** A manual "Sync Now" button on the UI allows rangers to force a sync attempt whenever they spot a cellular signal.
4. **Transparent Online-First API Client:**
   - In `apps/mobile/src/api/apiClient.ts`, mutation helper methods (`createIncident`, `createConflictReport`, `respondToAlert`) first check network availability.
   - If online, they submit directly to the REST endpoint. If direct submission fails due to network loss, they automatically enqueue the payload into the persistent offline queue without user interruption.
   - If offline, they enqueue directly and notify the user with an "Enqueued for sync" response.

---

## 9. Supported Offline Operations

In Phase 3, the offline synchronization system supports the exact mutations required for the field use cases:

| Entity Type | Operation Type | Target API / Service | Payload Requirements |
|---|---|---|---|
| `INCIDENT` | `CREATE` | `POST /api/incidents` | `rangerId`, `incidentType`, `description`, `latitude`, `longitude`, `reportedAt`, `patrolId` (optional) |
| `CONFLICT_REPORT` | `CREATE` | `POST /api/conflict-reports` | `communityMemberId`, `parkId`, `conflictType`, `description`, `latitude`, `longitude`, `reportedAt` |
| `ALERT_RESPONSE` | `CREATE` | `POST /api/alerts/:id/respond` | `alertId`, `responderId`, `actionTaken`, `status` |

Read requests (e.g. fetching route maps, querying active alerts) require network access and are not queued for offline replay.
