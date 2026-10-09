import { patrolRepository } from '../repositories/patrolRepository';
import { Patrol, PatrolRoute, PatrolStatus, CreatePatrolDTO } from '@wildlife/shared';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/AppError';

export class PatrolService {
  async getPatrols(filter?: {
    status?: PatrolStatus;
    rangerId?: string;
    parkId?: string;
  }): Promise<Patrol[]> {
    return patrolRepository.findAll(filter);
  }

  async getPatrolById(id: string): Promise<Patrol> {
    const patrol = await patrolRepository.findById(id);
    if (!patrol) {
      throw new NotFoundError('Patrol', id);
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

  async startPatrol(id: string): Promise<Patrol> {
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

  async completePatrol(id: string): Promise<Patrol> {
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
}

export const patrolService = new PatrolService();

