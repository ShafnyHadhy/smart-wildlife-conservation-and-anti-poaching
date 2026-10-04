import { pool, closePool } from '../config/database';
import { runMigrations } from './migrate';
import { runSeeds } from './seed';

export async function resetDatabase(): Promise<void> {
  const client = await pool.connect();
  console.log('[DB Reset] Dropping all existing tables in cascade...');

  try {
    await client.query('BEGIN');
    await client.query(`
      DROP TABLE IF EXISTS
        sync_operations,
        supporting_evidence,
        incidents,
        conflict_reports,
        alert_responses,
        wildlife_risk_alerts,
        location_records,
        tracking_collars,
        wildlife_animals,
        risk_zones,
        waypoints,
        patrols,
        patrol_routes,
        community_members,
        users,
        parks
      CASCADE;
    `);
    await client.query('COMMIT');
    console.log('✅ [DB Reset] Tables dropped successfully.');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ [DB Reset Drop Error]:', error.message);
    throw error;
  } finally {
    client.release();
  }

  // Re-run migration and seed
  await runMigrations();
  await runSeeds();
  console.log('🚀 [DB Reset] Database successfully reset and freshly seeded!');
}

// Allow direct CLI execution via tsx
if (require.main === module) {
  resetDatabase()
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
