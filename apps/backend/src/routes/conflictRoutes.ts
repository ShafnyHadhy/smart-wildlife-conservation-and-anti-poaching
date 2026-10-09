import { Router } from 'express';
import {
  getConflicts,
  getConflictById,
  getConflictStats,
  createConflict,
  updateConflictStatus,
} from '../controllers/conflictController';
import {
  getCommunityMembers,
  createCommunityMember,
} from '../controllers/userController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  conflictFilterSchema,
  createConflictReportSchema,
  updateConflictStatusSchema,
  communityMemberFilterSchema,
  createCommunityMemberSchema,
} from '../validators/schemas';

const router = Router();

// Community Reporter Directory Endpoints
router.get(
  '/community-members',
  validateQuery(communityMemberFilterSchema),
  getCommunityMembers
);
router.post(
  '/community-members',
  validateBody(createCommunityMemberSchema),
  createCommunityMember
);

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
