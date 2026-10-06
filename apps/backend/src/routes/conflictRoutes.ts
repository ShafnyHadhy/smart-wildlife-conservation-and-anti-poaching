import { Router } from 'express';
import {
  getConflicts,
  getConflictById,
  getConflictStats,
  createConflict,
  updateConflictStatus,
} from '../controllers/conflictController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  conflictFilterSchema,
  createConflictReportSchema,
  updateConflictStatusSchema,
} from '../validators/schemas';

const router = Router();

router.get('/', validateQuery(conflictFilterSchema), getConflicts);
router.get('/stats', getConflictStats);
router.get('/:id', validateParams(idParamSchema), getConflictById);
router.post('/', validateBody(createConflictReportSchema), createConflict);
router.patch(
  '/:id/status',
  validateParams(idParamSchema),
  validateBody(updateConflictStatusSchema),
  updateConflictStatus
);

export default router;
