import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { authenticate } from '../middleware';
import { validateSyncQuery } from '../validators';

const router = Router();
const syncController = new SyncController();

// Single sync route that accepts tableName and lastSync query parameters
router.get('/', authenticate, validateSyncQuery, syncController.sync);

export default router;
