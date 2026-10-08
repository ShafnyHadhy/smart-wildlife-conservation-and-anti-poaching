import fs from 'fs';
import path from 'path';
import { pool, closePool } from '../config/database';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../db/migrations');
  console.log(`[Migration] Reading migration files from: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migration directory not found at ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No migration files found in ${migrationsDir}`);
  }

  const sql = files.map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n');
  const client = await pool.connect();

  try {
    console.log('[Migration] Beginning transaction...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ [Migration] Schema migration completed successfully!');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration Failed]:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution via tsx
if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await closePool();
      process.exit(1);
    });
}
