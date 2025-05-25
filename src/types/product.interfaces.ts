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
}
