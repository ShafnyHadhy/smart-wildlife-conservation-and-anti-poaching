import { query } from '../config/database';
import { Patrol, PatrolRoute, Waypoint, PatrolStatus } from '@wildlife/shared';

function mapRowToPatrol(row: any): Patrol {
  return {
    id: row.id,
    patrolCode: row.patrol_code,
    parkId: row.park_id,
    rangerId: row.ranger_id,
    patrolRouteId: row.patrol_route_id,
    status: row.status as PatrolStatus,
    startTime: row.start_time.toISOString(),
    endTime: row.end_time ? row.end_time.toISOString() : undefined,
    coverageScore: parseFloat(row.coverage_score || '0'),
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    rangerName: row.ranger_name,
    routeName: row.route_name,
    parkName: row.park_name,
  };
}

function mapRowToRoute(row: any): PatrolRoute {
  return {
    id: row.id,
    parkId: row.park_id,
    name: row.name,
    code: row.code,
    description: row.description,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    routeType: row.route_type,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    parkName: row.park_name,
  };
}

function mapRowToWaypoint(row: any): Waypoint {
  return {
    id: row.id,
    patrolId: row.patrol_id,
    patrolRouteId: row.patrol_route_id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    sequenceOrder: row.sequence_order,
    locationType: row.location_type,
    recordedAt: row.recorded_at.toISOString(),
    notes: row.notes,
  };
}

export class PatrolRepository {
  async findAll(filter?: { status?: PatrolStatus; rangerId?: string; parkId?: string }): Promise<Patrol[]> {
    let sql = `
      SELECT p.*, u.full_name AS ranger_name, pr.name AS route_name, pk.name AS park_name
      FROM patrols p
      JOIN users u ON p.ranger_id = u.id
      JOIN patrol_routes pr ON p.patrol_route_id = pr.id
      JOIN parks pk ON p.park_id = pk.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (filter?.rangerId) {
      params.push(filter.rangerId);
      conditions.push(`p.ranger_id = $${params.length}`);
    }
    if (filter?.parkId) {
      params.push(filter.parkId);
      conditions.push(`p.park_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY p.start_time DESC';

    const res = await query(sql, params);
    return res.rows.map(mapRowToPatrol);
  }

  async findById(id: string): Promise<Patrol | null> {
    const sql = `
      SELECT p.*, u.full_name AS ranger_name, pr.name AS route_name, pk.name AS park_name
      FROM patrols p
      JOIN users u ON p.ranger_id = u.id
      JOIN patrol_routes pr ON p.patrol_route_id = pr.id
      JOIN parks pk ON p.park_id = pk.id
      WHERE p.id = $1
    `;
    const res = await query(sql, [id]);
    if (!res.rows[0]) return null;

    const patrol = mapRowToPatrol(res.rows[0]);
    patrol.waypoints = await this.findWaypointsByPatrolId(id);
    return patrol;
  }

  async findActivePatrols(): Promise<Patrol[]> {
    return this.findAll({ status: PatrolStatus.ACTIVE });
  }

  async findAllRoutes(parkId?: string): Promise<PatrolRoute[]> {
    let sql = `
      SELECT pr.*, pk.name AS park_name
      FROM patrol_routes pr
      JOIN parks pk ON pr.park_id = pk.id
    `;
    const params: any[] = [];
    if (parkId) {
      params.push(parkId);
      sql += ` WHERE pr.park_id = $1`;
    }
    sql += ' ORDER BY pr.name ASC';
    const res = await query(sql, params);
    const routes = res.rows.map(mapRowToRoute);

    // Fetch planned route checkpoints for all routes efficiently
    const wpRes = await query(
      'SELECT * FROM waypoints WHERE patrol_route_id IS NOT NULL AND patrol_id IS NULL ORDER BY sequence_order ASC'
    );
    const wpMap = new Map<string, Waypoint[]>();
    for (const row of wpRes.rows) {
      const wp = mapRowToWaypoint(row);
      if (wp.patrolRouteId) {
        if (!wpMap.has(wp.patrolRouteId)) {
          wpMap.set(wp.patrolRouteId, []);
        }
        wpMap.get(wp.patrolRouteId)!.push(wp);
      }
    }

    for (const route of routes) {
      route.waypoints = wpMap.get(route.id) || [];
    }

    return routes;
  }

  async findRouteById(id: string): Promise<PatrolRoute | null> {
    const sql = `
      SELECT pr.*, pk.name AS park_name
      FROM patrol_routes pr
      JOIN parks pk ON pr.park_id = pk.id
      WHERE pr.id = $1
    `;
    const res = await query(sql, [id]);
    if (!res.rows[0]) return null;
    const route = mapRowToRoute(res.rows[0]);
    route.waypoints = await this.findWaypointsByRouteId(id);
    return route;
  }

  async findWaypointsByRouteId(routeId: string): Promise<Waypoint[]> {
    const res = await query(
      'SELECT * FROM waypoints WHERE patrol_route_id = $1 AND patrol_id IS NULL ORDER BY sequence_order ASC',
      [routeId]
    );
    return res.rows.map(mapRowToWaypoint);
  }

  async findRoutesByPark(parkId: string): Promise<PatrolRoute[]> {
    return this.findAllRoutes(parkId);
  }

  async findWaypointsByPatrolId(patrolId: string): Promise<Waypoint[]> {
    const res = await query(
      'SELECT * FROM waypoints WHERE patrol_id = $1 ORDER BY sequence_order ASC',
      [patrolId]
    );
    return res.rows.map(mapRowToWaypoint);
  }

  async create(data: {
    parkId: string;
    rangerId: string;
    patrolRouteId: string;
    patrolCode: string;
    startTime: string;
    notes?: string;
  }): Promise<Patrol> {
    const sql = `
      INSERT INTO patrols (park_id, ranger_id, patrol_route_id, patrol_code, start_time, status, notes)
      VALUES ($1, $2, $3, $4, $5, 'PLANNED', $6)
      RETURNING id
    `;
    const res = await query(sql, [
      data.parkId,
      data.rangerId,
      data.patrolRouteId,
      data.patrolCode,
      data.startTime,
      data.notes ?? null,
    ]);
    const id: string = res.rows[0].id;
    const patrol = await this.findById(id);
    if (!patrol) throw new Error(`Failed to retrieve patrol after creation: ${id}`);
    return patrol;
  }

  /**
   * Atomically transitions a patrol from PLANNED → ACTIVE and sets start_time to now.
   * Returns null if no row was updated (patrol not in PLANNED status or does not exist).
   */
  async startPatrol(id: string): Promise<Patrol | null> {
    const sql = `
      UPDATE patrols
      SET status = 'ACTIVE', start_time = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'PLANNED'
      RETURNING id
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.findById(id);
  }

  /**
   * Atomically transitions a patrol from ACTIVE → COMPLETED and sets end_time to now.
   * Returns null if no row was updated (patrol not in ACTIVE status or does not exist).
   */
  async completePatrol(id: string): Promise<Patrol | null> {
    const sql = `
      UPDATE patrols
      SET status = 'COMPLETED', end_time = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'ACTIVE'
      RETURNING id
    `;
    const res = await query(sql, [id]);
    if (res.rows.length === 0) return null;
    return this.findById(id);
  }
}

export const patrolRepository = new PatrolRepository();
