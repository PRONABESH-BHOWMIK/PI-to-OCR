import ToolsGrid from '@/components/ToolsGrid';

export const metadata = {
  title: 'All Tools',
  description: 'Browse free trade finance tools: proforma invoice OCR today, with OCR, calculators, generators and lookups coming soon.',
  alternates: { canonical: '/tools' },
};

export default function ToolsPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="display text-5xl text-ink sm:text-6xl">All tools</h1>
          <p className="mt-4 max-w-2xl text-lg text-mute">Filter by the kind of work. Live tools open right away, and the rest are listed so you can see what is coming.</p>
        </div>
      </section>
      <ToolsGrid filterable />
    </>
  );
}
