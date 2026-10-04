import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
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
      },
    });
  });

  // Mount API Routes
  app.use('/api', healthRoutes);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
