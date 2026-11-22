import { Router } from 'express';
import {
  getTrafficMonitor,
  manualBlockIp,
  manualUnblockIp,
} from '../controllers/security.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/traffic', getTrafficMonitor);
router.post('/block-ip', manualBlockIp);
router.delete('/block-ip/:ip', manualUnblockIp);

export default router;
