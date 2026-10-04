import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { config } from '../config/env';
import { HealthResponse } from '@wildlife/shared';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const dbHealth = await checkDatabaseConnection();

  const response: HealthResponse = {
    status: dbHealth.status === 'connected' || dbHealth.status === 'unconfigured' ? 'ok' : 'degraded',
    service: 'smart-wildlife-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database: dbHealth,
  };

  const statusCode = dbHealth.status === 'disconnected' ? 503 : 200;
  res.status(statusCode).json(response);
}
