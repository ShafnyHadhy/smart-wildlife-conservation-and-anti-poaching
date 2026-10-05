# Web Feature Module: UC04 — Human-Wildlife Conflict Triage & Review

## 1. Module Responsibility
Community liaison console for triaging human-wildlife conflict incidents:
- Reviewing crop damage, fence breaches, and village elephant encounters.
- Tracking conflict statuses (`SUBMITTED`, `UNDER_REVIEW`, `RESPONDING`, `RESOLVED`, `CLOSED`).
- Coordinating mitigation (e.g. trench repair, electric fence maintenance, acoustic flares).

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 4 (Community Liaison & Conflict Lead)
- **Primary Persona:** Community Liaison Officer (CLO) & Park Manager

## 3. Relevant API Endpoints
- `GET /api/conflict-reports` — List submitted reports with status filters.
- `GET /api/conflict-reports/:id` — Detailed report with village location and caller notes.
- `PATCH /api/conflict-reports/:id/status` — Operational status transition.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `ConflictReport`, `ConflictType`, `ConflictStatus`

## 5. Expected Component / Page Architecture
- `pages/ConflictReportsPage.tsx` — Triage queue showing incoming reports and status filters.
- `components/ConflictReportCard.tsx` — Village name, conflict type, and reported timestamp.
- `components/ConflictStatusTransitionModal.tsx` — Form updating resolution state and response actions.
