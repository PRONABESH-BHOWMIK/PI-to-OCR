// Run: node --test hs-code-parse.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHsCode, parseHsCodes } from './lib/hs-code-parse.js';

test('normalizeHsCode accepts 8 digits without dots', () => {
  assert.equal(normalizeHsCode('52083900'), '52083900');
});

test('normalizeHsCode accepts dotted codes and strips the dots', () => {
  assert.equal(normalizeHsCode('5208.39.00'), '52083900');
  assert.equal(normalizeHsCode(' 5208.39.00 '), '52083900');
});

test('normalizeHsCode rejects wrong lengths, letters and stray characters', () => {
  assert.equal(normalizeHsCode('5208390'), null);
  assert.equal(normalizeHsCode('520839001'), null);
  assert.equal(normalizeHsCode('5208.39.00.1'), null);
  assert.equal(normalizeHsCode('abcdefgh'), null);
  assert.equal(normalizeHsCode(''), null);
  assert.equal(normalizeHsCode(null), null);
});

test('parseHsCodes splits on commas and normalizes each code', () => {
  assert.deepEqual(parseHsCodes('52083900, 5208.39.00,01012100'), ['52083900', '01012100']);
});

test('parseHsCodes de-duplicates and keeps order', () => {
  assert.deepEqual(parseHsCodes('01012100, 0101.21.00, 01012100'), ['01012100']);
});

test('parseHsCodes drops invalid entries', () => {
  assert.deepEqual(parseHsCodes('52083900, abc, 123, 0101.21.00'), ['52083900', '01012100']);
});

test('parseHsCodes on empty input returns an empty list', () => {
  assert.deepEqual(parseHsCodes(''), []);
  assert.deepEqual(parseHsCodes(undefined), []);
});
