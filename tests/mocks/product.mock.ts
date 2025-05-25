import { ApiProductItem, ProductsApiResponse, ProductsFetchOptions } from '../../src/types';

export const mockApiProductItem: ApiProductItem = {
  id: 'test-product-1',
  code: 'PROD001',
  description: 'Test Product Description',
  type: 'STANDARD',
  state: 'ACTIVE',
  standardizationLevel: 'HIGH',
  freeCode: 'FREE001',
  labels: {
    category: 'electronics',
    brand: 'TestBrand',
  },
};

export const mockApiProductItems: ApiProductItem[] = [
  mockApiProductItem,
  {
    id: 'test-product-2',
    code: 'PROD002',
    description: 'Another Test Product',
    type: 'CUSTOM',
    state: 'INACTIVE',
    standardizationLevel: 'MEDIUM',
    freeCode: 'FREE002',
    labels: {
      category: 'clothing',
      brand: 'AnotherBrand',
    },
  },
];

export const mockProductsApiResponse: ProductsApiResponse = {
  data: mockApiProductItems,
  rows: mockApiProductItems,
  total: 2,
  page: 1,
  size: 10,
};

export const mockProductsFetchOptions: ProductsFetchOptions = {
  login: 'test_user',
  password: 'test_password',
  mode: 1,
  size: 10,
  filter: 'active',
};

export const mockEmptyProductsApiResponse: ProductsApiResponse = {
  data: [],
  rows: [],
  total: 0,
  page: 1,
  size: 10,
};
