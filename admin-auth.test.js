// Run: node --test admin-auth.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, scryptSync } from 'node:crypto';
import {
  createSession,
  verifyPassword,
  verifySession,
  getSession,
} from './lib/admin-auth.js';

const SECRET = 'test-session-secret';

// getSession/verifySession fall back to the ADMIN_SESSION_SECRET environment
// variable, so pin it for the whole test file.
process.env.ADMIN_SESSION_SECRET = SECRET;

test('verifyPassword accepts a matching scrypt hash', () => {
  const salt = randomBytes(16);
  const hash = scryptSync('correct horse', salt, 64);
  const stored = `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
  assert.equal(verifyPassword('correct horse', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
});

test('verifyPassword rejects malformed hashes', () => {
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', 'bcrypt$aa$bb'), false);
  assert.equal(verifyPassword('x', 'scrypt$nothex$alsonothex'), false);
});

test('session round-trips through createSession/verifySession', () => {
  const cookie = createSession('admin', SECRET);
  const session = verifySession(cookie, SECRET);
  assert.equal(session.username, 'admin');
});

test('session fails with a wrong secret, tampering or expiry', () => {
  const cookie = createSession('admin', SECRET);
  assert.equal(verifySession(cookie, 'other-secret'), null);
  assert.equal(verifySession('', SECRET), null);
  assert.equal(verifySession('not-a-session', SECRET), null);

  // tampered payload keeps the signature of a different payload
  const [payload, signature] = cookie.split('.');
  const tampered = `${payload}x.${signature}`;
  assert.equal(verifySession(tampered, SECRET), null);

  // an expired session is rejected
  const expired = Buffer.from(JSON.stringify({ u: 'admin', exp: Date.now() - 1 })).toString('base64url');
  const sig = Buffer.from(createHmac('sha256', SECRET).update(expired).digest()).toString('base64url');
  assert.equal(verifySession(`${expired}.${sig}`, SECRET), null);
});

test('getSession reads the cookie from a request-like object', () => {
  const cookie = createSession('admin', SECRET);
  const request = { cookies: { get: (name) => (name === 'admin_session' ? { value: cookie } : undefined) } };
  assert.equal(getSession(request).username, 'admin');
  assert.equal(getSession({ cookies: { get: () => undefined } }), null);
});
