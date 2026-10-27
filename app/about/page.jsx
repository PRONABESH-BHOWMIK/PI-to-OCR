import Link from 'next/link';

export const metadata = {
  title: 'About',
  description: 'Why we build free, professional-grade tools for trade finance professionals.',
  alternates: { canonical: '/about' },
};

const principles = [
  { title: 'Mission', text: 'Democratize trade finance tools for professionals worldwide.' },
  { title: 'Vision', text: 'A world where trade finance operations are seamless and efficient.' },
  { title: 'Values', text: 'Simplicity, accuracy, and accessibility in every tool we build.' },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <h1 className="display max-w-3xl text-5xl text-ink sm:text-6xl lg:text-7xl">Making trade finance accessible</h1>
          <p className="mt-6 max-w-2xl text-xl text-mute">We build free, professional-grade tools to help trade finance professionals work smarter and faster.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-20">
        <dl>
          {principles.map((p) => (
            <div key={p.title} className="border-t border-line py-5 first:border-t-0 first:pt-0">
              <dt className="text-lg font-semibold text-ink">{p.title}</dt>
              <dd className="mt-1 text-mute">{p.text}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h2 className="display text-3xl text-ink sm:text-4xl">Our story</h2>
          <div className="mt-5 max-w-prose space-y-4 text-lg leading-relaxed text-ink/80">
            <p>
              Trade Finance Tools was born from a simple frustration: professionals in trade finance lack access to modern, easy-to-use tools for their daily operations. From processing proforma invoices to generating letters of credit, the workflow is still heavily manual and error-prone.
            </p>
            <p>
              We are building a comprehensive suite of free tools that automate the repetitive parts of the job. Our first tool, the Proforma Invoice OCR Extractor, is just the beginning. We plan to add calculators, generators, validators, and more, all designed specifically for the trade finance industry.
            </p>
          </div>

          <div className="mt-10 rounded-xl bg-bottle p-6 text-white sm:p-8">
            <h3 className="display text-3xl">Built by Pronabesh Bhowmik, CDCS</h3>
            <p className="mt-3 max-w-md text-white/80">A trade finance professional building the tools he wanted on his own desk.</p>
            <Link href="/contact" className="mt-6 inline-block rounded-md bg-marigold px-5 py-2.5 font-semibold text-ink hover:bg-white">
              Get in touch
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
