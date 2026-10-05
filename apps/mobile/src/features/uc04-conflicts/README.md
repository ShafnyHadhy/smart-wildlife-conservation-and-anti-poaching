# Feature Module: UC04 — Report Human-Wildlife Conflict (Mobile)

## 1. Module Responsibility
Handles human-wildlife conflict reporting for villagers and liaison officers:
- Logging crop raids, elephant boundary incursions, property damage, and livestock attacks.
- Offline queuing when community members have zero cellular reception.
- Idempotent deduplication via `clientMutationId`.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 4 (Community Liaison & Conflict Lead)
- **Role:** Community Member & CLO Mobile Submissions

## 3. Relevant API Endpoints
- `POST /api/conflict-reports` — Create conflict report (idempotent with `clientMutationId`).
- `GET /api/conflict-reports` — List submitted conflict reports.
- `PATCH /api/conflict-reports/:id/status` — Triage status updates.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `ConflictReport`, `CreateConflictReportDTO`, `ConflictType`, `ConflictStatus`

## 5. Expected Screen Implementation (Phase 4)
- `screens/ConflictReportFormScreen.tsx` — Community-friendly submission form with high-contrast buttons.
- `screens/ConflictListScreen.tsx` — Recent conflict reports submitted by villagers in this sector.
