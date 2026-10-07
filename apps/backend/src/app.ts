import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [
        'http://localhost:5173',
        'http://localhost:8081',
      ],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Root welcome endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Smart Wildlife Conservation and Anti-Poaching System API',
      status: 'operational',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        parks: '/api/parks',
        users: '/api/users',
        patrols: '/api/patrols',
        patrolRoutes: '/api/patrol-routes',
        animals: '/api/animals',
        riskZones: '/api/risk-zones',
        alerts: '/api/alerts',
        incidents: '/api/incidents',
        conflictReports: '/api/conflict-reports',
        sync: '/api/sync/batch',
      },
    });
  });

  // Mount API Routes
  app.use('/api', apiRouter);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();