import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { authenticateDevice, rateLimiter } from '../middleware';
import { validateSyncQuery } from '../validators';

const router = Router();
const syncController = new SyncController();

// Sync route that accepts tableName and lastSync query parameters
// Allow device authentication
router.get('/', authenticateDevice, rateLimiter(), validateSyncQuery, syncController.sync);

export default router;
