import Link from 'next/link';
import ToolFrame from '@/components/ToolFrame';

export const metadata = {
  title: 'Proforma Invoice OCR Extractor',
  description: 'Upload a proforma invoice (PDF or image, English or Bangla) and get a searchable PDF plus copy-ready item lines, beneficiary and PI number.',
  alternates: { canonical: '/tools/proforma-invoice-ocr' },
};

const features = ['Browser-based OCR', 'No sign-up', 'Searchable PDF'];

export default function ProformaInvoiceOcrPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <span>Document processing</span>
          </nav>
          <div className="flex items-center justify-between gap-8">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Document processing · English + Bangla</p>
              <h1 className="display text-5xl text-ink sm:text-6xl">Proforma Invoice OCR</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
                Turn a scanned proforma invoice into a searchable PDF and clean, copy-ready item lines—without installing anything.
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
              <svg className="h-16 w-16 text-ink" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 8h26l12 12v48H22z" /><path d="M48 8v14h12M31 35h20M31 44h20M31 53h13" />
                <circle cx="55" cy="55" r="12" fill="#F2B705" /><path d="m64 65 8 8" />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-xl">
          <ToolFrame src="/pi-ocr.html" title="Proforma Invoice OCR Extractor" />
        </div>
      </div>
    </>
  );
}
