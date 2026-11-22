import { Router } from 'express';
import { getUsers, updateUser } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.patch('/:id', updateUser);

export default router;
