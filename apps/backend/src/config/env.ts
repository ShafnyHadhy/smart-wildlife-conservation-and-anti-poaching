import dotenv from 'dotenv';
import path from 'path';

// Load .env file from apps/backend/.env or project root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl?: string;
  dbHost?: string;
  dbPort: number;
  dbUser?: string;
  dbPassword?: string;
  dbName?: string;
  dbSsl: boolean;
  corsOrigin: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  dbHost: process.env.DB_HOST,
  dbPort: parseInt(process.env.DB_PORT || '5432', 10),
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  dbSsl: process.env.DB_SSL === 'true' || Boolean(process.env.DATABASE_URL?.includes('neon.tech')),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
