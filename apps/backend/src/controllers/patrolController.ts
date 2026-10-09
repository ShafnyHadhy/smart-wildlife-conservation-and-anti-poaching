import { Request, Response, NextFunction } from 'express';
import { patrolService } from '../services/patrolService';
import { sendSuccess, sendList } from '../utils/response';

export async function getPatrols(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patrols = await patrolService.getPatrols(req.query as any);
    sendList(res, patrols);
  } catch (error) {
    next(error);
  }
}

export async function getPatrolById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patrol = await patrolService.getPatrolById(req.params.id);
    sendSuccess(res, patrol);
  } catch (error) {
    next(error);
  }
}

export async function getPatrolRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const routes = await patrolService.getPatrolRoutes(req.query.parkId as string);
    sendList(res, routes);
  } catch (error) {
    next(error);
  }
}

export async function getPatrolRouteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const route = await patrolService.getPatrolRouteById(req.params.id);
    sendSuccess(res, route);
  } catch (error) {
    next(error);
  }
}

export async function createPatrol(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patrol = await patrolService.createPatrol(req.body);
    sendSuccess(res, patrol, 201);
  } catch (error) {
    next(error);
  }
}

export async function startPatrol(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patrol = await patrolService.startPatrol(req.params.id);
    sendSuccess(res, patrol);
  } catch (error) {
    next(error);
  }
}

export async function completePatrol(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const patrol = await patrolService.completePatrol(req.params.id);
    sendSuccess(res, patrol);
  } catch (error) {
    next(error);
  }
}
