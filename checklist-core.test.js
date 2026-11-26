// checklist-core.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFy,
  itemStatus,
  fyStatus,
  expiredItems,
  nextFyLabel,
  buildReminderEmail,
  todayIso,
} from './lib/checklist-core.js';

test('parseFy computes start and end dates', () => {
  assert.deepEqual(parseFy('2026-27'), { start: '2026-07-01', end: '2027-06-30', label: '2026-27' });
  assert.equal(parseFy('2026-2'), null);
  assert.equal(parseFy(''), null);
});

test('nextFyLabel rolls the year forward', () => {
  assert.equal(nextFyLabel('2026-27'), '2027-27');
  assert.equal(nextFyLabel('2026-2'), null);
});

test('fy-based document is valid before/on the FY end and expired after', () => {
  const fyEnd = '2027-06-30';
  const collected = { collected: true };
  assert.equal(itemStatus(collected, { kind: 'fy_based', fyEndDate: fyEnd, today: '2027-06-30' }).state, 'valid');
  assert.equal(itemStatus(collected, { kind: 'fy_based', fyEndDate: fyEnd, today: '2027-07-01' }).state, 'expired');
});

test('dated document uses its own expiry date', () => {
  const item = { collected: true, expiryDate: '2026-12-31' };
  assert.equal(itemStatus(item, { kind: 'dated', fyEndDate: '2027-06-30', today: '2026-12-31' }).state, 'valid');
  assert.equal(itemStatus(item, { kind: 'dated', fyEndDate: '2027-06-30', today: '2027-01-01' }).state, 'expired');
});

test('uncollected and missing-date items are neutral/valid', () => {
  assert.equal(itemStatus({ collected: false }, { kind: 'dated', today: '2027-01-01' }).state, 'uncollected');
  assert.equal(itemStatus({ collected: true, expiryDate: null }, { kind: 'dated', today: '2027-01-01' }).state, 'valid');
});

test('fyStatus counts expired, valid and uncollected', () => {
  const types = [
    { name: 'IRC', kind: 'fy_based' },
    { name: 'Membership certificate', kind: 'dated' },
    { name: 'Latest sanction', kind: 'dated' },
  ];
  const record = {
    fyEndDate: '2027-06-30',
    items: [
      { documentTypeId: 1, documentTypeName: 'IRC', collected: true },
      { documentTypeId: 2, documentTypeName: 'Membership certificate', collected: true, expiryDate: '2026-12-31' },
      { documentTypeId: 3, documentTypeName: 'Latest sanction', collected: false },
    ],
  };
  const counts = fyStatus(record, types, '2027-07-01');
  assert.equal(counts.expired, 2); // IRC (fy) + membership
  assert.equal(counts.uncollected, 1);
  assert.equal(counts.valid, 0);
});

test('expiredItems returns only collected, expired rows', () => {
  const types = [
    { id: 1, name: 'IRC', kind: 'fy_based' },
    { id: 2, name: 'Trade TP & KYC', kind: 'dated' },
  ];
  const record = {
    fyEndDate: '2027-06-30',
    items: [
      { documentTypeId: 1, documentTypeName: 'IRC', collected: true },
      { documentTypeId: 2, documentTypeName: 'Trade TP & KYC', collected: true, expiryDate: '2026-01-01' },
      { documentTypeId: 2, documentTypeName: 'Trade TP & KYC', collected: false, expiryDate: '2020-01-01' },
    ],
  };
  const expired = expiredItems(record, types, '2027-07-01');
  assert.equal(expired.length, 2);
  assert.deepEqual(expired.map((e) => e.name).sort(), ['IRC', 'Trade TP & KYC']);
});

test('buildReminderEmail includes count, client and expired list', () => {
  const email = buildReminderEmail({
    client: { name: 'Acme', ucic: 'UC123' },
    fyLabel: '2026-27',
    expired: [{ name: 'IRC', expiry: '2027-06-30' }],
    reminderCount: 3,
    today: '2027-07-05',
  });
  assert.match(email.subject, /Acme/);
  assert.match(email.text, /Reminder 3/);
  assert.match(email.text, /IRC/);
  assert.match(email.html, /Reminder 3/);
});

test('todayIso returns a UTC date', () => {
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/);
});
