import Link from 'next/link';
import LcIssueCostCalculator from '@/components/LcIssueCostCalculator';

export const metadata = {
  title: 'LC Issue Cost Calculator',
  description: 'Estimate LC margin, issuance commission, VAT, confirmation and other charges in BDT with a full first-quarter rate and daily proration thereafter.',
  alternates: { canonical: '/tools/lc-cost-calculator' },
};

const features = ['No sign-up', 'Saved on this device', 'Live cost breakdown'];

export default function LcIssueCostCalculatorPage() {
  return (
    <div className="lc-cost-page">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <Link href="/tools/cost-calculator" className="font-medium hover:text-bottle hover:underline">Cost Calculator</Link>
          </nav>
          <div className="flex items-center justify-between gap-8">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">LC issuance · Bangladesh</p>
              <h1 className="display text-5xl text-ink sm:text-6xl">LC Issue Cost Calculator</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
                Estimate margin, issuance commission, VAT and other LC charges in BDT. Enter the terms once and see the full cost as you type.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-bottle" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4 10.5 4 4 8-9" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="no-print hidden h-32 w-32 shrink-0 rotate-3 items-center justify-center rounded-xl bg-marigold shadow-[8px_8px_0_#0E4D3A] lg:flex" aria-hidden="true">
              <svg className="h-16 w-16 text-ink" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="12" y="6" width="40" height="52" rx="5" />
                <rect x="19" y="13" width="26" height="11" rx="2" />
                <path d="M20 33h4M30 33h4M40 33h4M20 42h4M30 42h4M40 42h4M20 51h4M30 51h4M40 51h4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <LcIssueCostCalculator />
    </div>
  );
}
