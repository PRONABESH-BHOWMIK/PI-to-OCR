"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BB_CURRENCIES, BANGLADESH_BANK_URL } from '@/lib/exchange-rate.mjs';
import {
  calculateLcCosts,
  calculateTenor,
  displayDateToIso,
  expiryFromTenor,
  isoDateToDisplay,
  parseIsoDate,
} from '@/lib/lc-cost.mjs';

const STORAGE_KEY = 'trade-finance-tools:lc-cost-calculator:v1';
const QUICK_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP'];
const QUICK_COMMISSION_RATES = ['0.10', '0.125', '0.20', '0.25', '0.40'];
const NUMERIC_FIELDS = [
  'lcValue', 'tolerance', 'exchangeRate', 'issueCommissionRate', 'marginRate',
  'confirmationRate', 'swiftCharge', 'impAndLcAppFee', 'creditReportCharge', 'otherCharge',
];

const INITIAL_FORM = {
  currency: 'USD',
  customCurrency: '',
  lcValue: '',
  tolerance: '',
  exchangeRate: '',
  issueDate: '',
  tenorDays: '',
  expiryDate: '',
  issueCommissionRate: '',
  flatCommission: false,
  marginRate: '',
  confirmationRate: '',
  swiftCharge: '',
  impAndLcAppFee: '',
  creditReportCharge: '',
  otherCharge: '',
};

const amountFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plainNumberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

function formatAmount(value) {
  return amountFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatPlainNumber(value) {
  return plainNumberFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDate(value) {
  return isoDateToDisplay(value) || '—';
}

function todayIsoDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function numericError(value) {
  if (value === '') return '';
  const parsed = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? '' : 'Enter zero or a positive number.';
}

const inputClass = 'mt-1.5 w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-[15px] font-medium text-ink shadow-sm placeholder:font-normal placeholder:text-mute/60 hover:border-mute focus:border-bottle focus:outline-none focus:ring-2 focus:ring-bottle/10';

function Field({ id, label, suffix, hint, error, className = '', ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${inputClass} ${suffix ? 'pr-16' : ''} ${error ? 'border-red-600' : ''}`}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-mute">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

function DateField({ id, label, value, onChange, error, hint, action }) {
  const [text, setText] = useState(() => isoDateToDisplay(value));
  const [invalid, setInvalid] = useState(false);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) {
      setText(isoDateToDisplay(value));
      setInvalid(false);
    }
  }, [value]);

  function changeText(input) {
    const digits = input.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length <= 2 ? digits : digits.length <= 4
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    const iso = displayDateToIso(formatted);
    setText(formatted);
    setInvalid(digits.length === 8 && !iso);
    onChange(iso);
  }

  function finishEditing() {
    editing.current = false;
    const iso = displayDateToIso(text);
    setInvalid(Boolean(text) && !iso);
    if (iso) {
      setText(isoDateToDisplay(iso));
      if (iso !== value) onChange(iso);
    } else if (text) {
      onChange('');
    }
  }

  const shownError = error || (invalid ? 'Enter a valid date as dd/mm/yyyy.' : '');

  return (
    <div>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        {action}
      </div>
      <div className="relative mt-1.5 rounded-md focus-within:ring-2 focus-within:ring-bottle/10">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          value={text}
          onFocus={() => { editing.current = true; }}
          onChange={(event) => changeText(event.target.value)}
          onBlur={finishEditing}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${inputClass} !mt-0 pr-12 ${shownError ? 'border-red-600' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center border-l border-line text-mute">
          <svg className="pointer-events-none h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
          </svg>
          <input
            id={`${id}-picker`}
            type="date"
            aria-label={`Choose ${label.toLowerCase()} from calendar`}
            value={value}
            onChange={(event) => {
              setText(isoDateToDisplay(event.target.value));
              setInvalid(false);
              onChange(event.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
      {shownError ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{shownError}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionCard({ number, title, description, children }) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <span className="display flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-marigold text-sm text-ink">{number}</span>
        <div>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-mute">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function RefreshIcon({ spinning = false }) {
  return (
    <svg className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5" />
    </svg>
  );
}

function BreakdownRow({ label, detail, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/15 py-3 last:border-b-0">
      <dt>
        <span className={strong ? 'font-semibold text-white' : 'text-sm text-white/85'}>{label}</span>
        {detail && <span className="mt-0.5 block text-xs leading-relaxed text-white/55">{detail}</span>}
      </dt>
      <dd className="shrink-0 text-right text-sm font-semibold tabular-nums text-white">{formatAmount(value)}</dd>
    </div>
  );
}

export default function LcIssueCostCalculator() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [rateMeta, setRateMeta] = useState(null);
  const [rateIsCustom, setRateIsCustom] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState('');
  const [rateRefreshKey, setRateRefreshKey] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const requestId = useRef(0);
  const customRateRef = useRef(false);
  customRateRef.current = rateIsCustom;

  const currency = form.currency === 'CUSTOM' ? form.customCurrency.toUpperCase() : form.currency;
  const currencyLabel = currency || 'FCY';
  const result = useMemo(() => calculateLcCosts(form), [form]);

  const errors = useMemo(() => {
    const next = {};
    NUMERIC_FIELDS.forEach((field) => {
      const error = numericError(form[field]);
      if (error) next[field] = error;
    });
    if (form.tenorDays && (!/^\d+$/.test(form.tenorDays) || Number(form.tenorDays) < 1)) {
      next.tenorDays = 'Enter a whole number of days (minimum 1).';
    }
    const issue = parseIsoDate(form.issueDate);
    const expiry = parseIsoDate(form.expiryDate);
    if (issue && expiry && expiry.timestamp < issue.timestamp) {
      next.expiryDate = 'Expiry date must be on or after the issue date.';
    }
    return next;
  }, [form]);
  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    let saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      setStorageAvailable(false);
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.form && typeof parsed.form === 'object') {
          const restored = { ...INITIAL_FORM, ...parsed.form };
          if (parsed.form.impAndLcAppFee === undefined && parsed.form.impAndOtherCharge !== undefined) {
            restored.impAndLcAppFee = parsed.form.impAndOtherCharge;
          }
          delete restored.dayCount;
          delete restored.impAndOtherCharge;
          const tenor = calculateTenor(restored.issueDate, restored.expiryDate);
          restored.tenorDays = tenor ? String(tenor) : restored.tenorDays || '';
          setForm(restored);
        }
        setRateIsCustom(Boolean(parsed.rateIsCustom));
        setRateMeta(parsed.rateMeta || null);
      } catch {
        // A malformed entry should not prevent the calculator from opening.
        try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* Storage is unavailable. */ }
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, rateIsCustom, rateMeta }));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [form, rateIsCustom, rateMeta, ready]);

  const fetchRate = useCallback(async (signal) => {
    if (!BB_CURRENCIES.includes(currency)) {
      setRateError('No automatic Bangladesh Bank quote is available for this currency. Enter the rate manually.');
      return;
    }

    const id = ++requestId.current;
    setRateLoading(true);
    setRateError('');
    try {
      const response = await fetch(`/api/exchange-rate?currency=${encodeURIComponent(currency)}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The latest rate could not be loaded.');
      if (id !== requestId.current) return;
      setForm((current) => ({ ...current, exchangeRate: String(data.rate) }));
      setRateMeta(data);
      setRateIsCustom(false);
    } catch (error) {
      if (error.name === 'AbortError' || id !== requestId.current) return;
      setRateError('Could not load the Bangladesh Bank rate. Enter it manually or try again.');
    } finally {
      if (id === requestId.current) setRateLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    if (!ready || customRateRef.current) return undefined;
    if (!BB_CURRENCIES.includes(currency)) {
      setRateMeta(null);
      setRateError(currency.length === 3
        ? 'This currency is not in the Bangladesh Bank table. Enter its BDT rate manually.'
        : 'Enter a three-letter currency code and its BDT exchange rate.');
      return undefined;
    }
    const controller = new AbortController();
    fetchRate(controller.signal);
    return () => controller.abort();
  }, [ready, currency, fetchRate, rateRefreshKey]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateIssueDate(value) {
    setForm((current) => {
      const next = { ...current, issueDate: value };
      const days = Number(current.tenorDays);
      if (value && Number.isInteger(days) && days > 0) {
        next.expiryDate = expiryFromTenor(value, days);
      } else if (value && current.expiryDate) {
        const tenor = calculateTenor(value, current.expiryDate);
        next.tenorDays = tenor ? String(tenor) : '';
      }
      return next;
    });
  }

  function updateExpiryDate(value) {
    setForm((current) => {
      const tenor = value && current.issueDate ? calculateTenor(current.issueDate, value) : 0;
      return { ...current, expiryDate: value, tenorDays: tenor ? String(tenor) : '' };
    });
  }

  function updateTenorDays(value) {
    const days = value.replace(/\D/g, '').slice(0, 5);
    setForm((current) => ({
      ...current,
      tenorDays: days,
      expiryDate: current.issueDate && days ? expiryFromTenor(current.issueDate, Number(days)) : '',
    }));
  }

  function updateExchangeRate(value) {
    // A manual edit must not be overwritten by an older in-flight lookup.
    requestId.current += 1;
    setRateLoading(false);
    updateField('exchangeRate', value);
    setRateIsCustom(true);
    setRateError('');
  }

  function selectCurrency(value) {
    if (value === form.currency) return;
    requestId.current += 1;
    setRateLoading(false);
    setRateMeta(null);
    setRateError('');
    setRateIsCustom(false);
    setForm((current) => ({ ...current, currency: value, exchangeRate: '' }));
  }

  function updateCustomCurrency(value) {
    const code = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    requestId.current += 1;
    setRateLoading(false);
    setRateMeta(null);
    setRateError('');
    setRateIsCustom(false);
    setForm((current) => ({ ...current, customCurrency: code, exchangeRate: '' }));
  }

  function clearCalculator() {
    if (!window.confirm('Clear all LC issue cost calculator entries saved on this device?')) return;
    requestId.current += 1;
    setForm(INITIAL_FORM);
    setRateMeta(null);
    setRateIsCustom(false);
    setRateError('');
    setRateLoading(false);
    setRateRefreshKey((key) => key + 1);
    setCopyStatus('');
  }

  async function copySummary() {
    const lines = [
      'LC ISSUE COST ESTIMATE',
      `Currency: ${currencyLabel}`,
      `LC value: ${currencyLabel} ${formatAmount(result.lcValue)}`,
      `Tolerance: ${formatPlainNumber(result.tolerancePercent)}%`,
      `LC value with tolerance: ${currencyLabel} ${formatAmount(result.fcyValueWithTolerance)}`,
      `Exchange rate: 1 ${currencyLabel} = ${formatPlainNumber(result.exchangeRate)} BDT${rateIsCustom ? ' (custom)' : rateMeta?.effectiveDate ? ` (Bangladesh Bank ask, ${formatDate(rateMeta.effectiveDate)})` : ''}`,
      `BDT value with tolerance: BDT ${formatAmount(result.bdtValueWithTolerance)}`,
      `Issue date: ${formatDate(form.issueDate)}`,
      `Expiry date: ${formatDate(form.expiryDate)}`,
      'Tenor basis: Actual elapsed days; issue date inclusive',
      `Tenor: ${result.tenor || 0} days`,
      `Commission basis: ${result.flatCommission ? 'Flat commission — first quarter only' : 'First quarter + (first-quarter commission ÷ 90 × extra days)'}`,
      `Days beyond first quarter: ${result.additionalDays}`,
      '',
      `Margin: BDT ${formatAmount(result.margin)}`,
      `Issuance commission: BDT ${formatAmount(result.commission)}`,
      `VAT on commission: BDT ${formatAmount(result.vatOnCommission)}`,
      `SWIFT charge: BDT ${formatAmount(result.swiftCharge)}`,
      `VAT on SWIFT charge: BDT ${formatAmount(result.vatOnSwift)}`,
      `IMP and LC application fee: BDT ${formatAmount(result.impAndLcAppFee)}`,
      `Confirmation charge: BDT ${formatAmount(result.confirmationCharge)}`,
      `Credit report charge: BDT ${formatAmount(result.creditReportCharge)}`,
      `Other charge: BDT ${formatAmount(result.otherCharge)}`,
      `TOTAL: BDT ${formatAmount(result.total)}`,
      '',
      'Indicative estimate only. Confirm rates and charges with the issuing bank.',
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopyStatus('Summary copied');
    window.setTimeout(() => setCopyStatus(''), 2500);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <details className="no-print group mb-6 rounded-lg border border-marigold/70 bg-[#FFFBEB] open:shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm text-ink marker:hidden">
          <svg className="h-5 w-5 shrink-0 text-bottle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" />
          </svg>
          <span><strong>Calculation notes:</strong> review the tolerance, commission and VAT formulas used in this estimate.</span>
          <svg className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
        </summary>
        <div className="grid gap-3 border-t border-marigold/40 px-4 py-4 text-sm leading-relaxed text-ink/80 sm:grid-cols-2 sm:px-5">
          <p><strong className="text-ink">Tolerance:</strong> LC value + (LC value × tolerance %).</p>
          <p><strong className="text-ink">Commission VAT:</strong> 15% × issuance commission.</p>
          <p><strong className="text-ink">Issuance commission:</strong> full rate for the first 90 days, then first-quarter commission ÷ 90 × extra days. Flat commission ignores extra days.</p>
          <p><strong className="text-ink">Total:</strong> margin and every output charge are included.</p>
        </div>
      </details>

      <div className="calculator-layout grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
        <div className="no-print min-w-0 space-y-5">
          <SectionCard number="01" title="LC value & conversion" description="Enter the invoice currency and convert the tolerance-adjusted value to BDT.">
            <div className="mb-5">
              <span className="text-sm font-semibold text-ink">LC currency</span>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested LC currencies">
                {QUICK_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={form.currency === code}
                    onClick={() => selectCurrency(code)}
                    className={`min-w-14 rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${form.currency === code ? 'border-bottle bg-bottle text-white' : 'border-line bg-white text-ink hover:border-bottle hover:bg-paper'}`}
                  >
                    {code}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={form.currency === 'CUSTOM'}
                  onClick={() => selectCurrency('CUSTOM')}
                  className={`rounded-md border px-3.5 py-2 text-sm font-semibold ${form.currency === 'CUSTOM' ? 'border-bottle bg-bottle text-white' : 'border-line bg-white text-ink hover:border-bottle hover:bg-paper'}`}
                >
                  Other
                </button>
              </div>
              {form.currency === 'CUSTOM' && (
                <div className="mt-3 max-w-44">
                  <label htmlFor="custom-currency" className="sr-only">Three-letter currency code</label>
                  <input
                    id="custom-currency"
                    value={form.customCurrency}
                    onChange={(event) => updateCustomCurrency(event.target.value)}
                    placeholder="e.g. CNY"
                    autoComplete="off"
                    className={`${inputClass} uppercase`}
                    maxLength={3}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="lc-value" label="LC value" suffix={currencyLabel} placeholder="0.00" value={form.lcValue} onChange={(event) => updateField('lcValue', event.target.value)} error={errors.lcValue} />
              <Field id="tolerance" label="Tolerance" suffix="%" placeholder="e.g. 10" value={form.tolerance} onChange={(event) => updateField('tolerance', event.target.value)} error={errors.tolerance} hint="Added to the original LC value." />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="exchange-rate" className="text-sm font-semibold text-ink">Exchange rate to BDT</label>
                <button
                  type="button"
                  onClick={() => fetchRate()}
                  disabled={rateLoading || !BB_CURRENCIES.includes(currency)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-bottle hover:underline disabled:cursor-not-allowed disabled:text-mute disabled:no-underline"
                >
                  <RefreshIcon spinning={rateLoading} />
                  {rateLoading ? 'Fetching rate' : 'Refresh BB rate'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="exchange-rate"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.0000"
                  value={form.exchangeRate}
                  onChange={(event) => updateExchangeRate(event.target.value)}
                  aria-invalid={Boolean(errors.exchangeRate)}
                  className={`${inputClass} pr-32 ${errors.exchangeRate ? 'border-red-600' : ''}`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-mute">BDT / {currencyLabel}</span>
              </div>
              <div className="mt-1.5 min-h-8 text-xs leading-relaxed" aria-live="polite">
                {errors.exchangeRate ? <p className="text-red-700">{errors.exchangeRate}</p> : rateError ? (
                  <p className="text-red-700">{rateError} <a href={BANGLADESH_BANK_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-bottle underline">Open source</a></p>
                ) : rateLoading ? (
                  <p className="text-mute">Looking for the latest published ask rate…</p>
                ) : (
                  <p className="text-mute">
                    {rateIsCustom && form.exchangeRate ? <span className="font-semibold text-bottle">Custom rate in use. </span> : null}
                    {rateMeta ? (
                      <>Bangladesh Bank {rateMeta.rateType} rate{rateMeta.effectiveDate ? ` · effective ${formatDate(rateMeta.effectiveDate)}` : ''}. <a href={rateMeta.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-bottle underline">View source</a></>
                    ) : 'You can edit the auto-filled rate to match your bank.'}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              <div className="bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">LC value with tolerance</p>
                <p className="mt-1.5 break-words text-lg font-bold tabular-nums text-ink"><span className="mr-1 text-xs font-semibold text-mute">{currencyLabel}</span>{formatAmount(result.fcyValueWithTolerance)}</p>
              </div>
              <div className="bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-mute">Total LC value in BDT</p>
                <p className="mt-1.5 break-words text-lg font-bold tabular-nums text-bottle"><span className="mr-1 text-xs font-semibold text-mute">BDT</span>{formatAmount(result.bdtValueWithTolerance)}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard number="02" title="Tenor & bank rates" description="The issue date counts as day one; commission is prorated daily after the first 90 days.">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <DateField
                id="issue-date"
                label="LC issue date"
                value={form.issueDate}
                onChange={updateIssueDate}
                action={<button type="button" onClick={() => updateIssueDate(todayIsoDate())} className="rounded px-1.5 py-0.5 text-xs font-semibold text-bottle hover:bg-paper hover:underline">Today</button>}
              />
              <Field
                id="tenor-days"
                label="Days"
                suffix="days"
                placeholder="e.g. 90"
                inputMode="numeric"
                value={form.tenorDays}
                onChange={(event) => updateTenorDays(event.target.value)}
                error={errors.tenorDays}
                hint="Issue date inclusive."
              />
              <DateField
                id="expiry-date"
                label="LC expiry date"
                value={form.expiryDate}
                onChange={updateExpiryDate}
                error={errors.expiryDate}
                hint="Auto-filled from days; also editable."
              />
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-lg bg-bottle px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-white/65">Tenor <span className="text-white/50">(issue date inclusive)</span></p>
                <p className="mt-0.5 text-xl font-bold tabular-nums">{result.tenor || '—'} <span className="text-sm font-medium text-white/70">days</span></p>
                <p className="mt-1 text-[11px] text-white/55">{result.flatCommission ? 'Flat commission selected: only the first quarter is charged.' : 'Extra-day commission = first-quarter commission ÷ 90 × extra days.'}</p>
              </div>
              <span className="w-fit shrink-0 rounded-full bg-marigold px-3 py-1.5 text-center text-xs font-bold text-ink">{result.additionalDays} {result.additionalDays === 1 ? 'day' : 'days'}<span className="block text-[10px] font-medium">{result.flatCommission ? 'not charged' : 'beyond first quarter'}</span></span>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <Field id="issue-commission-rate" label="LC issue commission" suffix="% / Q1" placeholder="0.00" value={form.issueCommissionRate} onChange={(event) => updateField('issueCommissionRate', event.target.value)} error={errors.issueCommissionRate} hint="Daily proration after day 90." />
              <Field id="margin-rate" label="Margin rate" suffix="%" placeholder="0.00" value={form.marginRate} onChange={(event) => updateField('marginRate', event.target.value)} error={errors.marginRate} />
              <Field id="confirmation-rate" label="Confirmation rate" suffix="%" placeholder="0.00" value={form.confirmationRate} onChange={(event) => updateField('confirmationRate', event.target.value)} error={errors.confirmationRate} />
            </div>
            <label className="mt-4 inline-flex w-fit cursor-pointer items-center gap-2.5 rounded-md border border-line bg-paper px-3 py-2 text-xs font-bold text-ink hover:border-bottle">
              <input
                type="checkbox"
                checked={form.flatCommission}
                onChange={(event) => updateField('flatCommission', event.target.checked)}
                className="h-4 w-4 accent-[#0E4D3A]"
              />
              <span>FLAT COMMISSION</span>
              <span className="text-[11px] font-normal text-mute">First quarter only</span>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-mute">Quick commission rates</span>
              {QUICK_COMMISSION_RATES.map((rate) => (
                <button key={rate} type="button" onClick={() => updateField('issueCommissionRate', rate)} aria-pressed={form.issueCommissionRate === rate} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${form.issueCommissionRate === rate ? 'border-bottle bg-bottle text-white' : 'border-line bg-paper text-bottle hover:border-bottle'}`}>{rate}%</button>
              ))}
              <span className="w-full text-[11px] text-mute">Shortcuts only—use the rate in your bank’s tariff.</span>
            </div>
          </SectionCard>

          <SectionCard number="03" title="Other charges" description="Enter fixed charges in BDT. Leave any inapplicable charge blank or zero.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="swift-charge" label="SWIFT charge" suffix="BDT" placeholder="0.00" value={form.swiftCharge} onChange={(event) => updateField('swiftCharge', event.target.value)} error={errors.swiftCharge} hint={!errors.swiftCharge ? `15% VAT: BDT ${formatAmount(result.vatOnSwift)}` : ''} />
              <Field id="imp-lc-app-fee" label="IMP & LC app fee" suffix="BDT" placeholder="0.00" value={form.impAndLcAppFee} onChange={(event) => updateField('impAndLcAppFee', event.target.value)} error={errors.impAndLcAppFee} />
              <Field id="credit-report-charge" label="Credit report charge" suffix="BDT" placeholder="0.00" value={form.creditReportCharge} onChange={(event) => updateField('creditReportCharge', event.target.value)} error={errors.creditReportCharge} />
              <Field id="other-charge" label="Other charge" suffix="BDT" placeholder="0.00" value={form.otherCharge} onChange={(event) => updateField('otherCharge', event.target.value)} error={errors.otherCharge} />
            </div>
          </SectionCard>

          <div className="flex flex-col-reverse gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={clearCalculator} className="w-fit rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-mute hover:border-red-300 hover:text-red-700">Clear calculator</button>
            <p className={`flex items-center gap-1.5 text-xs ${storageAvailable ? 'text-mute' : 'text-red-700'}`} role="status">
              {storageAvailable ? <CheckIcon /> : null}
              {!ready ? 'Restoring saved entries…' : storageAvailable ? 'Entries save automatically on this device' : 'Local saving is unavailable in this browser'}
            </p>
          </div>
        </div>

        <aside className="print-summary min-w-0 lg:sticky lg:top-24" aria-label="LC issue cost estimate">
          <section className="overflow-hidden rounded-xl bg-bottle text-white shadow-[7px_7px_0_#D9E0DC]">
            <div className="p-6 pb-4 sm:p-7 sm:pb-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-marigold">Estimated total</p>
                <span className="no-print inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-marigold" />Live estimate</span>
              </div>
              {hasErrors ? (
                <p className="mt-5 text-2xl font-bold text-white">Check highlighted inputs</p>
              ) : (
                <p className="mt-3 break-words text-[clamp(1.8rem,4vw,2.55rem)] font-bold leading-tight tabular-nums"><span className="mr-2 text-base font-medium text-white/60">BDT</span>{formatAmount(result.total)}</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-white/60">Includes margin, VAT and every charge listed below.</p>

              <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-white/15 bg-white/5 p-3 text-center">
                <div className="border-r border-white/15 pr-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Currency</p>
                  <p className="mt-1 truncate text-sm font-bold">{currencyLabel}</p>
                </div>
                <div className="border-r border-white/15 px-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Tenor</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{result.tenor || 0} days</p>
                </div>
                <div className="pl-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Beyond Q1</p>
                  <p className="mt-1 text-sm font-bold tabular-nums">{result.additionalDays} days</p>
                </div>
              </div>
            </div>

            <dl className="px-6 pb-3 sm:px-7">
              <BreakdownRow label="Margin" detail={`${formatPlainNumber(result.marginRate)}% of BDT LC value`} value={result.margin} />
              <BreakdownRow
                label="Issuance commission"
                detail={result.tenor
                  ? result.flatCommission
                    ? `Flat commission: first quarter only; ${result.additionalDays} extra days not charged`
                    : `First quarter: BDT ${formatAmount(result.firstQuarterCommission)}; ${result.additionalDays} extra days: BDT ${formatAmount(result.additionalCommission)}`
                  : 'Add valid dates to calculate commission'}
                value={result.commission}
              />
              <BreakdownRow label="VAT on commission" detail="15% of issuance commission" value={result.vatOnCommission} />
              <BreakdownRow label="SWIFT charge" value={result.swiftCharge} />
              <BreakdownRow label="VAT on SWIFT charge" detail="15% of SWIFT charge" value={result.vatOnSwift} />
              <BreakdownRow label="IMP & LC app fee" value={result.impAndLcAppFee} />
              <BreakdownRow label="Confirmation charge" detail={`${formatPlainNumber(result.confirmationRate)}% of BDT LC value`} value={result.confirmationCharge} />
              <BreakdownRow label="Credit report charge" value={result.creditReportCharge} />
              <BreakdownRow label="Other charge" value={result.otherCharge} />
            </dl>

            <div className="no-print border-t border-white/20 p-5 sm:px-7">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={copySummary} className="rounded-md bg-marigold px-3 py-2.5 text-sm font-bold text-ink hover:bg-white">Copy summary</button>
                <button type="button" onClick={() => window.print()} className="rounded-md border border-white/40 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/10">Print / PDF</button>
              </div>
              <p className="mt-2 min-h-4 text-center text-xs text-marigold" role="status">{copyStatus}</p>
            </div>
          </section>

          <div className="no-print mt-5 flex gap-3 rounded-lg border border-line bg-white p-4 text-xs leading-relaxed text-mute">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-bottle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 7.8 7.5 9.5 4.3-1.7 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p><strong className="block text-ink">Private by design</strong>Only the selected currency is requested for the BB rate. Your LC values and charges stay in this browser.</p>
          </div>
          <p className="mt-4 px-1 text-xs leading-relaxed text-mute">Indicative estimate only. Confirm exchange rates, commissions, VAT and fixed charges with your issuing bank.</p>
        </aside>
      </div>
    </div>
  );
}
