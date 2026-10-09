import { Router, Request, Response, NextFunction } from 'express';
import {
  getPatrols,
  getPatrolById,
  getPatrolRoutes,
  getPatrolRouteById,
  createPatrol,
  startPatrol,
  completePatrol,
  cancelPatrol,
  reassignPlannedPatrol,
  addWaypoint,
} from '../controllers/patrolController';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { authenticateOptional, requireAuth, requireRanger } from '../middleware/auth';
import { ForbiddenError } from '../errors/AppError';
import {
  idParamSchema,
  patrolFilterSchema,
  createPatrolSchema,
  updatePlannedPatrolSchema,
  addWaypointSchema,
} from '../validators/schemas';

const router = Router();

// Enable optional authentication check across all patrol routes
router.use(authenticateOptional);

const managerDashboardWrite = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user && req.user.role !== 'PARK_MANAGER') {
    next(new ForbiddenError('Only Park Managers can manage patrol assignments.'));
    return;
  }
  next();
};

// Patrol Routes (/api/patrol-routes)
router.get('/patrol-routes', getPatrolRoutes);
router.get('/patrol-routes/:id', validateParams(idParamSchema), getPatrolRouteById);

// Patrol Operations (/api/patrols)
router.get('/patrols', validateQuery(patrolFilterSchema), getPatrols);
router.get('/patrols/:id', validateParams(idParamSchema), getPatrolById);
router.post('/patrols', managerDashboardWrite, validateBody(createPatrolSchema), createPatrol);
router.patch(
  '/patrols/:id/assignment',
  managerDashboardWrite,
  validateParams(idParamSchema),
  validateBody(updatePlannedPatrolSchema),
  reassignPlannedPatrol
);
router.patch(
  '/patrols/:id/cancel',
  managerDashboardWrite,
  validateParams(idParamSchema),
  cancelPatrol
);
router.patch(
  '/patrols/:id/start',
  requireAuth,
  requireRanger,
  validateParams(idParamSchema),
  startPatrol
);
router.patch(
  '/patrols/:id/complete',
  requireAuth,
  requireRanger,
  validateParams(idParamSchema),
  completePatrol
);
router.post(
  '/patrols/:id/waypoints',
  requireAuth,
  requireRanger,
  validateParams(idParamSchema),
  validateBody(addWaypointSchema),
  addWaypoint
);

export default router;
