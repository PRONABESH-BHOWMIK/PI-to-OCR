// lib/checklist-auth.js
// Session handling for the Import Client Document Checklist tool users.
//
// Tool users are group accounts (one per bank's trade-finance team) created by
// the admin. Passwords use the same scrypt$<saltHex>$<hashHex> scheme as the
// admin panel, so verifyPassword() is reused from lib/admin-auth.js.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { verifyPassword } from './admin-auth.js';

export const TOOL_SESSION_COOKIE = 'checklist_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // one week

const b64url = (value) => Buffer.from(value).toString('base64url');

/** Hash a password for storage (same format as scripts/hash-password.js). */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** Verify a password against a stored scrypt hash. */
export function checkPassword(password, stored) {
  return verifyPassword(password, stored);
}

/**
 * Session secret. Falls back to a per-process random secret so local
 * development works; set CHECKLIST_SESSION_SECRET in production so sessions
 * are stable across Vercel instances.
 */
let ephemeralSecret;
export function getSessionSecret() {
  const secret = process.env.CHECKLIST_SESSION_SECRET;
  if (secret) return secret;
  ephemeralSecret = ephemeralSecret || randomBytes(32).toString('hex');
  return ephemeralSecret;
}

/** Create a signed session cookie value for a tool user. */
export function createSession(userId, username, secret = getSessionSecret()) {
  const payload = b64url(JSON.stringify({ id: userId, u: username, exp: Date.now() + SESSION_TTL_MS }));
  const signature = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${signature}`;
}

/** Verify a session cookie value. Returns { id, username } or null. */
export function verifySession(cookieValue, secret = getSessionSecret()) {
  if (!cookieValue || !secret) return null;
  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) return null;

  const expected = b64url(createHmac('sha256', secret).update(payload).digest());
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
  return { id: data.id, username: data.u };
}

/** Extract and verify the tool session from a request. */
export function getToolSession(request) {
  const cookieValue = request.cookies?.get(TOOL_SESSION_COOKIE)?.value;
  return verifySession(cookieValue);
}

/** Best-effort client IP (last entry of x-forwarded-for). */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',');
    const last = parts[parts.length - 1].trim();
    if (last) return last;
  }
  return request.headers.get('x-real-ip')?.trim() || '';
}
