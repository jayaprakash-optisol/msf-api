import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { logger } from '../utils';
import * as schema from '../models';
import { env } from './env.config';

// Initialize pool with default config (will be properly initialized in initDatabaseConnection)
let pool = new Pool();

// Track if the pool is already closed
let isPoolClosed = false;

// Initialize Drizzle with the connection pool
export const db = drizzle(pool, { schema });

// Function to initialize database connection with proper config
export const initDatabaseConnection = async (): Promise<void> => {
  try {
    // Create a pool with loaded environment variables
    const config = env.getConfig();
    const newPool = new Pool({
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      host: config.DB_HOST,
      port: parseInt(config.DB_PORT ?? '5432'),
      max: 20,
      ssl: config.DB_SSL_ENABLED
        ? {
            rejectUnauthorized: false,
          }
        : false,
    });

    // If there was a previous pool, end it
    if (pool && !isPoolClosed) {
      try {
        await pool.end();
      } catch (error) {
        logger.warn('Error ending previous pool:', error);
      }
    }

    // Update the pool reference
    pool = newPool;

    // Reinitialize drizzle with the new pool
    Object.assign(db, drizzle(pool, { schema }));

    logger.info('✅ Database connection initialized with environment configuration');
  } catch (error) {
    logger.error('❌ Failed to initialize database connection:', error);
    throw error;
  }
};

// Function to test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    logger.info('✅ PostgresSQL connected successfully');
    client.release();
  } catch (err: unknown) {
    logger.error(
      `❌ PostgresSQL connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
};

// For explicitly closing the pool when the application shutdowns
export const closePool = async (): Promise<void> => {
  if (!isPoolClosed) {
    isPoolClosed = true;
    await pool.end();
    logger.info('✅ Database connection pool closed');
  }
};
