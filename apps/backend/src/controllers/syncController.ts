import { Request, Response, NextFunction } from 'express';
import { syncService } from '../services/syncService';
import { sendSuccess } from '../utils/response';

export async function syncBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await syncService.processBatch(req.body);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
