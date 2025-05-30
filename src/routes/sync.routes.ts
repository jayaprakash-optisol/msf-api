import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { ProductsSyncController } from '../controllers/products-sync.controller';
import { authenticateDevice, rateLimiter } from '../middleware';
import { validateSyncQuery, validateManualSync, validateResetLastUpdate } from '../validators';

const router = Router();
const syncController = new SyncController();
const productsSyncController = new ProductsSyncController();

// Sync route that accepts tableName and lastSync query parameters
// Allow device authentication
router.get('/', authenticateDevice, rateLimiter(), validateSyncQuery, syncController.sync);

// Product sync specific routes
router.get(
  '/products/status',
  authenticateDevice,
  rateLimiter(),
  productsSyncController.getSyncStatus,
);
router.get(
  '/products/config',
  authenticateDevice,
  rateLimiter(),
  productsSyncController.getSyncConfig,
);
router.post(
  '/products/manual',
  authenticateDevice,
  rateLimiter(),
  validateManualSync,
  productsSyncController.triggerManualSync,
);
router.post(
  '/products/reset',
  authenticateDevice,
  rateLimiter(),
  validateResetLastUpdate,
  productsSyncController.resetLastUpdateDate,
);

export default router;
