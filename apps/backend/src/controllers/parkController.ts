import { Request, Response, NextFunction } from 'express';
import { parkService } from '../services/parkService';
import { sendSuccess, sendList } from '../utils/response';

export async function getParks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parks = await parkService.getAllParks();
    sendList(res, parks);
  } catch (error) {
    next(error);
  }
}

export async function getParkById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const park = await parkService.getParkById(req.params.id);
    sendSuccess(res, park);
  } catch (error) {
    next(error);
  }
}
