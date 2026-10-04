import fs from 'fs';
import path from 'path';
import { pool, closePool } from '../config/database';

export async function runSeeds(): Promise<void> {
  const seedPath = path.resolve(__dirname, '../../db/seeds/001_initial_seed.sql');
  console.log(`[Seed] Reading seed file from: ${seedPath}`);

  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at ${seedPath}`);
  }

  const sql = fs.readFileSync(seedPath, 'utf8');
  const client = await pool.connect();

  try {
    console.log('[Seed] Beginning seed transaction...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ [Seed] Database seeded with realistic conservation demo data successfully!');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ [Seed Failed]:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution via tsx
if (require.main === module) {
  runSeeds()
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
