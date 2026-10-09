import { Request, Response, NextFunction } from 'express';
import { conflictService } from '../services/conflictService';
import { sendSuccess, sendList } from '../utils/response';

export async function getConflicts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conflicts = await conflictService.getConflicts(req.query as any);
    sendList(res, conflicts);
  } catch (error) {
    next(error);
  }
}

export async function getConflictById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conflict = await conflictService.getConflictById(req.params.id);
    sendSuccess(res, conflict);
  } catch (error) {
    next(error);
  }
}

export async function createConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conflict = await conflictService.createConflictReport(req.body);
    sendSuccess(res, conflict, 201);
  } catch (error) {
    next(error);
  }
}

export async function getConflictStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await conflictService.getStats(req.query.parkId as string);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}

export async function updateConflictStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      status,
      triageNotes,
      mitigationAction,
      estimatedDamageLkr,
      cropTypeLost,
      compensationStatus,
      updatedByName,
    } = req.body;
    const damageData =
      estimatedDamageLkr !== undefined ||
      cropTypeLost !== undefined ||
      compensationStatus !== undefined
        ? { estimatedDamageLkr, cropTypeLost, compensationStatus }
        : undefined;

    const updated = await conflictService.updateStatus(
      req.params.id,
      status,
      triageNotes,
      mitigationAction,
      damageData,
      updatedByName
    );
    sendSuccess(res, updated);
  } catch (error) {
    next(error);
  }
}
