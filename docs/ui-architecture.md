# UI Architecture & Team Feature Structure

## Overview
This document outlines the shared UI foundation, navigation architecture, component standards, and modular feature folder ownership for the Smart Wildlife Conservation and Anti-Poaching Monitoring System.

This architecture enables four team members to independently implement their assigned business use cases (UC01 through UC04) without merge conflicts, code duplication, or architecture drift.

---

## 1. Mobile Navigation Architecture

The mobile application (`apps/mobile`) is designed for field rangers operating in remote conservation environments (e.g., Yala and Wilpattu National Parks).

### 5-Tab Fixed Navigation
Navigation is managed via `src/navigation/AppNavigator.tsx` and rendered by `src/components/navigation/BottomTabBar.tsx`. The 5 tabs are strictly:

| Tab Name | Identifier | Icon / Symbol | Primary Screen Shell | Future Feature Mapping |
| :--- | :--- | :---: | :--- | :--- |
| **HOME** | `HOME` | ⌂ | `HomeScreen.tsx` | Operational overview, duty stats, quick actions |
| **ALERTS** | `ALERTS` | ⚠ | `AlertsScreen.tsx` | Telemetry risk alerts, buffer zone breaches (UC03) |
| **REPORTS** | `REPORTS` | 📋 | `ReportsScreen.tsx` | Hub for field reports: incidents (UC02) & conflicts (UC04) |
| **PROFILE** | `PROFILE` | 👤 | `ProfileScreen.tsx` | Ranger identity, assigned park, sync queue summary |
| **MENU** | `MENU` | ☰ | `MenuScreen.tsx` | Operational settings, offline sync trigger, help & about |

### Key Principles for Mobile
1. **Low Cognitive Load**: High-contrast, clean dark theme (`#020617` background) optimized for bright outdoor daylight and low-light night patrols.
2. **Large Touch Targets**: Buttons and tab targets exceed 48x48dp for easy thumb interaction with gloves or in moving patrol vehicles.
3. **Screen Container**: All screens wrap their content in `<ScreenContainer scrollable={true|false}>`, ensuring consistent safe area insets, background, and padding.
4. **Offline First**: The persistent `OfflineBanner` is visible when disconnected, informing the ranger that mutations are queued safely.

---

## 2. Web Dashboard Navigation Architecture

The web application (`apps/web`) is desktop-first, tailored for Park Managers and Community Liaison Officers in the Park Headquarters command room.

### Navigation Shell
The layout is orchestrated by `src/components/layout/DashboardLayout.tsx`:
- **Sidebar (`src/components/layout/Sidebar.tsx`)**: Left navigation bar (width `16rem` / `w-64`) with persistent active state indicators and alert badges.
- **TopBar (`src/components/layout/TopBar.tsx`)**: Shows park identity, system time, live backend health status, and a manual refresh trigger.
- **Main Viewport**: Scrollable workspace with max-width containment (`max-w-7xl`).

### Navigational Views

| View Name | Page Component | Target User Role | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `DashboardHome.tsx` | Park Manager | Operational snapshot, active stats, quick summaries |
| **Patrol Monitoring** | `PatrolsPage.tsx` | Park Manager / Dispatcher | Live ranger sweeps, designated corridors (UC01) |
| **Wildlife / Poaching** | `IncidentsPage.tsx` | Park Manager / Chief Warden | Poaching traps, snares, evidence photos (UC02) |
| **Wildlife Risk Alerts** | `AlertsPage.tsx` | Wildlife Officer / Dispatcher | Collar geofence breach alerts & responses (UC03) |
| **Human-Wildlife Conflict** | `ConflictsPage.tsx` | Community Liaison Officer | Crop damage, village claims & compensation (UC04) |

---

## 3. Shared Reusable Components

### Mobile Components (`apps/mobile/src/components/`)
- `common/AppHeader.tsx`: Uniform header with title, subtitle, optional back button, and right accessories.
- `common/AppCard.tsx`: Standard card container with dark surface `#0f172a`, border `#1e293b`, and touchable variants.
- `common/StatusBadge.tsx`: Visual badge supporting statuses (`ACTIVE`, `PENDING`, `OFFLINE`, `RESOLVED`, `CRITICAL`, `HIGH`, `LOW`, etc.).
- `common/EmptyState.tsx`: Illustrated placeholder when lists or records have zero entries.
- `common/LoadingState.tsx`: Standard spinner with contextual status message.
- `common/OfflineBanner.tsx`: Reusable offline mode bar with pending sync count and manual sync trigger.
- `layout/ScreenContainer.tsx`: Safe-area-aware viewport with consistent styling and optional keyboard scroll.

### Web Components (`apps/web/src/components/`)
- `layout/DashboardLayout.tsx`: Shell integrating Sidebar, TopBar, and scrollable content area.
- `layout/Sidebar.tsx`: Desktop navigation bar with active indicators and badges.
- `layout/TopBar.tsx`: Command center header with live system indicators and refresh action.
- `common/StatCard.tsx`: KPI summary card with value, subtitle, icon, and semantic color variants.
- `common/StatusBadge.tsx`: Unified status and severity pill for tables and cards.
- `common/DataTable.tsx`: Generic typed data table with column accessors, hover effects, and empty state.
- `common/EmptyState.tsx`: Clean empty container with title, description, and action button.
- `common/LoadingState.tsx`: Dark themed loading skeleton/spinner with custom message.

---

## 4. Feature Folder Ownership & Structure

Each of the four core use cases has dedicated feature directories in both `mobile` and `web`.

```
features/
├── uc01-patrol/
│   ├── components/       # Feature-specific UI components
│   ├── screens/ [pages/] # Screens (mobile) or Pages (web)
│   ├── hooks/            # Custom React hooks for business logic
│   ├── services/         # Domain-specific client logic & API adapters
│   ├── types.ts          # Feature-level UI types and view models
│   └── README.md         # Responsibilities and API contract guide
├── uc02-incidents/
│   └── ... (same subfolder structure)
├── uc03-alerts/
│   └── ... (same subfolder structure)
└── uc04-conflicts/
    └── ... (same subfolder structure)
```

---

## 5. Team Member Assignment Matrix

| Team Member | Use Case | Responsibility | Primary APIs & Models |
| :--- | :--- | :--- | :--- |
| **Member 1** | **UC01: Patrol Monitoring** | Ranger tracking, waypoint recording, corridor coverage, patrol logs | `/api/patrols`, `/api/patrol-routes`<br>`Patrol`, `PatrolRoute`, `PatrolWaypoint` |
| **Member 2** | **UC02: Poaching Incidents** | Incident reporting, wire snare discovery, photo/evidence capture, offline queue | `/api/incidents`<br>`Incident`, `SupportingEvidence`, `IncidentType` |
| **Member 3** | **UC03: Risk Alerts** | Animal GPS collar tracking, geofence breaches, alert dispatch, response logs | `/api/alerts`, `/api/risk-zones`<br>`WildlifeRiskAlert`, `RiskZone`, `Animal` |
| **Member 4** | **UC04: Community Conflicts** | Human-wildlife conflict reports, crop raids, property loss claims, review | `/api/conflict-reports`<br>`ConflictReport`, `ConflictType`, `ConflictStatus` |

---

## 6. Communication with Shared API Services

All feature code must communicate through the shared services:

### Web Feature Communication
```typescript
// Correct: Use the central apiClient
import { apiClient } from '../../services/apiClient';
import { Incident, CreateIncidentDTO } from '@wildlife/shared';

export async function fetchIncidents() {
  return apiClient.get<Incident[]>('/incidents');
}
```

### Mobile Feature Communication
```typescript
// Correct: Use apiClient for reads, offlineQueue for mutations
import { apiClient } from '../../services/apiClient';
import { offlineQueue } from '../../services/offlineQueue';
import { CreateIncidentDTO } from '@wildlife/shared';

// Online/live queries
export async function getActiveAlerts() {
  return apiClient.get('/alerts?status=ACTIVE');
}

// Field mutations with offline resilience
export async function submitIncident(dto: CreateIncidentDTO) {
  return offlineQueue.enqueue('CREATE_INCIDENT', dto);
}
```

---

## 7. Placement Rules for UI Components

1. **Global Reusable Components**:
   - Must live in `apps/mobile/src/components/common/` or `apps/web/src/components/common/`.
   - Must be generic (e.g., `DataTable`, `StatCard`, `AppCard`) and have no knowledge of specific domain use cases.
2. **Feature Components**:
   - Must live inside the member's feature folder: `features/uc0X-.../components/`.
   - Examples: `IncidentPhotoUploader.tsx`, `RiskZonePolygonOverlay.tsx`, `PatrolSpeedGauge.tsx`.
3. **Screens / Pages**:
   - Major shell tabs live in `screens/` (mobile) or `pages/` (web).
   - Deep nested feature screens (e.g., `NewIncidentStep1Screen.tsx`) belong in `features/uc0X-.../screens/`.

---

## 8. Strictly Prohibited Duplications

To preserve architectural integrity across all four team members:

1. **DO NOT duplicate domain types or enums**: Always import from `@wildlife/shared`. Never create duplicate `enum IncidentStatus` or `interface Alert`.
2. **DO NOT create secondary HTTP clients**: Never initialize separate `fetch` wrappers or `axios` instances. Always use `apiClient`.
3. **DO NOT create separate offline storage mechanisms**: Mobile mutations must always be registered via `offlineQueue.enqueue()`.
4. **DO NOT copy-paste styling systems**: Use the existing Tailwind classes on web and `StyleSheet.create` with the shared color tokens on mobile.
5. **DO NOT modify shared database migrations or shared backend routes** without team consensus.
