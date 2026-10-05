# Web Feature Module: UC02 — Review Poaching and Wildlife Incidents

## 1. Module Responsibility
Desktop review desk for park managers and head wardens:
- Triage incoming ranger field incident reports (snares, carcasses, campfires, illegal logging).
- Inspect high-resolution field photos and GPS coordinates.
- Update investigation statuses (`SUBMITTED`, `REVIEWED`, `CLOSED`).

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 2 (Incident Response Lead)
- **Primary Persona:** Park Manager & Head Warden

## 3. Relevant API Endpoints
- `GET /api/incidents` — List all filed incidents with status/ranger filters.
- `GET /api/incidents/:id` — Full incident record with photos and patrol metadata.
- `POST /api/incidents` — Direct incident creation if filed from desktop.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `Incident`, `IncidentType`, `IncidentStatus`

## 5. Expected Component / Page Architecture
- `pages/IncidentsReviewPage.tsx` — Filterable table with status badges and search.
- `components/IncidentDetailModal.tsx` — Photo viewer, coordinate map point, and ranger notes.
- `components/IncidentStatusDropdown.tsx` — Triage status transition selector.
