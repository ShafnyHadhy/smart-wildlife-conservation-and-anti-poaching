# Domain Model & Entity Mapping Specification
## Smart Wildlife Conservation and Anti-Poaching Monitoring System

- **Document Version:** 2.0.0
- **Phase:** Phase 2 — Database & Shared Domain Model
- **Status:** Implemented & Verified

---

## 1. Domain Model Overview

The Smart Wildlife Conservation and Anti-Poaching Monitoring System coordinates four primary operational stakeholder personas to safeguard Sri Lanka's wildlife sanctuaries across four core use cases:

1. **UC01:** Monitor and Evaluate Ranger Patrol Activities
2. **UC02:** Report Wildlife/Poaching Incident
3. **UC03:** Detect and Respond to Wildlife Risk Alert
4. **UC04:** Report Human-Wildlife Conflict

The domain model balances object-oriented conceptual clarity with clean relational database normalization.

---

## 2. Conceptual Domain Entities

### 2.1 Core Stakeholders & Users

```
                     ┌───────────────────────┐
                     │         User          │
                     │  (Base Staff Account) │
                     └───────────▲───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────┴────────┐     ┌────────┴────────┐     ┌────────┴────────┐
│   ParkManager   │     │     Ranger      │     │  CommLiaisonOff │
└─────────────────┘     └─────────────────┘     └─────────────────┘

                     ┌───────────────────────┐
                     │    CommunityMember    │
                     │  (External Citizen)   │
                     └───────────────────────┘
```

- **`User` (Conceptual Base Staff Account):** Contains system identity, authentication credentials, contact information, and assigned national park.
- **`ParkManager` (Role: `PARK_MANAGER`):** High-level park administrator responsible for monitoring ranger patrols, evaluating coverage metrics, and overseeing conservation strategies.
- **`Ranger` (Role: `RANGER`):** Field personnel executing on-foot and vehicle patrols, logging breadcrumb GPS waypoints, discovering and reporting poaching incidents, and responding to wildlife intrusion alerts.
- **`CommunityLiaisonOfficer` (Role: `COMMUNITY_LIAISON_OFFICER`):** Operational staff bridging rural village communities and park management. Triage human-wildlife conflict reports and coordinate rapid response teams.
- **`CommunityMember` (Independent Citizen Entity):** External local resident living in agricultural buffer zones adjacent to parks. Reports crop damage, elephant sightings, and livestock attacks.

#### Key Architectural Decisions:
1. **Single `users` Relational Table:** Staff personas share identical authentication, profile, and auditing fields. They are unified in a single `users` table discriminated by `role VARCHAR(30)`.
2. **No `WildlifeRanger` Class:** There is strictly `Ranger`.
3. **No `RangerSupervisor` Class:** Park Manager directly manages and monitors patrol operations.
4. **Independent `community_members` Table:** Local community members are external citizens, not staff. They require no system credentials, duty stations, or staff roles.

---

### 2.2 Park & Patrol Domain (UC01)

- **`Park`:** A designated protected conservation area (e.g., Yala National Park) encompassing geographic centers, boundaries, and associated infrastructure.
- **`PatrolRoute`:** A cataloged patrol route or surveillance corridor within a park, with planned waypoints, estimated duration, and distance.
- **`Patrol`:** An operational field mission assigned to a lead Ranger within a Park following a PatrolRoute, transitioning through states: `PLANNED` $\to$ `ACTIVE` $\to$ `COMPLETED` / `CANCELLED`.
- **`Waypoint`:** An ordered spatial coordinate recorded along a patrol, representing GPS fixes, checkpoints, or manual ranger observations.
- **`Location` (Value Object):** Latitude and longitude coordinates expressed as high-precision decimals (`NUMERIC(10, 7)`).

---

### 2.3 Wildlife Tracking & Risk Alert Domain (UC03)

- **`WildlifeAnimal`:** An individual animal of high conservation value (e.g., Asian Elephant "Walagamba", Sri Lankan Leopard "Wilpattu Star") tracked for anti-poaching and conflict mitigation.
- **`TrackingCollar`:** A telemetry hardware device attached to an animal. Has a $1 \leftrightarrow 0..1$ relationship with `WildlifeAnimal` (at most one active collar per animal).
- **`LocationRecord`:** A time-series GPS telemetry fix transmitted by an animal's tracking collar, storing latitude, longitude, timestamp, speed, and heading.
- **`RiskZone`:** A configured geographic sector (e.g., village perimeter, farming land, railway crossing) with an assigned risk severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and boundary coordinates.
- **`WildlifeRiskAlert`:** A real-time event automatically triggered when an animal's location falls within an active `RiskZone`.
- **`AlertResponse`:** The on-the-ground mitigation response logged by a Ranger or Community Liaison Officer (e.g., herding the elephant back into the sanctuary using thunder flashes).

---

### 2.4 Incident Domain (UC02)

- **`Incident`:** A field report recorded by a Ranger on patrol, categorizing illegal or suspicious activity: `SNARE`, `CARCASS`, `ILLEGAL_CAMPSITE`, `FOOTPRINT`, `POACHING_ACTIVITY`, `ILLEGAL_LOGGING`, `OTHER`.
- **`SupportingEvidence`:** Photographic, audio, or document attachments linked to an incident report.

---

### 2.5 Community Conflict Domain (UC04)

- **`ConflictReport`:** An incident report submitted by a Community Member or Community Liaison Officer documenting human-wildlife encounters: `ELEPHANT_HUMAN_CONFLICT`, `CROP_DAMAGE`, `ANIMAL_INTRUSION`, `LIVESTOCK_ATTACK`, `PROPERTY_DAMAGE`, `OTHER`.

---

### 2.6 Offline Synchronization Domain

- **`SyncOperation`:** An operational log tracking mutations queued on mobile devices during field disconnects and replayed to the server upon reconnection. Ensures idempotency via `client_mutation_id`.

---

## 3. Conceptual Entity to PostgreSQL Schema Mapping

| Domain Entity | PostgreSQL Table | Primary Key | Key Foreign Keys | Key Constraints |
|---|---|---|---|---|
| `Park` | `parks` | `id` (UUID) | None | `name` UNIQUE, `code` UNIQUE |
| `User` (Staff) | `users` | `id` (UUID) | `park_id` $\to$ `parks.id` | `username` UNIQUE, `email` UNIQUE, `CHECK (role)` |
| `CommunityMember` | `community_members`| `id` (UUID) | `park_id` $\to$ `parks.id` | `nic_number` UNIQUE, `phone_number` NOT NULL |
| `PatrolRoute` | `patrol_routes` | `id` (UUID) | `park_id` $\to$ `parks.id` | `route_code` UNIQUE |
| `Patrol` | `patrols` | `id` (UUID) | `ranger_id` $\to$ `users.id`, `patrol_route_id` $\to$ `patrol_routes.id`, `park_id` $\to$ `parks.id` | `patrol_code` UNIQUE, `CHECK (status)` |
| `Waypoint` | `waypoints` | `id` (UUID) | `patrol_id` $\to$ `patrols.id` | `CHECK (location_type)`, `recorded_at` NOT NULL |
| `WildlifeAnimal` | `wildlife_animals` | `id` (UUID) | `park_id` $\to$ `parks.id` | `identifier_tag` UNIQUE, `CHECK (gender)` |
| `TrackingCollar` | `tracking_collars` | `id` (UUID) | `animal_id` $\to$ `wildlife_animals.id` | `animal_id` UNIQUE ($1 \leftrightarrow 0..1$), `device_serial_number` UNIQUE |
| `LocationRecord` | `location_records` | `id` (UUID) | `animal_id` $\to$ `wildlife_animals.id`, `collar_id` $\to$ `tracking_collars.id` | `recorded_at` NOT NULL |
| `RiskZone` | `risk_zones` | `id` (UUID) | `park_id` $\to$ `parks.id` | `zone_code` UNIQUE, `CHECK (risk_level)` |
| `WildlifeRiskAlert`| `wildlife_risk_alerts`| `id` (UUID) | `animal_id` $\to$ `wildlife_animals.id`, `risk_zone_id` $\to$ `risk_zones.id`, `location_record_id` $\to$ `location_records.id` | `alert_code` UNIQUE, `CHECK (severity)`, `CHECK (status)` |
| `AlertResponse` | `alert_responses` | `id` (UUID) | `alert_id` $\to$ `wildlife_risk_alerts.id`, `responder_id` $\to$ `users.id` | `client_mutation_id` UNIQUE, `CHECK (response_status)` |
| `Incident` | `incidents` | `id` (UUID) | `ranger_id` $\to$ `users.id`, `patrol_id` $\to$ `patrols.id` | `incident_code` UNIQUE, `client_mutation_id` UNIQUE, `CHECK (incident_type)` |
| `SupportingEvidence`| `supporting_evidence`| `id` (UUID) | `incident_id` $\to$ `incidents.id` | `file_path` NOT NULL, `CHECK (evidence_type)` |
| `ConflictReport` | `conflict_reports` | `id` (UUID) | `community_member_id` $\to$ `community_members.id`, `park_id` $\to$ `parks.id` | `report_code` UNIQUE, `client_mutation_id` UNIQUE, `CHECK (conflict_type)` |
| `SyncOperation` | `sync_operations` | `id` (UUID) | None | `client_mutation_id` UNIQUE, `CHECK (status)` |

---

## 4. Shared Domain Enums (`packages/shared`)

All domain status values, role categories, and types are codified as TypeScript enums in `packages/shared/src/enums/index.ts`:

```typescript
export enum UserRole {
  PARK_MANAGER = 'PARK_MANAGER',
  RANGER = 'RANGER',
  COMMUNITY_LIAISON_OFFICER = 'COMMUNITY_LIAISON_OFFICER',
}

export enum PatrolStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum LocationType {
  GPS_FIX = 'GPS_FIX',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  OBSERVATION = 'OBSERVATION',
  CHECKPOINT = 'CHECKPOINT',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
}

export enum ResponseStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum IncidentType {
  SNARE = 'SNARE',
  CARCASS = 'CARCASS',
  ILLEGAL_CAMPSITE = 'ILLEGAL_CAMPSITE',
  FOOTPRINT = 'FOOTPRINT',
  POACHING_ACTIVITY = 'POACHING_ACTIVITY',
  ILLEGAL_LOGGING = 'ILLEGAL_LOGGING',
  OTHER = 'OTHER',
}

export enum IncidentStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  CLOSED = 'CLOSED',
}

export enum ConflictType {
  ELEPHANT_HUMAN_CONFLICT = 'ELEPHANT_HUMAN_CONFLICT',
  CROP_DAMAGE = 'CROP_DAMAGE',
  ANIMAL_INTRUSION = 'ANIMAL_INTRUSION',
  LIVESTOCK_ATTACK = 'LIVESTOCK_ATTACK',
  PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
  OTHER = 'OTHER',
}

export enum ConflictStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SyncOperationStatus {
  PENDING = 'PENDING',
  SYNCHRONIZED = 'SYNCHRONIZED',
  FAILED = 'FAILED',
}
```

---

## 5. Domain Invariants & Business Rules

1. **Collar Singularity:** A tracked animal cannot wear multiple collars simultaneously (`tracking_collars.animal_id UNIQUE`).
2. **Patrol Ranger Duty:** A patrol can only be led by an internal staff user whose role is `RANGER`.
3. **Alert Traceability:** Every `WildlifeRiskAlert` points to the exact `location_records` ping that breached the `risk_zones` boundary polygon.
4. **Idempotent Mobile Offline Replay:** Every offline submission incorporates a unique `client_mutation_id`. Duplicate replay submissions do not produce duplicated incident or conflict records.
5. **Coordinate Range Validity:** Latitudes must fall within $[-90.0, 90.0]$ and longitudes within $[-180.0, 180.0]$.
