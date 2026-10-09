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
    await this.validateAssignment(dto.rangerId, dto.parkId, dto.patrolRouteId);
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
    if (!user || user.role !== 'RANGER') {
      throw new ForbiddenError('Only the assigned Ranger can start a patrol.');
    }

    const updated = await patrolRepository.startPatrol(id, user.id);
    if (updated) return updated;

    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    if (existing.rangerId !== user.id) {
      throw new ForbiddenError('Rangers can only start their own assigned patrols.');
    }
    throw new BadRequestError(
      `Patrol cannot be started because its current status is '${existing.status}'. Only PLANNED patrols can be started.`
    );
  }

  async completePatrol(id: string, user?: AuthenticatedUser): Promise<Patrol> {
    if (!user || user.role !== 'RANGER') {
      throw new ForbiddenError('Only the assigned Ranger can complete a patrol.');
    }

    const updated = await patrolRepository.completePatrol(id, user.id);
    if (updated) return updated;

    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    if (existing.rangerId !== user.id) {
      throw new ForbiddenError('Rangers can only complete their own assigned patrols.');
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
    if (!user || user.role !== 'RANGER') {
      throw new ForbiddenError('Only the assigned Ranger can record patrol waypoints.');
    }
    const patrol = await patrolRepository.findById(id);
    if (!patrol) {
      throw new NotFoundError('Patrol', id);
    }
    if (patrol.rangerId !== user.id) {
      throw new ForbiddenError('Rangers can only record waypoints for their own assigned patrols.');
    }
    if (patrol.status !== PatrolStatus.ACTIVE) {
      throw new BadRequestError(
        `Waypoints can only be recorded for ACTIVE patrols. Current status is '${patrol.status}'.`
      );
    }

    return patrolRepository.addWaypoint(id, data);
  }

  async cancelPatrol(id: string): Promise<Patrol> {
    const cancelled = await patrolRepository.cancelPlannedPatrol(id);
    if (cancelled) return cancelled;

    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    throw new BadRequestError(
      `Patrol cannot be cancelled because its current status is '${existing.status}'. Only PLANNED patrols can be cancelled.`
    );
  }

  async reassignPlannedPatrol(
    id: string,
    dto: { rangerId: string; parkId: string; patrolRouteId: string; startTime: string; patrolCode: string; notes?: string }
  ): Promise<Patrol> {
    await this.validateAssignment(dto.rangerId, dto.parkId, dto.patrolRouteId);
    const activeForRanger = await patrolRepository.findAll({
      status: PatrolStatus.ACTIVE,
      rangerId: dto.rangerId,
    });
    if (activeForRanger.some((patrol) => patrol.id !== id)) {
      throw new ConflictError(
        'This ranger is already assigned to an active patrol and cannot be assigned to another.'
      );
    }

    const updated = await patrolRepository.updatePlannedAssignment(id, dto);
    if (updated) return updated;

    const existing = await patrolRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Patrol', id);
    }
    throw new BadRequestError(
      `Patrol assignment cannot be changed while its current status is '${existing.status}'. Only PLANNED patrols can be changed.`
    );
  }

  private async validateAssignment(rangerId: string, parkId: string, routeId: string): Promise<void> {
    const [rangerEligible, route] = await Promise.all([
      patrolRepository.isRangerEligibleForPark(rangerId, parkId),
      patrolRepository.findRouteById(routeId),
    ]);
    if (!rangerEligible) {
      throw new BadRequestError('The selected Ranger is inactive or is not assigned to the selected park.');
    }
    if (!route || !route.isActive) {
      throw new NotFoundError('Active PatrolRoute', routeId);
    }
    if (route.parkId !== parkId) {
      throw new BadRequestError('The selected patrol route does not belong to the selected park.');
    }
  }
}

export const patrolService = new PatrolService();
