// lib/admin-auth.js
// Admin credentials and signed session cookies.
//
// Credentials come from the environment so nothing sensitive is stored in the
// repository:
//   ADMIN_USERNAME       - admin login name
//   ADMIN_PASSWORD_HASH  - scrypt hash, produced by:
//                           node scripts/hash-password.js "your password"
//   ADMIN_SESSION_SECRET - HMAC key for the session cookie (any long random
//                           string, e.g. `openssl rand -hex 32`)
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // one week

const b64url = (value) => Buffer.from(value).toString('base64url');

export function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME || '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    sessionSecret: process.env.ADMIN_SESSION_SECRET || '',
  };
}

export function adminConfigured() {
  const { username, passwordHash } = getAdminConfig();
  return Boolean(username && passwordHash);
}

/**
 * The HMAC key for session cookies. Falls back to a per-process random secret
 * so local development still works; set ADMIN_SESSION_SECRET so sessions are
 * stable across instances in production.
 */
let ephemeralSecret;
export function getSessionSecret() {
  const { sessionSecret } = getAdminConfig();
  if (sessionSecret) return sessionSecret;
  ephemeralSecret = ephemeralSecret || randomBytes(32).toString('hex');
  return ephemeralSecret;
}

/** Verify a password against a stored `scrypt$<saltHex>$<hashHex>` hash. */
export function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  // Reject anything that is not real hex: Buffer.from() silently decodes
  // invalid hex to an empty buffer, which would make two empty buffers "equal".
  if (scheme !== 'scrypt' || !/^[0-9a-f]+$/i.test(saltHex || '') || !/^[0-9a-f]+$/i.test(hashHex || '')) {
    return false;
  }
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Create a signed session cookie value: base64url(payload).base64url(hmac). */
export function createSession(username, secret = getSessionSecret()) {
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_MS }));
  const signature = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${signature}`;
}

/** Verify a session cookie value. Returns { username } or null. */
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
  return { username: data.u };
}

/** Extract and verify the session from a route-handler request. */
export function getSession(request) {
  const cookieValue = request.cookies?.get(SESSION_COOKIE)?.value;
  return verifySession(cookieValue);
}
