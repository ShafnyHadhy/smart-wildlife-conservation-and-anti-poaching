import { Request, Response, NextFunction } from 'express';
import { wildlifeService } from '../services/wildlifeService';
import { sendSuccess, sendList } from '../utils/response';

export async function getAnimals(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const animals = await wildlifeService.getAnimals();
    sendList(res, animals);
  } catch (error) {
    next(error);
  }
}

export async function getAnimalById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const animal = await wildlifeService.getAnimalById(req.params.id);
    sendSuccess(res, animal);
  } catch (error) {
    next(error);
  }
}

export async function getAnimalLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const locations = await wildlifeService.getRecentLocations(req.params.id, limit);
    sendList(res, locations);
  } catch (error) {
    next(error);
  }
}

export async function postAnimalLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await wildlifeService.ingestLocation(req.body);
    sendSuccess(res, record, 201);
  } catch (error) {
    next(error);
  }
}

export async function simulatePing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await wildlifeService.simulatePing(req.params.id, req.body);
    sendSuccess(res, result, 201);
  } catch (error) {
    next(error);
  }
}

export async function getRiskZones(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zones = await wildlifeService.getRiskZones(req.query.parkId as string);
    sendList(res, zones);
  } catch (error) {
    next(error);
  }
}

export async function getRiskZoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const zone = await wildlifeService.getRiskZoneById(req.params.id);
    sendSuccess(res, zone);
  } catch (error) {
    next(error);
  }
}

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await wildlifeService.getAlerts(req.query as any);
    sendList(res, alerts);
  } catch (error) {
    next(error);
  }
}

export async function getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alert = await wildlifeService.getAlertById(req.params.id);
    sendSuccess(res, alert);
  } catch (error) {
    next(error);
  }
}

export async function respondToAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alertResponse = await wildlifeService.respondToAlert(req.params.id, req.body);
    sendSuccess(res, alertResponse, 201);
  } catch (error) {
    next(error);
  }
}
