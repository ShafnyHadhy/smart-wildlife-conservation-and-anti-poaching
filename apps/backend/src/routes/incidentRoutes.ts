import { Router } from 'express';
import {
  getIncidents,
  getIncidentById,
  createIncident,
  addIncidentEvidence,
} from '../controllers/incidentController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  incidentFilterSchema,
  createIncidentSchema,
  createEvidenceSchema,
} from '../validators/schemas';

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

export default router;