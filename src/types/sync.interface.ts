/**
 * Valid table names for sync operations
 */
export type SyncTableName =
  | 'tasks'
  | 'parcels'
  | 'parcelItems'
  | 'products'
  | 'shipments'
  | 'users'
  | 'guests'
  | 'devices';

/**
 * Sync query parameters
 */
export interface SyncQueryParams {
  tableName: SyncTableName;
  lastSync: string;
}

/**
 * Sync service interface
 */
export interface ISyncService {
  /**
   * Fetch all rows from a table where updatedAt > lastSync date
   * @param tableName - The name of the table to query
   * @param updatedAfter - Only return rows updated after this date
   * @returns Array of records from the specified table
   */
  fetchAllAfter<T extends Record<string, unknown>>(
    tableName: SyncTableName,
    updatedAfter: Date,
  ): Promise<T[]>;
}
