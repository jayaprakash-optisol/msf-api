import { type Request, type Response } from 'express';
import { asyncHandler } from '../middleware/async.middleware';
import { SyncService } from '../services/sync.service';
import { sendSuccess } from '../utils';
import { ISyncService, SyncQueryParams } from '../types';

export class SyncController {
  private readonly syncService: ISyncService;

  constructor() {
    this.syncService = SyncService.getInstance();
  }

  /**
   * Sync data from any table updated after a specific date
   * Query parameters are validated by middleware
   */
  sync = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { tableName, lastSync } = req.query as unknown as SyncQueryParams;

    const date = new Date(lastSync);
    const result = await this.syncService.fetchAllAfter(tableName, date);

    sendSuccess(
      res,
      result,
      `Found ${result.length} ${tableName} records updated after ${lastSync}`,
    );
  });
}
