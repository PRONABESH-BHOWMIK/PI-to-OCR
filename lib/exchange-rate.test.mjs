import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBangladeshBankRate } from './exchange-rate.mjs';

const sample = `
  <html><body>
    <h3>FX Rate Sheet effective for 28/10/2026</h3>
    <table>
      <tr><th>Currency</th><th>Bid Rate</th><th>Ask Rate</th><th>WAR</th></tr>
      <tr><td>USD</td><td>123.9700</td><td>123.9800</td><td>123.9750</td></tr>
    </table>
    <table>
      <tr><th>Currency</th><th>Bid Rate</th><th>Ask Rate</th></tr>
      <tr><td>EUR</td><td>137.8906</td><td>137.9401</td></tr>
      <tr><td>JPY</td><td>0.7849</td><td>0.7850</td></tr>
      <tr><td>GBP</td><td>164.9306</td><td>165.0050</td></tr>
    </table>
  </body></html>`;

test('uses the ask column and publication date for USD', () => {
  const result = parseBangladeshBankRate(sample, 'USD');
  assert.equal(result.rate, 123.98);
  assert.equal(result.rateType, 'ask');
  assert.equal(result.effectiveDate, '2026-10-28');
  assert.equal(result.source, 'Bangladesh Bank');
});

test('reads cross rates without confusing bid and ask', () => {
  assert.equal(parseBangladeshBankRate(sample, 'EUR').rate, 137.9401);
  assert.equal(parseBangladeshBankRate(sample, 'JPY').rate, 0.785);
  assert.equal(parseBangladeshBankRate(sample, 'GBP').rate, 165.005);
});

test('returns null when the rate table is unavailable or unsupported', () => {
  assert.equal(parseBangladeshBankRate('<html>Access denied</html>', 'USD'), null);
  assert.equal(parseBangladeshBankRate(sample, 'AED'), null);
});
