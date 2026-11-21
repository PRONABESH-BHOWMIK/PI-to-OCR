// lib/usage.js
// Usage logging and the per-IP daily rate limit for the AI endpoint.
//
// Every request to /api/describe and /api/exchange-rate writes one row to the
// usage_logs table (see scripts/sql/schema.sql). The AI endpoint is limited to
// RATE_LIMIT_PER_DAY requests per IP address per UTC day.
//
// When no Postgres is configured, logging is skipped and the rate limit falls
// back to an in-memory counter so local development and single-instance
// deployments still enforce the limit.
import { dbEnabled, query } from './db.js';

// The AI endpoint this limit applies to (the only tool with a rate limit).
export const RATE_LIMIT_TOOL = 'pi-ocr';
export const RATE_LIMIT_PER_DAY = Math.max(0, Number(process.env.RATE_LIMIT_PER_DAY) || 50);

// In-memory fallback buckets: key = tool|ip|UTC-date -> request count.
const memoryBuckets = new Map();

/**
 * Best-effort client IP. The edge appends the real client address last in
 * x-forwarded-for; the last entry is the one the platform itself wrote, so it
 * cannot be spoofed by the client by prepending fake addresses.
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const last = parts[parts.length - 1].trim();
    if (last) return last;
  }
  return request.headers.get('x-real-ip')?.trim() || '';
}

export function utcDayStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Insert one usage row. No-op (with a warning) when no DB is configured. */
export async function logUsage({ tool, status, pages = 0, model = null, ip = '' }) {
  if (!dbEnabled) {
    console.warn(`[usage] database not configured - skipped log: ${tool} ${status}`);
    return;
  }
  try {
    await query(
      'INSERT INTO usage_logs (tool, status, pages, model, ip) VALUES ($1, $2, $3, $4, $5)',
      [tool, status, pages, model, ip],
    );
  } catch (error) {
    console.error('[usage] could not write usage log:', error.message);
  }
}

function pruneMemoryBuckets(today) {
  for (const key of memoryBuckets.keys()) {
    if (!key.endsWith(`|${today}`)) memoryBuckets.delete(key);
  }
}

/** Count requests for one tool + IP since a timestamp, DB first, memory fallback. */
export async function countRequests(tool, ip, sinceIso) {
  if (!dbEnabled) return memoryCount(tool, ip, sinceIso);
  try {
    const rows = await query(
      'SELECT COUNT(*)::int AS n FROM usage_logs WHERE tool = $1 AND ip = $2 AND created_at >= $3',
      [tool, ip, sinceIso],
    );
    return rows?.[0]?.n ?? memoryCount(tool, ip, sinceIso);
  } catch (error) {
    console.error('[usage] rate-limit count failed:', error.message);
    return memoryCount(tool, ip, sinceIso);
  }
}

function memoryCount(tool, ip, sinceIso) {
  return memoryBuckets.get(`${tool}|${ip}|${sinceIso.slice(0, 10)}`) ?? 0;
}

/**
 * Check the per-IP daily limit. Returns { allowed, count, limit }.
 * The count includes every logged request for the day (successes, errors and
 * earlier rate-limited attempts).
 */
export async function checkRateLimit(tool, ip) {
  const dayStart = utcDayStart();
  const sinceIso = dayStart.toISOString();
  pruneMemoryBuckets(sinceIso.slice(0, 10));
  const count = await countRequests(tool, ip, sinceIso);
  if (count >= RATE_LIMIT_PER_DAY) {
    return { allowed: false, count, limit: RATE_LIMIT_PER_DAY };
  }
  if (!dbEnabled) {
    memoryBuckets.set(`${tool}|${ip}|${sinceIso.slice(0, 10)}`, count + 1);
  }
  return { allowed: true, count: count + 1, limit: RATE_LIMIT_PER_DAY };
}
