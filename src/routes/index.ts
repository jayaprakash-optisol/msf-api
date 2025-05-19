import { Router } from 'express';

import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import guestRoutes from './guest.routes';

const router = Router();

// Register all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/guests', guestRoutes);

export default router;
