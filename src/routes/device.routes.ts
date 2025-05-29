import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { rateLimiter } from '../middleware';
import { validateDeviceRegistration, validateApiKey } from '../validators';

const router = Router();
const deviceController = new DeviceController();

// Register a new device
router.post('/', rateLimiter(), validateDeviceRegistration, deviceController.registerDevice);

// Get device by ID (requires authentication)
router.get('/:id', validateApiKey, deviceController.getDeviceById);

// Validate API key (internal use)
router.post('/validate', validateApiKey, deviceController.validateApiKey);

export default router;
