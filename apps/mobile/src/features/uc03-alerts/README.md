# Feature Module: UC03 — Detect and Respond to Wildlife Risk Alert (Mobile)

## 1. Module Responsibility
Handles field responder reception and action logging for wildlife risk alerts:
- Viewing real-time alerts generated from GPS collar geofence breaches.
- Logging operational response actions (e.g., dispatching firecrackers, elephant thunder flares, or fence inspection).
- Offline response caching with automatic batch replay.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 3 (Wildlife Tracking & Alert Lead)
- **Role:** Ranger / Community Liaison Officer (CLO) Field Responder

## 3. Relevant API Endpoints
- `GET /api/alerts?status=ACTIVE` — Fetch open wildlife risk alerts.
- `GET /api/alerts/:id` — Alert details and response history.
- `POST /api/alerts/:id/respond` — Record field response action and update alert status.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `WildlifeRiskAlert`, `AlertResponse`, `CreateAlertResponseDTO`, `RiskLevel`, `AlertStatus`, `ResponseStatus`

## 5. Expected Screen Implementation (Phase 4)
- `screens/AlertDetailScreen.tsx` — Map / coordinate summary, animal details, and response actions.
- `screens/AlertResponseModal.tsx` — Action selector (Initiate Response, En Route, Deterrent Deployed, Resolved).
