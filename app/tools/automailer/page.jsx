import Link from 'next/link';

export const metadata = {
  title: 'AutoMailer',
  description: 'Trade finance email automation tools, starting with accepted bill payment reminders for desktop Outlook.',
  alternates: { canonical: '/tools/automailer' },
};

// Add future AutoMailer tools to this collection without changing the hub layout.
const autoMailerTools = [
  {
    name: 'Accepted Bill Payment Reminder',
    description: 'Read LC registers, prepare payment reminders by maturity date, and review them before opening or sending through desktop Outlook.',
    href: '/tools/automailer/accepted-bill-payment-reminder',
  },
];

export default function AutoMailerPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <span>AutoMailer</span>
          </nav>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">Email automation</p>
          <h1 className="display text-5xl text-ink sm:text-6xl">AutoMailer</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
            Prepare routine trade finance emails from your working files, review every message, and choose what to send.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14" aria-labelledby="available-mailers">
        <h2 id="available-mailers" className="text-xl font-semibold text-ink">Available AutoMailer tools</h2>
        <div className="mt-5 grid gap-5">
          {autoMailerTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex flex-col gap-6 rounded-xl bg-bottle p-6 text-white hover:bg-bottle-dark sm:p-8 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                  Windows + Outlook
                </span>
                <h3 className="display mt-5 max-w-2xl text-4xl sm:text-5xl">{tool.name}</h3>
                <p className="mt-3 max-w-xl text-white/80">{tool.description}</p>
              </div>
              <span className="w-fit shrink-0 rounded-md bg-marigold px-5 py-2.5 font-semibold text-ink">Setup &amp; launch</span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm text-mute">More AutoMailer tools will be added here as they become available.</p>
      </section>
    </>
  );
}
