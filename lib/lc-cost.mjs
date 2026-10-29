export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string' || value.trim() === '') return 0;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function nonNegative(value) {
  return Math.max(0, toNumber(value));
}

export function parseIsoDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return { year, month, day, timestamp };
}

export function displayDateToIso(value) {
  if (typeof value !== 'string') return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return parseIsoDate(iso) ? iso : '';
}

export function isoDateToDisplay(value) {
  const date = parseIsoDate(value);
  if (!date) return '';
  return `${String(date.day).padStart(2, '0')}/${String(date.month).padStart(2, '0')}/${date.year}`;
}

export function calculateTenor(issueDate, expiryDate) {
  const issue = parseIsoDate(issueDate);
  const expiry = parseIsoDate(expiryDate);
  if (!issue || !expiry || expiry.timestamp < issue.timestamp) return 0;
  return Math.floor((expiry.timestamp - issue.timestamp) / 86400000) + 1;
}

export function expiryFromTenor(issueDate, tenorDays) {
  const issue = parseIsoDate(issueDate);
  const days = Number(tenorDays);
  if (!issue || !Number.isInteger(days) || days < 1) return '';
  const expiry = new Date(issue.timestamp + (days - 1) * 86400000);
  if (!Number.isFinite(expiry.getTime())) return '';
  const iso = expiry.toISOString().slice(0, 10);
  return parseIsoDate(iso) ? iso : '';
}

export function calculateLcCosts(input) {
  const lcValue = nonNegative(input.lcValue);
  const tolerancePercent = nonNegative(input.tolerance);
  const exchangeRate = nonNegative(input.exchangeRate);

  const fcyValueWithTolerance = lcValue + lcValue * (tolerancePercent / 100);
  const bdtValueWithTolerance = fcyValueWithTolerance * exchangeRate;

  const tenor = calculateTenor(input.issueDate, input.expiryDate);
  const additionalDays = Math.max(0, tenor - 90);
  const issueCommissionRate = nonNegative(input.issueCommissionRate);
  const marginRate = nonNegative(input.marginRate);
  const confirmationRate = nonNegative(input.confirmationRate);

  const margin = bdtValueWithTolerance * (marginRate / 100);
  const quarterlyCommissionBase = bdtValueWithTolerance * (issueCommissionRate / 100);
  const firstQuarterCommission = tenor > 0 ? quarterlyCommissionBase : 0;
  const additionalCommission = tenor > 0 && !input.flatCommission
    ? (firstQuarterCommission / 90) * additionalDays
    : 0;
  const commission = firstQuarterCommission + additionalCommission;
  const vatOnCommission = commission * 0.15;

  const swiftCharge = nonNegative(input.swiftCharge);
  const vatOnSwift = swiftCharge * 0.15;
  const impAndLcAppFee = nonNegative(input.impAndLcAppFee);
  const confirmationCharge = bdtValueWithTolerance * (confirmationRate / 100);
  const creditReportCharge = nonNegative(input.creditReportCharge);
  const otherCharge = nonNegative(input.otherCharge);

  const total = margin + commission + vatOnCommission + swiftCharge + vatOnSwift +
    impAndLcAppFee + confirmationCharge + creditReportCharge + otherCharge;

  return {
    lcValue,
    tolerancePercent,
    exchangeRate,
    fcyValueWithTolerance,
    bdtValueWithTolerance,
    tenor,
    additionalDays,
    firstQuarterCommission,
    additionalCommission,
    flatCommission: Boolean(input.flatCommission),
    issueCommissionRate,
    marginRate,
    confirmationRate,
    margin,
    commission,
    vatOnCommission,
    swiftCharge,
    vatOnSwift,
    impAndLcAppFee,
    confirmationCharge,
    creditReportCharge,
    otherCharge,
    total,
  };
}
