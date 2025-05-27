import { env, EnvConfig } from '../config/env.config';

/**
 * Get the entire environment configuration
 * @returns The complete environment configuration object
 */
export const getConfig = (): EnvConfig => {
  try {
    return env.getConfig();
  } catch (error) {
    console.warn('Error getting environment config:', error);
    return {} as EnvConfig;
  }
};

/**
 * Access specific environment variable by key
 * @param key The environment variable key to access
 * @returns The value of the specified environment variable
 */
export const getEnv = <K extends keyof EnvConfig>(key: K): EnvConfig[K] => {
  try {
    const config = env.getConfig();
    return config[key];
  } catch (error) {
    console.warn(`Error getting environment variable ${String(key)}:`, error);
    // Return process.env with fallback to avoid errors
    const value = process.env[String(key)] as unknown;
    return value as EnvConfig[K];
  }
};

/**
 * Utility to check if the environment is production
 * @returns boolean indicating if the current environment is production
 */
export const isProduction = (): boolean => {
  try {
    return getEnv('NODE_ENV') === 'production';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
};

/**
 * Utility to check if the environment is development
 * @returns boolean indicating if the current environment is development
 */
export const isDevelopment = (): boolean => {
  try {
    return getEnv('NODE_ENV') === 'development';
  } catch {
    return process.env.NODE_ENV === 'development';
  }
};

/**
 * Utility to check if the environment is test
 * @returns boolean indicating if the current environment is test
 */
export const isTest = (): boolean => {
  try {
    return getEnv('NODE_ENV') === 'test';
  } catch {
    return process.env.NODE_ENV === 'test';
  }
};
