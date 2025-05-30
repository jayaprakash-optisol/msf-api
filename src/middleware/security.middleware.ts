import { type NextFunction, type Request, type Response } from 'express';
import { getEnv } from '../utils';

const CSP_POLICY =
  "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'";

/**
 * CORS configuration middleware
 * Controls which domains can access the API
 */
export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    // If CORS_ORIGIN is '*', allow all origins
    if (getEnv('CORS_ORIGIN') === '*') {
      callback(null, true);
      return;
    }

    // Otherwise, check if the origin is in the allowed list
    const allowedOrigins = getEnv('CORS_ORIGIN')
      .split(',')
      .map(o => o.trim());
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200, // For legacy browser support
};

/**
 * Content-Security-Policy middleware
 * Adds CSP headers to prevent XSS attacks
 */
export const contentSecurityPolicy = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Security-Policy', CSP_POLICY);
  next();
};

/**
 * Prevent MIME type sniffing
 */
export const noSniff = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Enable cross-site scripting filter in browsers
 */
export const xssFilter = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

/**
 * Prevents clickjacking by restricting frame embedding
 */
export const frameGuard = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Set a Strict-Transport-Security header to enforce HTTPS
 */
export const hsts = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

/**
 * Cache control middleware
 * Controls how responses are cached
 */
export const cacheControl = (req: Request, res: Response, next: NextFunction): void => {
  // Only apply to GET requests
  if (req.method === 'GET') {
    // Cache public resources for 1 day
    if (req.path.startsWith('/api/v1/public')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      // No caching for API endpoints by default
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
  next();
};
