import { Router } from 'express';
import {
  getPatrols,
  getPatrolById,
  getPatrolRoutes,
  getPatrolRouteById,
  createPatrol,
  startPatrol,
  completePatrol,
} from '../controllers/patrolController';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { idParamSchema, patrolFilterSchema, createPatrolSchema } from '../validators/schemas';

const router = Router();

// Patrol Routes (/api/patrol-routes)
router.get('/patrol-routes', getPatrolRoutes);
router.get('/patrol-routes/:id', validateParams(idParamSchema), getPatrolRouteById);

// Patrol Operations (/api/patrols)
router.get('/patrols', validateQuery(patrolFilterSchema), getPatrols);
router.get('/patrols/:id', validateParams(idParamSchema), getPatrolById);
router.post('/patrols', validateBody(createPatrolSchema), createPatrol);
router.patch('/patrols/:id/start', validateParams(idParamSchema), startPatrol);
router.patch('/patrols/:id/complete', validateParams(idParamSchema), completePatrol);

export default router;


