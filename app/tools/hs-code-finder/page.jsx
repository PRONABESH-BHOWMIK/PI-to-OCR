'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { parseHsCodes } from '@/lib/hs-code-parse';

const DATA_FILE = '/data/hs-code-tax-2026-27.js';

// One continuous strip on the second line: label above, value below.
const DETAIL_COLUMNS = [
  { key: 'unit', label: 'Statistical Unit' },
  { key: 'cd', label: 'CD' },
  { key: 'sd', label: 'SD' },
  { key: 'vat', label: 'VAT' },
  { key: 'ait', label: 'AIT' },
  { key: 'rd', label: 'RD' },
  { key: 'at', label: 'AT' },
  { key: 'total', label: 'Total Tax Incidence (%)' },
];

const show = (value) => (value === '' || value == null ? '—' : value);

export default function HsCodeFinderPage() {
  const [data, setData] = useState(null);
  const [input, setInput] = useState('');

  // The tariff data is a static browser script; wait for it to be on window.
  useEffect(() => {
    const load = () => {
      if (typeof window !== 'undefined' && window.HS_CODE_TAX_2026_27) {
        setData(window.HS_CODE_TAX_2026_27);
        return;
      }
      const timer = setTimeout(load, 50);
      return () => clearTimeout(timer);
    };
    load();
  }, []);

  const codes = useMemo(() => parseHsCodes(input), [input]);

  const { found, missing } = useMemo(() => {
    if (!data) return { found: [], missing: [] };
    const found = [];
    const missing = [];
    for (const code of codes) {
      const row = data[code];
      if (row) found.push({ code, row });
      else missing.push(code);
    }
    return { found, missing };
  }, [data, codes]);

  return (
    <>
      <Script src={DATA_FILE} strategy="afterInteractive" />

      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <span>Lookup</span>
          </nav>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Lookup · 2026-27 tariff year</p>
          <h1 className="display text-5xl text-ink sm:text-6xl">HS Code Finder</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
            Look up any HS code and see its details exactly as published for the 2026-27 tariff year: description,
            statistical unit and every tax component.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            HS code{codes.length > 1 ? 's' : ''}
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 52083900 or 5208.39.00 — several codes separated by commas"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-3 text-lg text-ink outline-none focus:border-bottle focus:ring-2 focus:ring-bottle/30"
          />
        </label>
        <p className="mt-2 text-sm text-mute">
          Codes can be typed with or without dots — <span className="font-medium text-ink">52083900</span> and{' '}
          <span className="font-medium text-ink">5208.39.00</span> give the same result.
        </p>

        <div className="mt-8">
          {!data ? (
            <p className="text-mute">Loading the 2026-27 tariff data…</p>
          ) : input.trim() === '' ? (
            <p className="text-mute">
              Enter one or more 8-digit HS codes to see the published details.
            </p>
          ) : codes.length === 0 ? (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              No valid HS codes found in your input. Enter 8-digit codes (with or without dots), separated by commas.
            </p>
          ) : (
            <>
              {found.length > 0 && (
                <ul className="space-y-5">
                  {found.map(({ code, row }) => (
                    <li key={code} className="rounded-xl border border-line bg-white p-6">
                      {/* Line 1: HS code, chapter and description on one continuous line */}
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="display rounded-md bg-bottle px-3 py-1.5 font-bold text-white">
                          {code}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Chapter {code.slice(0, 2)}
                        </span>
                        <span className="font-semibold text-ink">{row.description}</span>
                      </div>

                      {/* Line 2: one continuous strip of all tax components */}
                      <div className="mt-4 flex flex-wrap border-y border-line">
                        {DETAIL_COLUMNS.map((column, index) => (
                          <div
                            key={column.key}
                            className={`flex-1 min-w-[72px] border-r border-line px-3 py-2.5 text-center last:border-r-0 ${
                              column.key === 'total' ? 'bg-marigold' : ''
                            }`}
                          >
                            <span
                              className={`block text-[10px] font-bold uppercase tracking-wider ${
                                column.key === 'total' ? 'text-bottle-dark' : 'text-mute'
                              }`}
                            >
                              {column.label}
                            </span>
                            <span
                              className={`mt-1 block text-base font-bold tabular-nums ${
                                column.key === 'total' ? 'text-bottle-dark' : 'text-ink'
                              }`}
                            >
                              {show(row[column.key])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {missing.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
                  <h2 className="text-lg font-semibold text-amber-900">
                    {missing.length} code{missing.length === 1 ? '' : 's'} not found
                  </h2>
                  <p className="mt-1 text-sm text-amber-800">
                    These codes are not in the 2026-27 table. Check the code and try again:
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {missing.map((code) => (
                      <li
                        key={code}
                        className="rounded-full border border-amber-300 bg-white px-3 py-1 font-mono text-sm text-amber-900"
                      >
                        {code}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-sm text-mute">
                {found.length} matched, {missing.length} not found — showing the details exactly as published in the
                2026-27 HS code table.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
