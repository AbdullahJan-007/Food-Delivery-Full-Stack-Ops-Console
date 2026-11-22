import { AppError } from '../utils/AppError.js';

const BURST_WINDOW_MS = 5_000;
const BURST_MAX_REQUESTS = 30;
const QUARANTINE_THRESHOLD = 10;
const DEFAULT_QUARANTINE_MS = 15 * 60 * 1000;
const MAX_EVENTS = 100;

// Common automated scanner / exploit probe patterns
const SUSPICIOUS_PATH_RE =
  /(\.\.|\/\.env|\/\.git|\/wp-admin|\/wp-login|\/phpmyadmin|\/etc\/passwd|<script|%3cscript)/i;

const state = {
  totalRequests: 0,
  blockedRequests: 0,
  /** @type {Map<string, number[]>} */
  burstWindows: new Map(),
  /** @type {Map<string, { points: number, lastSeen: number, failedLogins: number }>} */
  strikes: new Map(),
  /** @type {Map<string, { ip: string, reason: string, blockedAt: string, expiresAt: number | null, manual: boolean }>} */
  blockedIps: new Map(),
  /** @type {Array<{ id: string, type: string, ip: string, path: string, severity: 'low'|'medium'|'high'|'critical', action: string, timestamp: string }>} */
  events: [],
};

let eventSeq = 1;

export function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function logEvent({ type, ip, path, severity, action }) {
  state.events.unshift({
    id: `sec_${Date.now()}_${eventSeq++}`,
    type,
    ip,
    path,
    severity,
    action,
    timestamp: new Date().toISOString(),
  });
  if (state.events.length > MAX_EVENTS) {
    state.events.length = MAX_EVENTS;
  }
}

export function blockIp(ip, { reason = 'Automated abuse threshold exceeded', durationMs = DEFAULT_QUARANTINE_MS, manual = false } = {}) {
  const cleanIp = String(ip || '').trim();
  if (!cleanIp) return null;

  const entry = {
    ip: cleanIp,
    reason,
    blockedAt: new Date().toISOString(),
    expiresAt: durationMs ? Date.now() + durationMs : null,
    manual,
  };
  state.blockedIps.set(cleanIp, entry);
  logEvent({
    type: manual ? 'MANUAL_BLOCK' : 'AUTO_QUARANTINE',
    ip: cleanIp,
    path: '-',
    severity: 'critical',
    action: manual ? 'Manually blocked by admin' : `Auto-quarantined (${reason})`,
  });
  return entry;
}

export function unblockIp(ip) {
  const cleanIp = String(ip || '').trim();
  const existed = state.blockedIps.delete(cleanIp);
  state.strikes.delete(cleanIp);
  state.burstWindows.delete(cleanIp);
  if (existed) {
    logEvent({
      type: 'MANUAL_UNBLOCK',
      ip: cleanIp,
      path: '-',
      severity: 'low',
      action: 'Unblocked by admin',
    });
  }
  return existed;
}

export function recordSecurityStrike(ip, { type, path = '-', points = 3, severity = 'medium', action = 'Flagged' }) {
  const now = Date.now();
  const prev = state.strikes.get(ip) ?? { points: 0, lastSeen: now, failedLogins: 0 };

  // Decay old strikes if IP was quiet for > 15 minutes
  const decayedPoints = now - prev.lastSeen > DEFAULT_QUARANTINE_MS ? 0 : prev.points;
  const nextPoints = decayedPoints + points;

  state.strikes.set(ip, {
    points: nextPoints,
    lastSeen: now,
    failedLogins: prev.failedLogins,
  });

  logEvent({ type, ip, path, severity, action });

  if (nextPoints >= QUARANTINE_THRESHOLD && !state.blockedIps.has(ip)) {
    blockIp(ip, {
      reason: `Threat score reached ${nextPoints} (${type})`,
      durationMs: DEFAULT_QUARANTINE_MS,
      manual: false,
    });
  }
}

export function recordAuthFailure(ip, path = '/api/auth/login') {
  const now = Date.now();
  const prev = state.strikes.get(ip) ?? { points: 0, lastSeen: now, failedLogins: 0 };
  const failedLogins = now - prev.lastSeen > DEFAULT_QUARANTINE_MS ? 1 : prev.failedLogins + 1;
  state.strikes.set(ip, { ...prev, failedLogins, lastSeen: now });

  if (failedLogins >= 5) {
    recordSecurityStrike(ip, {
      type: 'BRUTE_FORCE_LOGIN',
      path,
      points: 5,
      severity: 'high',
      action: `Brute-force detected (${failedLogins} failed logins)`,
    });
  }
}

export function clearAuthFailures(ip) {
  const prev = state.strikes.get(ip);
  if (prev) {
    state.strikes.set(ip, { ...prev, failedLogins: 0 });
  }
}

function getActiveBlock(ip) {
  const entry = state.blockedIps.get(ip);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    state.blockedIps.delete(ip);
    return null;
  }
  return entry;
}

export function getTrafficStats() {
  const now = Date.now();
  const activeBlocked = [];
  for (const [ip, entry] of state.blockedIps.entries()) {
    if (entry.expiresAt && now > entry.expiresAt) {
      state.blockedIps.delete(ip);
      continue;
    }
    activeBlocked.push({
      ...entry,
      remainingSeconds: entry.expiresAt ? Math.max(0, Math.ceil((entry.expiresAt - now) / 1000)) : null,
    });
  }

  return {
    status: 'active',
    policy: {
      burstLimit: `${BURST_MAX_REQUESTS} req / ${BURST_WINDOW_MS / 1000}s`,
      quarantineThreshold: QUARANTINE_THRESHOLD,
      quarantineMinutes: DEFAULT_QUARANTINE_MS / 60_000,
    },
    metrics: {
      totalRequests: state.totalRequests,
      blockedRequests: state.blockedRequests,
      activeBlockedIps: activeBlocked.length,
      trackedIps: state.strikes.size,
    },
    blockedIps: activeBlocked,
    recentEvents: state.events.slice(0, 30),
  };
}

export function resetTrafficState() {
  state.totalRequests = 0;
  state.blockedRequests = 0;
  state.burstWindows.clear();
  state.strikes.clear();
  state.blockedIps.clear();
  state.events = [];
}

/**
 * Real-time Traffic Control & Anti-Abuse Shield middleware.
 * - Enforces IP quarantine list (manual & automated).
 * - Blocks obvious scanner / path-traversal / script-injection URLs immediately.
 * - Applies a 5-second burst-flood detector (enabled in prod/dev, and in tests when ENABLE_TRAFFIC_SHIELD_IN_TEST=true).
 */
export function trafficShield(req, res, next) {
  state.totalRequests += 1;

  const ip = getClientIp(req);
  const fullPath = req.originalUrl || req.url || '/';

  // 1. Check active quarantine / manual IP block
  const activeBlock = getActiveBlock(ip);
  if (activeBlock) {
    state.blockedRequests += 1;
    const retryAfter = activeBlock.expiresAt
      ? Math.max(1, Math.ceil((activeBlock.expiresAt - Date.now()) / 1000))
      : 900;
    res.setHeader('Retry-After', String(retryAfter));
    throw new AppError('Traffic control blocked this IP due to suspicious activity', 429);
  }

  // 2. Detect automated vulnerability scanner / path traversal probes
  if (SUSPICIOUS_PATH_RE.test(fullPath)) {
    state.blockedRequests += 1;
    recordSecurityStrike(ip, {
      type: 'SCANNER_PROBE',
      path: fullPath.slice(0, 120),
      points: 5,
      severity: 'high',
      action: 'Blocked suspicious URL probe',
    });
    throw new AppError('Request blocked by security policy', 403);
  }

  // 3. Burst flood protection (skipped during normal unit/integration tests unless explicitly toggled on)
  const enforceBurst =
    process.env.NODE_ENV !== 'test' || process.env.ENABLE_TRAFFIC_SHIELD_IN_TEST === 'true';

  if (enforceBurst) {
    const now = Date.now();
    const windowStart = now - BURST_WINDOW_MS;
    const timestamps = (state.burstWindows.get(ip) ?? []).filter((t) => t > windowStart);
    timestamps.push(now);
    state.burstWindows.set(ip, timestamps);

    if (timestamps.length > BURST_MAX_REQUESTS) {
      state.blockedRequests += 1;
      res.setHeader('Retry-After', String(Math.ceil(BURST_WINDOW_MS / 1000)));
      recordSecurityStrike(ip, {
        type: 'BURST_FLOOD',
        path: fullPath.slice(0, 120),
        points: 4,
        severity: 'high',
        action: `Burst exceeded (${timestamps.length} req in 5s)`,
      });
      throw new AppError('Too many requests in a short burst — please slow down', 429);
    }
  }

  next();
}
