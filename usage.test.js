// Run: node --test usage.test.js
// Exercises the in-memory rate-limit fallback (no POSTGRES_URL in the test
// environment, so lib/db.js leaves logging and counting without a database).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RATE_LIMIT_PER_DAY,
  checkRateLimit,
  getClientIp,
  logUsage,
  utcDayStart,
} from './lib/usage.js';

test('getClientIp takes the last x-forwarded-for entry (edge-written, not spoofable)', () => {
  const request = {
    headers: { get: (name) => (name === 'x-forwarded-for' ? '203.0.113.9, 198.51.100.20' : null) },
  };
  assert.equal(getClientIp(request), '198.51.100.20');
  const single = { headers: { get: (name) => (name === 'x-forwarded-for' ? '203.0.113.9' : null) } };
  assert.equal(getClientIp(single), '203.0.113.9');
  const none = { headers: { get: () => null } };
  assert.equal(getClientIp(none), '');
});

test('utcDayStart returns midnight UTC of today', () => {
  const start = utcDayStart(new Date('2026-10-27T15:30:00Z'));
  assert.equal(start.toISOString(), '2026-10-27T00:00:00.000Z');
});

test('rate limit allows RATE_LIMIT_PER_DAY requests then blocks', async () => {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  assert.equal(RATE_LIMIT_PER_DAY, 50);
  for (let i = 1; i <= RATE_LIMIT_PER_DAY; i += 1) {
    const result = await checkRateLimit('pi-ocr', ip);
    assert.equal(result.allowed, true, `request ${i} should be allowed`);
    assert.equal(result.count, i);
  }
  const blocked = await checkRateLimit('pi-ocr', ip);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.count, RATE_LIMIT_PER_DAY);
  // a different IP or tool keeps its own bucket
  const other = await checkRateLimit('pi-ocr', `${ip}-other`);
  assert.equal(other.allowed, true);
  const otherTool = await checkRateLimit('exchange-rate', ip);
  assert.equal(otherTool.allowed, true);
});

test('logUsage is a no-op without a database and never throws', async () => {
  await logUsage({ tool: 'pi-ocr', status: 'success', pages: 2, model: 'qwen/qwen3.8-27b', ip: '198.51.100.7' });
  await logUsage({ tool: 'exchange-rate', status: 'error', ip: '198.51.100.7' });
  assert.ok(true);
});
