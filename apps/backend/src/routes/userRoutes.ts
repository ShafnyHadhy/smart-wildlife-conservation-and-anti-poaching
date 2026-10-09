import { Router } from 'express';
import {
  getStaff,
  getUserById,
  getCommunityMembers,
  createCommunityMember,
} from '../controllers/userController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  communityMemberFilterSchema,
  createCommunityMemberSchema,
} from '../validators/schemas';

const router = Router();

router.get('/users', getStaff);
router.get('/users/:id', validateParams(idParamSchema), getUserById);
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

export default router;
