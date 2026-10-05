import { Router } from 'express';
import healthRoutes from './healthRoutes';
import parkRoutes from './parkRoutes';
import userRoutes from './userRoutes';
import patrolRoutes from './patrolRoutes';
import wildlifeRoutes from './wildlifeRoutes';
import incidentRoutes from './incidentRoutes';
import conflictRoutes from './conflictRoutes';
import syncRoutes from './syncRoutes';

export function createApiRouter(): Router {
  const router = Router();

  // Core & Health
  router.use(healthRoutes);

  // Parks & Users
  router.use('/parks', parkRoutes);
  router.use(userRoutes);

  // Patrol Operations & Routes
  router.use(patrolRoutes);

  // Wildlife, Risk Zones, Telemetry, Alerts & Responses
  router.use(wildlifeRoutes);

  // Incidents
  router.use('/incidents', incidentRoutes);

  // Community Conflict Reports
  router.use('/conflict-reports', conflictRoutes);

  // Offline Synchronization Engine
  router.use('/sync', syncRoutes);

  return router;
}

export default createApiRouter();
