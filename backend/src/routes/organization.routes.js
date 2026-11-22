import { Router } from 'express';
import { getOrganization, updateOrganization } from '../controllers/organization.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', getOrganization);
router.patch('/', authorize('admin'), updateOrganization);

export default router;
