export const productsResponse = {
  errors: {
    fetchFailed: 'Failed to fetch products from API',
    insertFailed: 'Failed to insert products into database',
    noDataReceived: 'No product data received from API',
    invalidProductData: 'Invalid product data format',
    apiConnectionError: 'Unable to connect to products API',
    databaseInsertError: 'Database insertion failed for products',
  },
  success: {
    fetchSuccess: 'Products fetched successfully',
    insertSuccess: 'Products inserted successfully into database',
    syncCompleted: 'Product synchronization completed',
    noDataToInsert: 'No product data to insert',
  },
};
