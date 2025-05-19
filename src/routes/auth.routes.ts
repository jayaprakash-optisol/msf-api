import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { validateLoginUser, validateRegisterUser } from '../validators/user.validator';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRegisterUser, authController.register);
router.post('/login', validateLoginUser, authController.login);

export default router;
