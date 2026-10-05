# Web Feature Module: UC03 — Wildlife Risk Alert Monitoring & Dispatch

## 1. Module Responsibility
Real-time / polling command console for wildlife risk alerts:
- Monitoring animal geofence intrusions (e.g. elephants entering sugarcane buffer zones).
- Reviewing risk levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- Dispatching field response teams and tracking response status.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 3 (Wildlife Tracking & Alert Lead)
- **Primary Persona:** Dispatcher & Park Manager

## 3. Relevant API Endpoints
- `GET /api/alerts` — Fetch risk alerts with status and animal filters.
- `GET /api/alerts/:id` — Alert details and full response history log.
- `POST /api/alerts/:id/respond` — Record response action taken by dispatched staff.
- `GET /api/risk-zones` — High-risk agricultural and village boundaries.
- `GET /api/animals` — Monitored wildlife directory.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `WildlifeRiskAlert`, `RiskZone`, `AlertResponse`, `RiskLevel`, `AlertStatus`

## 5. Expected Component / Page Architecture
- `pages/RiskAlertsPage.tsx` — Real-time operational alert desk with severity filters.
- `components/GeofenceAlertCard.tsx` — Card showing animal name, buffer zone, and age.
- `components/DispatchResponseModal.tsx` — Response form selecting ranger unit and deterrent action.
