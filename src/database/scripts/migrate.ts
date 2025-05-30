import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../../config/env.config';

async function runMigrations() {
  let pool;
  try {
    // Initialize environment
    await env.initialize();
    const config = env.getConfig();

    pool = new Pool({
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      host: config.DB_HOST,
      port: config.DB_PORT,
      max: 20,
      ssl: config.DB_SSL_ENABLED ? { rejectUnauthorized: false } : false,
    });

    console.log('Running migrations...');
    await migrate(drizzle(pool), {
      migrationsFolder: 'src/database/migrations',
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

runMigrations();
