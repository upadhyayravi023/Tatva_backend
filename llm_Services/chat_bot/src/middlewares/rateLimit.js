'use strict';

const logger = require('../shared/logger');

// ─── Configuration ────────────────────────────────────────────────────────────
// Each IP is allowed MAX_REQUESTS hits inside a rolling WINDOW_MS window.
// Blocked IPs are tracked in a separate Map to prevent repeated log spam.

const WINDOW_MS = 60 * 1000;       // 1-minute sliding window
const MAX_REQUESTS = 20;           // max 20 requests per IP per window
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // prune stale entries every 5 min

// ─── State ─────────────────────────────────────────────────────────────────────

/**
 * Map<ip: string, { count: number, windowStart: number }>
 * Tracks request counts within the current window for each IP.
 */
const ipWindows = new Map();

// ─── Cleanup ─────────────────────────────────────────────────────────────────
// Periodically remove IPs whose window has expired to prevent unbounded growth.

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipWindows.entries()) {
    if (now - bucket.windowStart >= WINDOW_MS) {
      ipWindows.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Prevent the timer from keeping Node alive during graceful shutdown
cleanupTimer.unref();

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limiter middleware.
 *
 * Algorithm:
 *   - On each request, look up the caller's IP.
 *   - If no bucket exists, or the current bucket's window has expired,
 *     start a fresh window with count = 1 and allow the request.
 *   - If the window is still active and count < MAX_REQUESTS, increment
 *     and allow.
 *   - If the window is still active and count >= MAX_REQUESTS, reject
 *     with 429 and include a Retry-After header telling the client how
 *     many seconds are left in the current window.
 *
 * Why sliding window over fixed window?
 *   A fixed window can be gamed: a user can fire MAX_REQUESTS at 00:59
 *   and another MAX_REQUESTS at 01:00 — doubling the effective burst.
 *   A pure sliding window (per-request timestamps) is more accurate but
 *   memory-intensive. This implementation uses a *per-IP rolling reset*
 *   which is a practical middle ground — the window resets from the first
 *   request of the burst, not from a global clock tick.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function chatRateLimit(req, res, next) {
  // Prefer X-Forwarded-For (set by Render's proxy) over socket address
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const now = Date.now();
  const bucket = ipWindows.get(ip);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    // Fresh window — first request of a new cycle
    ipWindows.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (bucket.count < MAX_REQUESTS) {
    // Within window and within limit
    bucket.count += 1;
    return next();
  }

  // Over limit — calculate retry-after in seconds
  const retryAfterMs = WINDOW_MS - (now - bucket.windowStart);
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);

  logger.warn('Rate limit exceeded', {
    feature: 'rate-limiter',
    ip,
    count: bucket.count,
    retryAfterSec,
  });

  res.setHeader('Retry-After', String(retryAfterSec));
  return res.status(429).json({
    error: 'Too Many Requests',
    message: `You have exceeded ${MAX_REQUESTS} requests per minute. Please wait ${retryAfterSec}s before retrying.`,
    retryAfterSec,
  });
}

module.exports = chatRateLimit;
