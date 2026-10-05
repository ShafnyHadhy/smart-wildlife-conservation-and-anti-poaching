import { Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incidentService';
import { sendSuccess, sendList } from '../utils/response';

export async function getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incidents = await incidentService.getIncidents(req.query as any);
    sendList(res, incidents);
  } catch (error) {
    next(error);
  }
}

export async function getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    sendSuccess(res, incident);
  } catch (error) {
    next(error);
  }
}

export async function createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incident = await incidentService.createIncident(req.body);
    sendSuccess(res, incident, 201);
  } catch (error) {
    next(error);
  }
}
