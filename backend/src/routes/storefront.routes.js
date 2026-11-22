import { Router } from 'express';
import {
  getStorefront,
  placeCustomerOrder,
  trackCustomerOrder,
} from '../controllers/storefront.controller.js';

const router = Router();

router.get('/', getStorefront);
router.post('/orders', placeCustomerOrder);
router.get('/orders/:id', trackCustomerOrder);

export default router;
