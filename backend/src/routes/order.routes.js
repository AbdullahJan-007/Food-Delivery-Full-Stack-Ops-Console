import { Router } from 'express';
import {
  getOrderStats,
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/order.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

// Static route must come before /:id so 'stats' is not treated as an ObjectId
router.get('/stats', getOrderStats);

router.route('/').get(getOrders).post(createOrder);

router.route('/:id').get(getOrder).put(updateOrder).delete(authorize('admin'), deleteOrder);

router.patch('/:id/status', updateOrderStatus);

export default router;
