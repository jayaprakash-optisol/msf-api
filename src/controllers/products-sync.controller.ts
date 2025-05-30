import { type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async.middleware';
import { ProductsFetchService } from '../services/products-fetch.service';
import { sendSuccess } from '../utils';
import { BadRequestError, InternalServerError } from '../utils/error.util';
import { env } from '../config/env.config';

export class ProductsSyncController {
  private readonly productsFetchService: ProductsFetchService;
  private readonly config = env.getConfig();

  constructor() {
    this.productsFetchService = ProductsFetchService.getInstance();
  }

  /**
   * Get current sync status and last update date
   */
  getSyncStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lastUpdateDate = await this.productsFetchService.getLastUpdateDate();

    const status = {
      lastSyncDate: lastUpdateDate?.toISOString() ?? null,
      syncConfigured: !!lastUpdateDate,
      nextSyncInfo:
        'Automatic sync runs every week based on PRODUCT_SYNC_INTERVAL environment variable',
    };

    sendSuccess(res, status, 'Product sync status retrieved successfully');
  });

  /**
   * Manually trigger a product sync
   */
  triggerManualSync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { resetLastUpdate = false } = req.body;

    try {
      // Get API credentials
      const login = this.config.API_USER_NAME;
      const password = this.config.API_PASSWORD;

      if (!login || !password) {
        throw new BadRequestError('API credentials not configured');
      }

      // Optionally reset the last update date for full sync
      if (resetLastUpdate) {
        const resetDate = new Date();
        resetDate.setDate(resetDate.getDate() - 30); // Reset to 30 days ago
        await this.productsFetchService.setLastUpdateDate(resetDate);
      }

      const lastUpdateDate = await this.productsFetchService.getLastUpdateDate();

      // Perform the sync
      const result = await this.productsFetchService.fetchProductsWithDateFilter(
        { login, password },
        {
          mode: 7,
          size: 1000,
          productType: 'MED',
        },
      );

      const products = result.data?.rows;
      let insertedCount = 0;

      if (products && products.length > 0) {
        insertedCount = await this.productsFetchService.insertProductsData(products);
      }

      const syncResult = {
        success: true,
        fetchedProducts: products?.length ?? 0,
        insertedProducts: insertedCount,
        lastSyncDate: lastUpdateDate?.toISOString() ?? null,
        currentSyncDate: new Date().toISOString(),
        resetLastUpdate: !!resetLastUpdate,
      };

      sendSuccess(res, syncResult, 'Manual product sync completed successfully');
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError(
        `Manual sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  });

  /**
   * Reset the last update date
   */
  resetLastUpdateDate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { daysAgo = 7 } = req.body;

    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() - daysAgo);

    await this.productsFetchService.setLastUpdateDate(resetDate);

    sendSuccess(
      res,
      {
        resetDate: resetDate.toISOString(),
        daysAgo: daysAgo,
      },
      `Last update date reset to ${daysAgo} days ago`,
    );
  });

  /**
   * Get products sync configuration
   */
  getSyncConfig = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const config = {
      apiUrl: this.config.PRODUCTS_API_URL,
      syncInterval: this.config.PRODUCT_SYNC_INTERVAL,
      hasCredentials: !!(this.config.API_USER_NAME && this.config.API_PASSWORD),
      productType: 'MED',
      defaultPageSize: 1000,
      mode: 7,
    };

    sendSuccess(res, config, 'Product sync configuration retrieved successfully');
  });
}
