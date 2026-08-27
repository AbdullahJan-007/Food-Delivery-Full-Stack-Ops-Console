import { Router } from 'express';
import {
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

router.route('/').get(getOrders).post(createOrder);

router.route('/:id').get(getOrder).put(updateOrder).delete(authorize('admin'), deleteOrder);

router.patch('/:id/status', updateOrderStatus);

export default router;
