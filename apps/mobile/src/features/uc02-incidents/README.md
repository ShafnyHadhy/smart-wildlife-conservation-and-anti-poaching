# Feature Module: UC02 — Report Wildlife/Poaching Incident (Mobile)

## 1. Module Responsibility
Handles field incident submissions by rangers:
- Logging wire snares, carcasses, illegal logging, and poaching activity.
- Capturing GPS coordinates and optional photo evidence URI.
- Direct submission when online or enqueueing to the persistent offline queue when disconnected.
- Local queue inspection and retry management.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 2 (Incident Response Lead)
- **Role:** Ranger Incident Reporting

## 3. Relevant API Endpoints
- `POST /api/incidents` — Direct incident creation (idempotent with `clientMutationId`).
- `GET /api/incidents?rangerId=:id` — View historical incidents logged by current ranger.
- `POST /api/sync/batch` — Used by shared `syncService` for offline batch replay.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `Incident`, `CreateIncidentDTO`, `IncidentType`, `IncidentStatus`

## 5. Expected Screen Implementation (Phase 4)
- `screens/IncidentReportFormScreen.tsx` — Form with incident type picker, coordinate display, and photo picker.
- `screens/IncidentDetailScreen.tsx` — Detailed view of an incident report and sync status.
- `components/IncidentTypeSelector.tsx` — Outdoor touch buttons for quick category selection.
