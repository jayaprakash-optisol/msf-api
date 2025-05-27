import { vi, afterEach } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { db } from '../src/config/database.config';

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

// Mock environment variables
vi.mock('../src/config/env.config', () => {
  const mockConfig = {
    NODE_ENV: 'test',
    PORT: '3000',
    API_PREFIX: '/api/v1',
    DB_NAME: 'test_db',
    DB_USER: 'test_user',
    DB_PASSWORD: 'test_password',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_SSL_ENABLED: false,
    JWT_SECRET: 'test_secret',
    JWT_EXPIRES_IN: '1h',
    BCRYPT_SALT_ROUNDS: 10,
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_DB: '0',
    BULL_DASHBOARD_PORT: '3001',
    SYNC_INTERVAL_HOURS: 6,
    RATE_LIMIT_ENABLED: false,
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX: '5',
    TEST_RATE_LIMIT_WINDOW_MS: '1000',
    TEST_RATE_LIMIT_MAX: '3',
    CORS_ORIGIN: '*',
    LOG_LEVEL: 'info',
    LOG_FILE_PATH: 'logs/app.log',
    ENCRYPTION_KEY: 'test_encryption_key',
    ENCRYPTION_ENABLED: false,
    PRODUCTS_API_URL: 'http://test-api.com',
    API_USER_NAME: 'test_user',
    API_PASSWORD: 'test_password',
    PRODUCT_SYNC_INTERVAL: 60,
    AZURE_KEYVAULT: '',
    AZURE_KEYVAULT_ENABLED: false,
  };

  const mockEnv = {
    env: {
      initialize: vi.fn().mockResolvedValue(undefined),
      getConfig: vi.fn().mockReturnValue(mockConfig),
      getInstance: vi.fn().mockReturnThis(),
    },
    EnvConfig: vi.fn(),
  };

  return mockEnv;
});

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
