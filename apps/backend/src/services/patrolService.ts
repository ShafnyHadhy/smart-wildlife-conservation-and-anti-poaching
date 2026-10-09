import { patrolRepository } from '../repositories/patrolRepository';
import { Patrol, PatrolRoute, PatrolStatus, CreatePatrolDTO, Waypoint, LocationType } from '@wildlife/shared';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../errors/AppError';
import { AuthenticatedUser } from '../middleware/auth';

export class PatrolService {
  async getPatrols(
    filter?: {
      status?: PatrolStatus;
      rangerId?: string;
      parkId?: string;
    },
    user?: AuthenticatedUser
  ): Promise<Patrol[]> {
    let effectiveFilter = { ...filter };
    if (user?.role === 'RANGER') {
      if (filter?.rangerId && filter.rangerId !== user.id) {
        throw new ForbiddenError('Rangers can only view their own assigned patrols.');
      }
      effectiveFilter.rangerId = user.id;
    }
    return patrolRepository.findAll(effectiveFilter);
  }

  async getPatrolById(id: string, user?: AuthenticatedUser): Promise<Patrol> {
    const patrol = await patrolRepository.findById(id);
    if (!patrol) {
      throw new NotFoundError('Patrol', id);
    }
    if (user?.role === 'RANGER' && patrol.rangerId !== user.id) {
      throw new ForbiddenError('Rangers can only access their own assigned patrols.');
    }
    return patrol;
  }

  async getPatrolRoutes(parkId?: string): Promise<PatrolRoute[]> {
    return patrolRepository.findAllRoutes(parkId);
  }

  async getPatrolRouteById(id: string): Promise<PatrolRoute> {
    const route = await patrolRepository.findRouteById(id);
    if (!route) {
      throw new NotFoundError('PatrolRoute', id);
    }
    return route;
  }

  async createPatrol(dto: CreatePatrolDTO): Promise<Patrol> {
    // Ranger availability check: reject if ranger already has an ACTIVE patrol
    const activeForRanger = await patrolRepository.findAll({
      status: PatrolStatus.ACTIVE,
      rangerId: dto.rangerId,
    });
    if (activeForRanger.length > 0) {
      throw new ConflictError(
        'This ranger is already assigned to an active patrol and cannot be assigned to another.'
      );
    }
    return patrolRepository.create(dto);
  }

  async startPatrol(id: string, user?: AuthenticatedUser): Promise<Patrol> {
    // If authenticated as a ranger, verify ownership before state transition
    if (user?.role === 'RANGER') {
      const existing = await patrolRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('Patrol', id);
      }
      if (existing.rangerId !== user.id) {
        throw new ForbiddenError('Rangers can only start their own assigned patrols.');
      }
    }

    const updated = await patrolRepository.startPatrol(id);
    if (updated) return updated;

    // Atomic update affected 0 rows — determine the reason
    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    throw new BadRequestError(
      `Patrol cannot be started because its current status is '${existing.status}'. Only PLANNED patrols can be started.`
    );
  }

  async completePatrol(id: string, user?: AuthenticatedUser): Promise<Patrol> {
    // If authenticated as a ranger, verify ownership before state transition
    if (user?.role === 'RANGER') {
      const existing = await patrolRepository.findById(id);
      if (!existing) {
        throw new NotFoundError('Patrol', id);
      }
      if (existing.rangerId !== user.id) {
        throw new ForbiddenError('Rangers can only complete their own assigned patrols.');
      }
    }

    const updated = await patrolRepository.completePatrol(id);
    if (updated) return updated;

    // Atomic update affected 0 rows — determine the reason
    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    throw new BadRequestError(
      `Patrol cannot be completed because its current status is '${existing.status}'. Only ACTIVE patrols can be completed.`
    );
  }

  async addWaypoint(
    id: string,
    data: {
      latitude: number;
      longitude: number;
      sequenceOrder?: number;
      locationType?: LocationType;
      recordedAt?: string;
      notes?: string;
    },
    user?: AuthenticatedUser
  ): Promise<Waypoint> {
    const patrol = await patrolRepository.findById(id);
    if (!patrol) {
      throw new NotFoundError('Patrol', id);
    }
    if (user?.role === 'RANGER' && patrol.rangerId !== user.id) {
      throw new ForbiddenError('Rangers can only record waypoints for their own assigned patrols.');
    }
    if (patrol.status !== PatrolStatus.ACTIVE) {
      throw new BadRequestError(
        `Waypoints can only be recorded for ACTIVE patrols. Current status is '${patrol.status}'.`
      );
    }

    return patrolRepository.addWaypoint(id, data);
  }
}

export const patrolService = new PatrolService();

