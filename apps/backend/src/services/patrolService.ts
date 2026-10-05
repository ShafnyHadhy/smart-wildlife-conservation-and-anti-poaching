import { patrolRepository } from '../repositories/patrolRepository';
import { Patrol, PatrolRoute, PatrolStatus } from '@wildlife/shared';
import { NotFoundError } from '../errors/AppError';

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
}

export const patrolService = new PatrolService();
