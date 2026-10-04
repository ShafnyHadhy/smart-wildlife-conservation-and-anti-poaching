import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { config } from './env';
import { DatabaseHealth } from '@wildlife/shared';

/**
 * Configure Neon PostgreSQL Connection Pool
 * Neon uses TLS/SSL; rejectUnauthorized: false is standard for cloud serverless Postgres pools.
 */
function createPoolConfig(): PoolConfig {
  if (config.databaseUrl) {
    const isNeon = config.databaseUrl.includes('neon.tech') || config.dbSsl;
    return {
      connectionString: config.databaseUrl,
      ssl: isNeon ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 7000, // 7s timeout to accommodate Neon serverless wake-up
    };
  }

  // Fallback to explicit parameters if provided
  const isNeonHost = Boolean(config.dbHost?.includes('neon.tech') || config.dbSsl);
  return {
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    ssl: isNeonHost ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 7000,
  };
}

const poolConfig = createPoolConfig();
export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err.message);
});

/**
 * Executes a SQL query against the Neon PostgreSQL pool
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    console.debug(`[DB Query] executed in ${duration}ms | rows: ${res.rowCount}`);
  }
  return res;
}

/**
 * Tests database connectivity and measures response latency
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealth> {
  const hasConfig = Boolean(config.databaseUrl || config.dbHost);

  if (!hasConfig) {
    return {
      status: 'unconfigured',
      provider: 'neon-postgres',
      message: 'DATABASE_URL not configured in environment. Update apps/backend/.env with your Neon connection string.',
    };
  }

  const start = Date.now();
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS probe');
      const latencyMs = Date.now() - start;
      return {
        status: 'connected',
        provider: 'neon-postgres',
        latencyMs,
        message: `Connected successfully to Neon PostgreSQL (${latencyMs}ms latency).`,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      status: 'disconnected',
      provider: 'neon-postgres',
      error: error.message || 'Failed to establish connection to PostgreSQL',
      message: 'Database connection failed. Verify Neon host credentials and network connectivity.',
    };
  }
}

/**
 * Closes the database pool (useful for clean process shutdown and test runners)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
