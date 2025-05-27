import dotenv from 'dotenv';
import { z } from 'zod';
import { azureKeyVault, logger } from '../utils';

// Load environment variables from .env file
dotenv.config();

// Define environment variable schema with validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  API_PREFIX: z.string().default('/api/v1'),

  // Database
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_SSL_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  // Bcrypt
  BCRYPT_SALT_ROUNDS: z
    .string()
    .transform(val => parseInt(val, 10))
    .default('10'),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  BULL_DASHBOARD_PORT: z.string().default('3001'),

  // Sync
  SYNC_INTERVAL_HOURS: z
    .string()
    .transform(val => parseInt(val, 10))
    .default('6'),

  // Rate Limiting
  RATE_LIMIT_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('5'),
  // Test Rate Limiting
  TEST_RATE_LIMIT_WINDOW_MS: z.string().default('1000'),
  TEST_RATE_LIMIT_MAX: z.string().default('3'),

  CORS_ORIGIN: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_FILE_PATH: z.string().default('logs/app.log'),

  // Encryption
  ENCRYPTION_KEY: z.string(),
  ENCRYPTION_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),

  // 3rd party APIS
  PRODUCTS_API_URL: z.string(),
  API_USER_NAME: z.string(),
  API_PASSWORD: z.string(),
  PRODUCT_SYNC_INTERVAL: z.string().transform(val => parseInt(val, 10)),

  // Azure Key Vault
  AZURE_KEYVAULT: z.string().optional(),
  AZURE_KEYVAULT_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
});

// Type for the parsed environment variables
export type EnvConfig = z.infer<typeof envSchema>;

// Global environment configuration singleton
class Environment {
  private static instance: Environment;
  private initialized = false;
  private config: EnvConfig;

  private constructor() {
    // Initial parse from process.env
    this.config = envSchema.parse(process.env);
  }

  public static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('Environment already initialized, skipping');
      return;
    }

    if (process.env.ENCRYPTION_ENABLED === 'true') {
      try {
        const secrets = await azureKeyVault.getAllSecrets();
        Object.assign(process.env, secrets);
        this.config = envSchema.parse(process.env);
        logger.info('✅ Azure Key Vault secrets loaded successfully');
      } catch (error) {
        logger.error('Failed to load Azure Key Vault secrets:', error);
        process.exit(1);
      }
    } else {
      console.log('config', this.config);

      logger.info('✅ Environment loaded from local .env file');
    }

    this.initialized = true;
  }

  public getConfig(): EnvConfig {
    return this.config;
  }
}

// Export singleton instance
export const env = Environment.getInstance();
