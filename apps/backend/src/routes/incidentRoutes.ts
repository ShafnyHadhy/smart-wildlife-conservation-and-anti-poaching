import { Router } from 'express';
import { getIncidents, getIncidentById, createIncident } from '../controllers/incidentController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import { idParamSchema, incidentFilterSchema, createIncidentSchema } from '../validators/schemas';

const router = Router();

router.get('/', validateQuery(incidentFilterSchema), getIncidents);
router.get('/:id', validateParams(idParamSchema), getIncidentById);
router.post('/', validateBody(createIncidentSchema), createIncident);

export default router;
