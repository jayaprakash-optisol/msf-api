import * as dotenv from 'dotenv';
import { azureKeyVault } from './src/utils';

dotenv.config();

const config = {
  schema: './src/models',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: '',
    user: '',
    password: '',
    database: '',
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  verbose: true,
  strict: false,
};

// This loads secrets but doesn't block exports
(async () => {
  try {
    // Dynamically import to avoid top-level await

    if (process.env.AZURE_KEYVAULT_ENABLED === 'true') {
      console.log('Loading Azure Key Vault secrets...');
      const secrets = await azureKeyVault.getAllSecrets();

      // Update environment with secrets
      Object.assign(process.env, secrets);

      // Update config with new values
      config.dbCredentials.host = process.env.DB_HOST ?? '';
      config.dbCredentials.user = process.env.DB_USER ?? '';
      config.dbCredentials.password = process.env.DB_PASSWORD ?? '';
      config.dbCredentials.database = process.env.DB_NAME ?? '';
      config.dbCredentials.port = parseInt(process.env.DB_PORT ?? '5432', 10);

      console.log('AWS secrets loaded successfully');
    }
  } catch (error) {
    console.error('Failed to load AWS secrets:', error);
  }
})();

export default config;
