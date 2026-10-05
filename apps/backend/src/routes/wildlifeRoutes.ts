import { Router } from 'express';
import {
  getAnimals,
  getAnimalById,
  getAnimalLocations,
  postAnimalLocation,
  getRiskZones,
  getRiskZoneById,
  getAlerts,
  getAlertById,
  respondToAlert,
} from '../controllers/wildlifeController';
import { validateParams, validateQuery, validateBody } from '../middleware/validate';
import {
  idParamSchema,
  alertFilterSchema,
  createAnimalLocationSchema,
  createAlertResponseSchema,
} from '../validators/schemas';

const router = Router();

// Animals & Telemetry
router.get('/animals', getAnimals);
router.get('/animals/:id', validateParams(idParamSchema), getAnimalById);
router.get('/animals/:id/locations', validateParams(idParamSchema), getAnimalLocations);
router.post('/animal-locations', validateBody(createAnimalLocationSchema), postAnimalLocation);

// Risk Zones
router.get('/risk-zones', getRiskZones);
router.get('/risk-zones/:id', validateParams(idParamSchema), getRiskZoneById);

// Risk Alerts & Responses
router.get('/alerts', validateQuery(alertFilterSchema), getAlerts);
router.get('/alerts/:id', validateParams(idParamSchema), getAlertById);
router.post(
  '/alerts/:id/respond',
  validateParams(idParamSchema),
  validateBody(createAlertResponseSchema),
  respondToAlert
);

export default router;
