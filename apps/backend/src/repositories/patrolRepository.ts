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
  async findAll(): Promise<Patrol[]> {
    const sql = `
      SELECT p.*, u.full_name AS ranger_name, pr.name AS route_name, pk.name AS park_name
      FROM patrols p
      JOIN users u ON p.ranger_id = u.id
      JOIN patrol_routes pr ON p.patrol_route_id = pr.id
      JOIN parks pk ON p.park_id = pk.id
      ORDER BY p.start_time DESC
    `;
    const res = await query(sql);
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
    const sql = `
      SELECT p.*, u.full_name AS ranger_name, pr.name AS route_name, pk.name AS park_name
      FROM patrols p
      JOIN users u ON p.ranger_id = u.id
      JOIN patrol_routes pr ON p.patrol_route_id = pr.id
      JOIN parks pk ON p.park_id = pk.id
      WHERE p.status = 'ACTIVE'
      ORDER BY p.start_time DESC
    `;
    const res = await query(sql);
    return res.rows.map(mapRowToPatrol);
  }

  async findRoutesByPark(parkId: string): Promise<PatrolRoute[]> {
    const res = await query('SELECT * FROM patrol_routes WHERE park_id = $1 ORDER BY name ASC', [parkId]);
    return res.rows.map(mapRowToRoute);
  }

  async findWaypointsByPatrolId(patrolId: string): Promise<Waypoint[]> {
    const res = await query(
      'SELECT * FROM waypoints WHERE patrol_id = $1 ORDER BY sequence_order ASC',
      [patrolId]
    );
    return res.rows.map(mapRowToWaypoint);
  }
}

export const patrolRepository = new PatrolRepository();
