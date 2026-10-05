import { Router } from 'express';
import { getStaff, getUserById, getCommunityMembers } from '../controllers/userController';
import { validateParams } from '../middleware/validate';
import { idParamSchema } from '../validators/schemas';

const router = Router();

router.get('/users', getStaff);
router.get('/users/:id', validateParams(idParamSchema), getUserById);
router.get('/community-members', getCommunityMembers);

export default router;
