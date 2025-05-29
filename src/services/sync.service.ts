import { desc, gt } from 'drizzle-orm';
import { db } from '../config/database.config';
import { ISyncService, SyncTableName } from '../types';
import {
  tasks,
  parcels,
  parcelItems,
  products,
  shipments,
  users,
  guests,
  devices,
} from '../models';

export class SyncService implements ISyncService {
  private static instance: SyncService;
  private readonly tableMap = {
    tasks,
    parcels,
    parcelItems,
    products,
    shipments,
    users,
    guests,
    devices,
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Fetch all rows from a table where updatedAt > updatedAfter
   *
   * @param tableName    The name of the table to query
   * @param updatedAfter Only return rows updated after this date
   */
  async fetchAllAfter<T extends Record<string, unknown>>(
    tableName: SyncTableName,
    updatedAfter: Date,
  ): Promise<T[]> {
    const table = this.tableMap[tableName];
    const result = await db
      .select()
      .from(table)
      .where(gt(table.updatedAt, updatedAfter))
      .orderBy(desc(table.updatedAt));
    return result as T[];
  }
}
