import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { logger } from './logger';

/**
 * Azure Key Vault utility for fetching secrets
 */
export class AzureKeyVaultUtil {
  private static instance: AzureKeyVaultUtil;
  private client: SecretClient | null = null;
  private isInitialized = false;
  private readonly azureKeyVaultUrl: string = process.env.AZURE_KEYVAULT ?? '';

  private constructor() {}

  /**
   * Get a singleton instance of AzureKeyVaultUtil
   */
  public static getInstance(): AzureKeyVaultUtil {
    if (!AzureKeyVaultUtil.instance) {
      AzureKeyVaultUtil.instance = new AzureKeyVaultUtil();
    }
    return AzureKeyVaultUtil.instance;
  }

  /**
   * Initialize the client if not already done
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!this.azureKeyVaultUrl) {
        logger.warn('Azure Key Vault URL not provided in environment variables');
        this.isInitialized = true;
        return;
      }

      const credential = new DefaultAzureCredential();
      this.client = new SecretClient(this.azureKeyVaultUrl, credential);
      this.isInitialized = true;
      logger.info('Azure Key Vault client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Azure Key Vault client', { error });
      this.client = null;
      this.isInitialized = true;
    }
  }

  /**
   * Fetch all secrets from Azure Key Vault
   * @returns Promise<Record<string, string>> - Object with key-value pairs of all secrets
   */
  public async getAllSecrets(): Promise<Record<string, string>> {
    await this.ensureInitialized();

    if (!this.client) {
      logger.warn('Azure Key Vault client not available');
      return {};
    }

    try {
      const secrets: Record<string, string> = {};
      const secretsIterator = this.client.listPropertiesOfSecrets();
      for await (const secretProperties of secretsIterator) {
        if (secretProperties.name) {
          try {
            const secret = await this.client.getSecret(secretProperties.name);
            if (secret.value) {
              secrets[secretProperties.name] = secret.value;
            }
          } catch (secretError) {
            logger.error(`Failed to fetch secret: ${secretProperties.name}`, {
              error: secretError,
            });
          }
        }
      }

      logger.info(
        `Successfully fetched ${Object.keys(secrets).length} secrets from Azure Key Vault`,
      );
      return secrets;
    } catch (error) {
      logger.error('Failed to fetch secrets from Azure Key Vault', { error });
      return {};
    }
  }

  /**
   * Get a specific secret from Azure Key Vault
   * @param secretName - Name of the secret to fetch
   * @returns Promise<string | null> - Secret value or null if not found
   */
  public async getSecret(secretName: string): Promise<string | null> {
    await this.ensureInitialized();

    if (!this.client) {
      logger.warn('Azure Key Vault client not available');
      return null;
    }

    try {
      const secret = await this.client.getSecret(secretName);
      return secret.value ?? null;
    } catch (error) {
      logger.error(`Failed to fetch secret: ${secretName}`, { error });
      return null;
    }
  }
}

// Export a singleton instance
export const azureKeyVault = AzureKeyVaultUtil.getInstance();
