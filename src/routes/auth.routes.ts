import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateLoginUser, validateRegisterUser } from '../validators/user.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRegisterUser, authController.register);
router.post('/login', validateLoginUser, authController.login);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/refresh-token', authenticate, authController.refreshToken);

export default router;
