// Set environment variables for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_PREFIX = '/api/v1';

// Database
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_SSL_ENABLED = 'false';

// JWT
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_EXPIRES_IN = '1h';

// Bcrypt
process.env.BCRYPT_SALT_ROUNDS = '10';

// Email
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test_password';
process.env.EMAIL_FROM = 'noreply@example.com';

// Redis
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_password';
process.env.REDIS_URL = 'redis://localhost:6379/0';
process.env.REDIS_DB = '0';
process.env.REDIS_SSL_ENABLED = 'false';
process.env.BULL_DASHBOARD_PORT = '3001';

// Sync
process.env.SYNC_INTERVAL_HOURS = '6';

// Rate Limiting
process.env.RATE_LIMIT_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '5';
process.env.TEST_RATE_LIMIT_WINDOW_MS = '1000';
process.env.TEST_RATE_LIMIT_MAX = '3';

// CORS
process.env.CORS_ORIGIN = '*';

// Logging
process.env.LOG_LEVEL = 'info';
process.env.LOG_FILE_PATH = 'logs/app.log';

// Encryption
process.env.ENCRYPTION_KEY = 'test_encryption_key';
process.env.ENCRYPTION_ENABLED = 'false';

// 3rd party APIs
process.env.PRODUCTS_API_URL = 'http://test-api.com';
process.env.API_USER_NAME = 'test_user';
process.env.API_PASSWORD = 'test_password';
process.env.PRODUCT_SYNC_INTERVAL = '60';

// Azure Key Vault
process.env.AZURE_KEYVAULT = '';
process.env.AZURE_KEYVAULT_ENABLED = 'false';
