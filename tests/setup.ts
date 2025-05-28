// Load test environment variables before any other imports
import './test-env';

import { vi, afterEach } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { db } from '../src/config/database.config';

// Define raw mock config that matches the structure expected in env.config.ts
const mockConfig = {
  NODE_ENV: 'test',
  PORT: '3000',
  API_PREFIX: '/api/v1',
  DB_NAME: 'test_db',
  DB_USER: 'test_user',
  DB_PASSWORD: 'test_password',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_SSL_ENABLED: 'false',
  JWT_SECRET: 'test_secret',
  JWT_EXPIRES_IN: '1h',
  BCRYPT_SALT_ROUNDS: '10',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  REDIS_PASSWORD: 'test_password',
  REDIS_URL: 'redis://localhost:6379/0',
  REDIS_SSL_ENABLED: 'false',
  BULL_DASHBOARD_PORT: '3001',
  SYNC_INTERVAL_HOURS: '6',
  RATE_LIMIT_ENABLED: 'false',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX: '5',
  TEST_RATE_LIMIT_WINDOW_MS: '1000',
  TEST_RATE_LIMIT_MAX: '3',
  CORS_ORIGIN: '*',
  LOG_LEVEL: 'info',
  LOG_FILE_PATH: 'logs/app.log',
  ENCRYPTION_KEY: 'test_encryption_key',
  ENCRYPTION_ENABLED: 'false',
  PRODUCTS_API_URL: 'http://test-api.com',
  API_USER_NAME: 'test_user',
  API_PASSWORD: 'test_password',
  PRODUCT_SYNC_INTERVAL: '60',
  AZURE_KEYVAULT: '',
  AZURE_KEYVAULT_ENABLED: 'false',
  SMTP_HOST: 'test-smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'test@example.com',
  SMTP_PASS: 'test_password',
  EMAIL_FROM: 'noreply@example.com',
};

// Create a processed config object that matches the structure returned by env.getConfig()
// This converts strings to appropriate types (booleans, numbers) as defined in env.config.ts
const processedConfig = {
  ...mockConfig,
  NODE_ENV: 'test',
  BCRYPT_SALT_ROUNDS: 10,
  DB_SSL_ENABLED: false,
  RATE_LIMIT_ENABLED: false,
  ENCRYPTION_ENABLED: false,
  AZURE_KEYVAULT_ENABLED: false,
  REDIS_SSL_ENABLED: false,
  PRODUCT_SYNC_INTERVAL: 60,
  SYNC_INTERVAL_HOURS: 6,
  SMTP_PORT: 587,
};

// Mock zod validation before importing env.config
vi.mock('zod', async () => {
  const actual = (await vi.importActual('zod')) as Record<string, any>;
  return {
    ...actual,
    z: {
      ...actual.z,
      object: () => ({
        parse: () => processedConfig,
        safeParse: () => ({ success: true, data: processedConfig }),
        partial: () => ({
          parse: () => processedConfig,
          safeParse: () => ({ success: true, data: processedConfig }),
        }),
        extend: () => ({
          parse: () => processedConfig,
          safeParse: () => ({ success: true, data: processedConfig }),
        }),
      }),
      string: () => ({
        transform: () => ({
          default: () => ({
            optional: () => true,
          }),
        }),
        default: () => ({
          transform: () => ({
            default: () => true,
          }),
        }),
        optional: () => true,
      }),
      enum: () => ({
        default: () => 'test',
      }),
    },
  };
});

// Mock database
vi.mock('../src/config/database.config', () => ({
  db: mockDeep<typeof db>(),
}));

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockImplementation(password => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn().mockImplementation((password, hash) => {
      return Promise.resolve(hash === `hashed_${password}` || hash === password);
    }),
  },
}));

// Mock jwt
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockImplementation(() => 'mock_token'),
    verify: vi.fn().mockImplementation((token, secret) => {
      if (token === 'invalid_token') throw new Error('Invalid token');
      return { userId: 1, email: 'test@example.com', role: 'user' };
    }),
  },
}));

// Mock environment config
vi.mock('../src/config/env.config', () => {
  return {
    env: {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn().mockReturnValue(processedConfig),
      getInstance: vi.fn().mockReturnThis(),
    },
    EnvConfig: vi.fn(),
  };
});

// Mock ioredis to fix Redis connection issues
vi.mock('ioredis', () => {
  const Redis = vi.fn();
  Redis.prototype.connect = vi.fn();
  Redis.prototype.disconnect = vi.fn();
  Redis.prototype.on = vi.fn();
  Redis.prototype.set = vi.fn().mockResolvedValue('OK');
  Redis.prototype.get = vi.fn().mockResolvedValue(null);
  Redis.prototype.del = vi.fn().mockResolvedValue(1);
  return Redis;
});

// Mock bullmq which depends on Redis
vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue({ id: 'job-id' }),
      getJobs: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
    QueueEvents: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock drizzle.config.ts for tests
vi.mock('../drizzle.config', async () => {
  const originalConfigModule = (await vi.importActual('../drizzle.config')) as { default: any };
  const originalConfig = originalConfigModule.default;

  // Ensure all process.env values used by drizzle.config are from our mockConfig
  const dbCredentials = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'), // Ensure port is a number
    // Correctly interpret DB_SSL_ENABLED for the test environment
    ssl:
      process.env.DB_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized: false,
          }
        : false,
  };

  return {
    default: {
      ...originalConfig,
      dbCredentials,
    },
  };
});

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
