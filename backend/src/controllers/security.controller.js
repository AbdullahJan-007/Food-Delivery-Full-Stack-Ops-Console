import { AppError } from '../utils/AppError.js';
import {
  getTrafficStats,
  blockIp,
  unblockIp,
  getClientIp,
} from '../middleware/trafficControl.middleware.js';
import { isNonEmptyString } from '../utils/validators.js';

const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

// GET /api/security/traffic — admin only.
export async function getTrafficMonitor(req, res) {
  res.status(200).json({
    success: true,
    message: 'Traffic control metrics fetched',
    data: getTrafficStats(),
  });
}

// POST /api/security/block-ip — admin only.
export async function manualBlockIp(req, res) {
  const { ip, reason, durationMinutes } = req.body ?? {};

  if (!isNonEmptyString(ip) || !IP_RE.test(ip.trim())) {
    throw new AppError('Please provide a valid IPv4 or IPv6 address', 400);
  }

  const targetIp = ip.trim();
  const callerIp = getClientIp(req);
  if (targetIp === callerIp) {
    throw new AppError('You cannot block your own current IP address', 400);
  }

  const parsedMins = Number(durationMinutes);
  const durationMs =
    Number.isFinite(parsedMins) && parsedMins > 0
      ? Math.min(parsedMins, 1440) * 60_000
      : 60 * 60_000;

  const entry = blockIp(targetIp, {
    reason: isNonEmptyString(reason) ? reason.trim().slice(0, 120) : 'Blocked by administrator',
    durationMs,
    manual: true,
  });

  res.status(201).json({
    success: true,
    message: `IP ${targetIp} has been blocked`,
    data: entry,
  });
}

// DELETE /api/security/block-ip/:ip — admin only.
export async function manualUnblockIp(req, res) {
  const targetIp = decodeURIComponent(req.params.ip || '').trim();
  if (!targetIp) {
    throw new AppError('IP address is required', 400);
  }

  const removed = unblockIp(targetIp);
  if (!removed) {
    throw new AppError(`IP ${targetIp} is not currently blocked`, 404);
  }

  res.status(200).json({
    success: true,
    message: `IP ${targetIp} has been unblocked`,
    data: null,
  });
}
