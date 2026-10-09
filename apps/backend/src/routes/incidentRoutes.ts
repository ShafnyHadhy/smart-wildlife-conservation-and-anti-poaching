import { Router } from 'express';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  addIncidentEvidence,
  updateIncidentStatus,
} from '../controllers/incidentController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  incidentFilterSchema,
  createIncidentSchema,
  createEvidenceSchema,
  updateIncidentStatusSchema,
} from '../validators/schemas';
import {
  authenticateOptional,
  requireAuth,
  requireParkManager,
} from '../middleware/auth';

const router = Router();

router.get('/', validateQuery(incidentFilterSchema), getIncidents);

router.get(
  '/:id',
  validateParams(idParamSchema),
  getIncidentById
);

router.post(
  '/',
  validateBody(createIncidentSchema),
  createIncident
);

router.post(
  '/:id/evidence',
  validateParams(idParamSchema),
  validateBody(createEvidenceSchema),
  addIncidentEvidence
);

router.patch(
  '/:id/status',
  (req, res, next) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_DEMO_INCIDENT_REVIEW === 'true'
    ) {
      next();
      return;
    }

    authenticateOptional(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      requireAuth(req, res, (authError?: unknown) => {
        if (authError) {
          next(authError);
          return;
        }
        requireParkManager(req, res, next);
      });
    });
  },
  validateParams(idParamSchema),
  validateBody(updateIncidentStatusSchema),
  updateIncidentStatus
);

export default router;