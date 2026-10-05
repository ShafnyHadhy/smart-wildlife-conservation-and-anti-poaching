import { Router } from 'express';
import {
  getPatrols,
  getPatrolById,
  getPatrolRoutes,
  getPatrolRouteById,
} from '../controllers/patrolController';
import { validateParams, validateQuery } from '../middleware/validate';
import { idParamSchema, patrolFilterSchema } from '../validators/schemas';

const router = Router();

// Patrol Routes (/api/patrol-routes)
router.get('/patrol-routes', getPatrolRoutes);
router.get('/patrol-routes/:id', validateParams(idParamSchema), getPatrolRouteById);

// Patrol Operations (/api/patrols)
router.get('/patrols', validateQuery(patrolFilterSchema), getPatrols);
router.get('/patrols/:id', validateParams(idParamSchema), getPatrolById);

export default router;
