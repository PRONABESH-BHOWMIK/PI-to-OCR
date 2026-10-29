import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLcCosts,
  calculateTenor,
  displayDateToIso,
  expiryFromTenor,
  isoDateToDisplay,
  parseIsoDate,
} from './lc-cost.mjs';

const example = {
  lcValue: '100,000',
  tolerance: '10',
  exchangeRate: '120',
  issueDate: '2026-01-01',
  expiryDate: '2026-03-31',
  issueCommissionRate: '0.25',
  marginRate: '10',
  confirmationRate: '0.5',
  swiftCharge: '3000',
  impAndLcAppFee: '1500',
  creditReportCharge: '2500',
  otherCharge: '750',
};

test('calculates every output with additive tolerance and VAT on each charge', () => {
  const result = calculateLcCosts(example);
  assert.equal(result.fcyValueWithTolerance, 110000);
  assert.equal(result.bdtValueWithTolerance, 13200000);
  assert.equal(result.tenor, 90);
  assert.equal(result.additionalDays, 0);
  assert.equal(result.margin, 1320000);
  assert.equal(result.firstQuarterCommission, 33000);
  assert.equal(result.additionalCommission, 0);
  assert.equal(result.commission, 33000);
  assert.equal(result.vatOnCommission, 4950);
  assert.equal(result.swiftCharge, 3000);
  assert.equal(result.vatOnSwift, 450);
  assert.equal(result.impAndLcAppFee, 1500);
  assert.equal(result.confirmationCharge, 66000);
  assert.equal(result.creditReportCharge, 2500);
  assert.equal(result.otherCharge, 750);
  assert.equal(result.total, 1432150);
});

test('adds tolerance to the original LC value', () => {
  const result = calculateLcCosts({ lcValue: '1000', tolerance: '10' });
  assert.equal(result.fcyValueWithTolerance, 1100);
});

test('counts the issue date as day one', () => {
  assert.equal(calculateTenor('2026-01-01', '2026-01-01'), 1);
  assert.equal(calculateTenor('2026-01-01', '2026-01-02'), 2);
  assert.equal(calculateTenor('2026-01-01', '2026-03-31'), 90);
});

test('calculates expiry from inclusive days, including across leap day', () => {
  assert.equal(expiryFromTenor('2026-01-01', 1), '2026-01-01');
  assert.equal(expiryFromTenor('2026-01-01', 90), '2026-03-31');
  assert.equal(expiryFromTenor('2028-02-28', 2), '2028-02-29');
  assert.equal(expiryFromTenor('2026-01-01', 0), '');
});

test('charges the first quarter in full and prorates only days beyond day 90', () => {
  const result = calculateLcCosts({ ...example, expiryDate: '2026-04-01' });
  assert.equal(result.tenor, 91);
  assert.equal(result.additionalDays, 1);
  assert.equal(result.firstQuarterCommission, 33000);
  assert.ok(Math.abs(result.additionalCommission - 33000 / 90) < 1e-8);
  assert.ok(Math.abs(result.commission - (33000 + 33000 / 90)) < 1e-8);
  assert.equal(calculateLcCosts({ ...example, issueDate: '', expiryDate: '' }).commission, 0);
});

test('matches the BDT 137,500 at 0.40% for 100 days example', () => {
  const result = calculateLcCosts({
    lcValue: '137500',
    tolerance: '0',
    exchangeRate: '1',
    issueDate: '2026-01-01',
    expiryDate: '2026-04-10',
    issueCommissionRate: '0.40',
  });
  assert.equal(result.tenor, 100);
  assert.equal(result.additionalDays, 10);
  assert.equal(result.firstQuarterCommission, 550);
  assert.ok(Math.abs(result.additionalCommission - (550 / 90) * 10) < 1e-8);
  assert.ok(Math.abs(result.commission - (550 + (550 / 90) * 10)) < 1e-8);
});

test('flat commission charges only the first quarter for any tenor', () => {
  const input = {
    lcValue: '137500', tolerance: '0', exchangeRate: '1',
    issueDate: '2026-01-01', expiryDate: '2026-04-10',
    issueCommissionRate: '0.40', flatCommission: true,
  };
  const result = calculateLcCosts(input);
  assert.equal(result.additionalDays, 10);
  assert.equal(result.firstQuarterCommission, 550);
  assert.equal(result.additionalCommission, 0);
  assert.equal(result.commission, 550);
  assert.equal(result.vatOnCommission, 82.5);
  assert.equal(calculateLcCosts({ ...input, expiryDate: '2027-01-01' }).commission, 550);
});

test('converts between ISO storage and dd/mm/yyyy display dates', () => {
  assert.equal(isoDateToDisplay('2026-10-29'), '29/10/2026');
  assert.equal(displayDateToIso('29/10/2026'), '2026-10-29');
  assert.equal(displayDateToIso('31/02/2026'), '');
  assert.equal(displayDateToIso('10/29/2026'), '');
});

test('rejects impossible and reversed dates without producing a tenor', () => {
  assert.equal(parseIsoDate('2026-02-30'), null);
  assert.equal(calculateTenor('2026-02-30', '2026-03-31'), 0);
  assert.equal(calculateTenor('2026-04-01', '2026-03-31'), 0);
});

test('does not round intermediate results and treats blank charges as zero', () => {
  const result = calculateLcCosts({
    lcValue: '1234.56', tolerance: '10', exchangeRate: '123.4567',
    issueCommissionRate: '0.125', issueDate: '2026-01-01', expiryDate: '2026-01-01',
  });
  assert.ok(Math.abs(result.bdtValueWithTolerance - 167656.1739072) < 1e-8);
  assert.ok(Math.abs(result.commission - 209.570217384) < 1e-8);
  assert.equal(result.margin, 0);
  assert.equal(result.swiftCharge, 0);
  assert.equal(result.otherCharge, 0);
});
