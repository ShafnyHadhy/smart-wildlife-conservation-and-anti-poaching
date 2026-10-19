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

export async function addIncidentEvidence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const evidence = await incidentService.addEvidence(
      req.params.id,
      req.body
    );

    sendSuccess(res, evidence, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateIncidentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const incident = await incidentService.updateStatus(
      req.params.id,
      req.body.status
    );

    sendSuccess(res, incident);
  } catch (error) {
    next(error);
  }
}