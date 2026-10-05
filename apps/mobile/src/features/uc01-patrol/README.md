# Feature Module: UC01 — Monitor and Evaluate Ranger Patrol Activities (Mobile)

## 1. Module Responsibility
Handles field ranger patrol tracking on mobile devices:
- Viewing assigned patrol routes and checkpoints.
- Starting, pausing, and concluding patrol runs.
- Recording periodic GPS breadcrumb coordinates.
- Caching waypoints locally during off-grid patrols.

## 2. Team Member Ownership
- **Responsible Student / Lead:** Team Member 1 (Patrol Operations Lead)
- **Role:** Ranger Mobile Field Tracking

## 3. Relevant API Endpoints
- `GET /api/patrols?rangerId=:id` — Fetch patrols assigned to the active ranger.
- `GET /api/patrols/:id` — Fetch patrol details with route and checkpoints.
- `GET /api/patrol-routes` — Fetch pre-approved routes in the park.

## 4. Relevant Shared Contracts (`@wildlife/shared`)
- `Patrol`, `PatrolRoute`, `Waypoint`, `PatrolStatus`

## 5. Expected Screen Implementation (Phase 4)
- `screens/ActivePatrolScreen.tsx` — Shows current route checkpoints, elapsed time, and GPS breadcrumbs.
- `screens/PatrolHistoryScreen.tsx` — Displays recent completed patrol logs.
- `components/PatrolRouteMap.tsx` — Lightweight coordinate list / waypoint checklist.
