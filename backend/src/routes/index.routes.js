import { Router } from 'express';
import authRoutes from './auth.routes.js';
import menuItemRoutes from './menuItem.routes.js';
import orderRoutes from './order.routes.js';
import userRoutes from './user.routes.js';
import organizationRoutes from './organization.routes.js';
import securityRoutes from './security.routes.js';
import storefrontRoutes from './storefront.routes.js';
import realtimeRoutes from './realtime.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/organization', organizationRoutes);
router.use('/menu-items', menuItemRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/security', securityRoutes);
router.use('/storefront', storefrontRoutes);
router.use('/realtime', realtimeRoutes);

export default router;
