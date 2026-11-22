import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';
import { Order } from '../models/Order.model.js';
import { AppError } from '../utils/AppError.js';
import { JWT_ALGORITHM, JWT_ISSUER, JWT_AUDIENCE } from '../utils/generateToken.js';
import { isValidObjectId } from '../utils/validators.js';
import { eventBus } from '../utils/eventBus.js';

const router = Router();

function initSse(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
}

// GET /api/realtime/admin?token=... — Real-time SSE stream for Admin/Staff Kitchen Panel
router.get('/admin', async (req, res) => {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  const headerToken =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : '';
  const token = headerToken || queryToken;

  if (!token) throw new AppError('Not authorized — no token provided', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    throw new AppError('Not authorized — invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw new AppError('Not authorized — session invalid', 401);
  }

  initSse(res);

  const channel = `org:${String(user.organization)}`;
  const onEvent = (payload) => {
    res.write(`event: order\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  eventBus.on(channel, onEvent);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off(channel, onEvent);
  });
});

// GET /api/realtime/order/:id — Public real-time SSE stream for Customer Live Order Tracking
router.get('/order/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw new AppError('Invalid order tracking ID', 400);
  }

  const exists = await Order.exists({ _id: req.params.id });
  if (!exists) throw new AppError('Order not found', 404);

  initSse(res);

  const channel = `order:${req.params.id}`;
  const onEvent = (payload) => {
    res.write(`event: status\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  eventBus.on(channel, onEvent);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off(channel, onEvent);
  });
});

export default router;
