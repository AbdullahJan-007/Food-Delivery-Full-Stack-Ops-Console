import { Router } from 'express';
import {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuItem.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getMenuItems).post(authorize('admin'), createMenuItem);

router
  .route('/:id')
  .get(getMenuItem)
  .put(authorize('admin'), updateMenuItem)
  .delete(authorize('admin'), deleteMenuItem);

export default router;
