import { patrolRepository } from '../repositories/patrolRepository';
import { Patrol, PatrolRoute, PatrolStatus, CreatePatrolDTO } from '@wildlife/shared';
import { NotFoundError, ConflictError } from '../errors/AppError';

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
}

export const patrolService = new PatrolService();

