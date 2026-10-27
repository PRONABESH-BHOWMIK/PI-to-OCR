"use client";
import { useState } from 'react';
import Link from 'next/link';

// To add a tool, add one object to this array. status: 'live' (needs an href) or 'coming'.
const tools = [
  { name: 'Proforma Invoice OCR', description: 'Read proforma invoices in English or Bangla into a searchable PDF and copy-ready item lines.', category: 'Document processing', status: 'live', href: '/tools/proforma-invoice-ocr' },
  { name: 'Insurance OCR', description: 'Pull the key fields out of insurance certificates and policies.', category: 'Document processing', status: 'coming' },
  { name: 'Credit report analysis', description: 'Summarize credit reports and flag the points a reviewer should check.', category: 'Document processing', status: 'coming' },
  { name: 'Bill of Lading Checker', description: 'Check bills of lading for discrepancies before presentation.', category: 'Document processing', status: 'coming' },
  { name: 'LC Draft Generator', description: 'Draft Letter of Credit text with proper SWIFT formatting.', category: 'Generators', status: 'coming' },
  { name: 'AutoMailer', description: 'Send routine trade finance emails from saved templates.', category: 'Automation', status: 'coming' },
  { name: 'PII entry helper', description: 'Speed up entering customer identity details from source documents.', category: 'Automation', status: 'coming' },
  { name: 'HS Code Finder', description: 'Find the right HS code for a product.', category: 'Lookup', status: 'coming' },
  { name: 'Bank SWIFT/BIC Code Finder', description: "Look up a bank's SWIFT/BIC code by name, city or country.", category: 'Lookup', status: 'coming' },
  { name: 'INCOTERMS Calculator', description: 'Work out costs and responsibilities under INCOTERMS 2020.', category: 'Calculators', status: 'coming' },
  { name: 'LC Cost Calculator', description: 'Estimate LC charges, bank fees, and total trade finance costs.', category: 'Calculators', status: 'coming' },
  { name: 'CDCS Mock Test', description: 'Practice CDCS exam-style questions with scoring and explanations.', category: 'Learning', status: 'coming' },
];

export default function ToolsGrid({ filterable = false }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(tools.map((t) => t.category))];
  const shown = tools.filter((t) => category === 'All' || t.category === category);
  const live = shown.filter((t) => t.status === 'live');
  const coming = shown.filter((t) => t.status !== 'live');

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
      {!filterable && (
        <div className="mb-10 max-w-2xl">
          <h2 className="display text-4xl text-ink sm:text-5xl">Tools</h2>
          <p className="mt-3 text-lg text-mute">One tool is live. The rest are being built, and this list grows as each one ships.</p>
        </div>
      )}

      {filterable && (
        <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium ${
                category === c ? 'border-bottle bg-bottle text-white' : 'border-line bg-white text-ink hover:border-bottle'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {live.length > 0 && (
        <div className="grid gap-4">
          {live.map((t) => (
            <Link
              key={t.name}
              href={t.href}
              className="flex flex-col gap-6 rounded-xl bg-bottle p-6 text-white hover:bg-bottle-dark sm:p-8 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                  Live now
                </span>
                <h3 className="display mt-5 text-4xl sm:text-5xl">{t.name}</h3>
                <p className="mt-3 max-w-xl text-white/80">{t.description}</p>
              </div>
              <span className="w-fit shrink-0 rounded-md bg-marigold px-5 py-2.5 font-semibold text-ink">Open tool</span>
            </Link>
          ))}
        </div>
      )}

      {coming.length > 0 && (
        <div className={live.length > 0 ? 'mt-12' : ''}>
          <h3 className="text-xl font-semibold text-ink">Coming next</h3>
          <ul className="mt-3 grid gap-x-12 border-t border-line md:grid-cols-2">
            {coming.map((t) => (
              <li key={t.name} className="flex items-start justify-between gap-4 border-b border-line py-4">
                <div>
                  <h4 className="font-semibold text-ink">{t.name}</h4>
                  <p className="text-sm text-mute">{t.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs text-mute ring-1 ring-line">{t.category}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
