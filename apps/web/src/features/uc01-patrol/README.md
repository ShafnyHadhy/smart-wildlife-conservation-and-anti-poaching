# Web Feature Module: UC01 — Monitor and Evaluate Ranger Patrol Activities

## 1. Module Responsibility
Desktop command dashboard for park managers to monitor ranger patrol runs:
- Live patrol status tracking (Active, Scheduled, Completed).
- Route visualization, checkpoint verification, and waypoint history.
- Patrol coverage calculation and under-patrolled gap identification.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 1 (Patrol Operations Lead)
- **Primary Persona:** Park Manager (Desktop Headquarters)

## 3. Relevant API Endpoints
- `GET /api/patrols` — List patrols with status/park/ranger filters.
- `GET /api/patrols/:id` — Aggregated patrol details with route & ordered waypoints.
- `GET /api/patrol-routes` — Pre-approved corridor routes in the park.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `Patrol`, `PatrolRoute`, `Waypoint`, `PatrolStatus`

## 5. Expected Component / Page Architecture
- `pages/PatrolMonitoringPage.tsx` — Full-page patrol operations desk.
- `components/PatrolRouteMap.tsx` — Geographic / SVG map representation of routes and breadcrumbs.
- `components/CoverageSummaryCard.tsx` — Numerical patrol completion score and time analytics.
