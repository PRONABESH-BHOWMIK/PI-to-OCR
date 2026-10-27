import ToolFrame from '@/components/ToolFrame';

export const metadata = {
  title: 'Proforma Invoice OCR Extractor',
  description: 'Upload a proforma invoice (PDF or image, English or Bangla) and get a searchable PDF plus copy-ready item lines, beneficiary and PI number.',
  alternates: { canonical: '/tools/proforma-invoice-ocr' },
};

export default function ProformaInvoiceOcrPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="display text-4xl text-ink sm:text-5xl">Proforma invoice OCR</h1>
          <p className="mt-3 max-w-2xl text-lg text-mute">
            Upload a proforma invoice as a PDF or image, in English or Bangla. You get a searchable PDF and the item lines in a fixed format, ready to copy.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <ToolFrame src="/pi-ocr.html" title="Proforma Invoice OCR Extractor" />
        </div>
      </div>
    </>
  );
}
