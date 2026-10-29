import Link from 'next/link';

export const metadata = {
  title: 'Cost Calculator',
  description: 'Trade finance cost calculators, including LC issue margin, commission, VAT and related bank charges in BDT.',
  alternates: { canonical: '/tools/cost-calculator' },
};

export default function CostCalculatorPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <span>Cost Calculator</span>
          </nav>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Trade finance calculators</p>
          <h1 className="display text-5xl text-ink sm:text-6xl">Cost Calculator</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
            Calculate bank charges and trade finance costs from one place. Choose a calculator below to begin.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14" aria-labelledby="available-calculators">
        <h2 id="available-calculators" className="text-xl font-semibold text-ink">Available calculators</h2>
        <Link
          href="/tools/lc-cost-calculator"
          className="mt-5 flex flex-col gap-6 rounded-xl bg-bottle p-6 text-white hover:bg-bottle-dark sm:p-8 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              Live now
            </span>
            <h3 className="display mt-5 text-4xl sm:text-5xl">LC Issue Cost Calculator</h3>
            <p className="mt-3 max-w-xl text-white/80">
              Estimate LC margin, issuance commission, VAT, confirmation and other issue charges in BDT.
            </p>
          </div>
          <span className="w-fit shrink-0 rounded-md bg-marigold px-5 py-2.5 font-semibold text-ink">Open calculator</span>
        </Link>
        <p className="mt-6 text-sm text-mute">More cost calculators will be added here as they become available.</p>
      </section>
    </>
  );
}
