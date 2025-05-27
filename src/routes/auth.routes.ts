import { Router } from 'express';

import { AuthController } from '../controllers';
import { authenticate } from '../middleware/auth.middleware';
import { validateLoginUser, validateRegisterUser } from '../validators';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRegisterUser, authController.register);
router.post('/login', validateLoginUser, authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAllDevices);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/refresh-token', authenticate, authController.refreshToken);

export default router;
