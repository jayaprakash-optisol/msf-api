import { products } from '../models';
import { type ServiceResponse } from './common.interface';

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export interface ProductsApiResponse {
  data: unknown[];
  rows?: ApiProductItem[];
  total: number;
  page: number;
  size: number;
}

export interface ProductsFetchOptions {
  login: string;
  password: string;
  mode: number;
  size: number;
  filter: string;
  page: number;
}

export interface ApiProductItem {
  id: string;
  code: string;
  description?: string;
  type?: string;
  state?: string;
  standardizationLevel?: string;
  freeCode?: string;
  labels?: Record<string, unknown>;
}

/**
 * Products fetch service interface
 */
export interface IProductsFetchService {
  /**
   * Fetch products from MSF API
   */
  fetchProducts(options: ProductsFetchOptions): Promise<ServiceResponse<ProductsApiResponse>>;

  /**
   * Insert fetched product data into products table
   */
  insertProductsData(productData: ApiProductItem[]): Promise<number>;

  /**
   * Get the last update date from Redis
   */
  getLastUpdateDate(): Promise<Date | null>;

  /**
   * Set the last update date in Redis
   */
  setLastUpdateDate(date: Date): Promise<void>;

  /**
   * Build filter string with date filtering for most recent updates
   */
  buildDateFilter(lastUpdateDate: Date | null, productType?: string): string;

  /**
   * Fetch products with automatic date filtering based on last sync
   */
  fetchProductsWithDateFilter(
    credentials: { login: string; password: string },
    options?: { mode?: number; size?: number; productType?: string; page?: number },
  ): Promise<ServiceResponse<ProductsApiResponse>>;
}
