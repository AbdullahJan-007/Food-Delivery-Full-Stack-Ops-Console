import { Router } from 'express';
import authRoutes from './auth.routes.js';
import menuItemRoutes from './menuItem.routes.js';
import orderRoutes from './order.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/orders', orderRoutes);

export default router;
