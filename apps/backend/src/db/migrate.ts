import fs from 'fs';
import path from 'path';
import { pool, closePool } from '../config/database';

export async function runMigrations(): Promise<void> {
  const migrationPath = path.resolve(__dirname, '../../db/migrations/001_initial_schema.sql');
  console.log(`[Migration] Reading migration file from: ${migrationPath}`);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found at ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
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
