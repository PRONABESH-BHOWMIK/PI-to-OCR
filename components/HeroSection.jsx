import Link from 'next/link';

const facts = ['Free to use', 'No sign-up', 'Automated processing'];

export default function HeroSection() {
  return (
    <section className="bg-marigold">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
        <div>
          <h1 className="display text-5xl text-ink sm:text-6xl lg:text-7xl">Tools for the trade finance desk</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/80">
            Turn a scanned proforma invoice into clean item lines today. Calculators, lookups and document checkers follow, built by a CDCS-certified practitioner.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/tools/proforma-invoice-ocr" className="rounded-md bg-bottle px-6 py-3 text-center font-semibold text-white hover:bg-bottle-dark">
              Open the PI OCR tool
            </Link>
            <Link href="/tools" className="rounded-md border-2 border-ink px-6 py-3 text-center font-semibold text-ink hover:bg-ink hover:text-marigold">
              Browse all tools
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink">
            {facts.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-[8px_8px_0_#0E4D3A] sm:p-6" aria-label="Example of an extracted item line">
          <p className="text-sm font-semibold text-mute">On the proforma invoice</p>
          <div className="mt-3 overflow-hidden rounded-md border border-line text-sm">
            <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 bg-paper px-3 py-2 font-semibold text-mute">
              <span>Description</span><span>Qty</span><span>Unit price</span>
            </div>
            <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-2 px-3 py-2.5 text-ink">
              <span>Cotton woven fabric</span><span>5,000 yds</span><span>USD 1.85</span>
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold text-bottle">What you copy out</p>
          <pre
            className="reveal mt-2 whitespace-pre-wrap rounded-md bg-bottle p-4 font-mono text-[13px] leading-relaxed text-white"
            style={{ animationDelay: '400ms' }}
          >{`1. COTTON WOVEN FABRIC,
QUANTITY : 5000 YDS, UNIT PRICE : USD 1.85/YDS,
H.S. CODE : 5208.39.00.`}</pre>
        </div>
      </div>
    </section>
  );
}
