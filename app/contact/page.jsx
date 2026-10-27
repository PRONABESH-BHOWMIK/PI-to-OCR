import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Ask a question, report a bug or request a new trade finance tool.',
  alternates: { canonical: '/contact' },
};

const ways = [
  { label: 'Phone', value: '+880 1614244131', href: 'tel:+8801614244131' },
  { label: 'Email', value: 'pbsbd@yahoo.com', href: 'mailto:pbsbd@yahoo.com' },
  { label: 'LinkedIn', value: 'linkedin.com/in/pronabesh-bhowmik', href: 'https://www.linkedin.com/in/pronabesh-bhowmik', external: true },
];

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-14 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-20">
      <div>
        <h1 className="display text-5xl text-ink sm:text-6xl">Get in touch</h1>
        <p className="mt-5 max-w-md text-lg text-mute">Have a question or a suggestion, or want a new tool built? Reach out by phone, email or LinkedIn, or use the form.</p>
        <dl className="mt-10">
          {ways.map((w) => (
            <div key={w.label} className="border-t border-line py-4">
              <dt className="text-sm text-mute">{w.label}</dt>
              <dd className="mt-0.5 break-all text-lg font-semibold text-ink">
                <a
                  href={w.href}
                  {...(w.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="underline decoration-marigold decoration-2 underline-offset-4 hover:text-bottle"
                >
                  {w.value}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
