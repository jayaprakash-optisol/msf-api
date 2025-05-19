import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router = Router();

// Register all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
