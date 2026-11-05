import Link from 'next/link';

export const metadata = {
  title: 'Accepted Bill Payment Reminder',
  description: 'Download and launch the local Windows app that prepares accepted bill payment reminders from LC Acceptance registers and sends reviewed emails through desktop Outlook.',
  alternates: { canonical: '/tools/automailer/accepted-bill-payment-reminder' },
};

const features = ['Local Excel processing', 'Preview before sending', 'Optional Nostro emails'];
const requirements = [
  'A Windows PC with desktop Outlook installed and signed in',
  'The local companion app running in the same Windows session',
  'Your LC Acceptance register spreadsheets and applicant email-list spreadsheet',
];
const setupSteps = [
  {
    title: 'Download and extract the Windows app',
    text: 'Extract the complete folder to a permanent location on your PC. Keep the BAT file, PowerShell server, page, and lib folder together.',
  },
  {
    title: 'Open desktop Outlook',
    text: 'Sign in to the Outlook profile you want to use. You can choose an available account or shared mailbox in the app.',
  },
  {
    title: 'Run Start_BTB_Emailer.bat',
    text: 'The operational page opens at localhost:8765. Keep the console window open while preparing, opening, or sending emails.',
  },
  {
    title: 'Upload, review, and send',
    text: 'Select the Excel files, review statistics and prepared emails, then explicitly confirm what to send through Outlook.',
  },
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

export default function AcceptedBillPaymentReminderPage() {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-mute">
            <Link href="/tools" className="font-medium hover:text-bottle hover:underline">Tools</Link>
            <span aria-hidden="true">/</span>
            <Link href="/tools/automailer" className="font-medium hover:text-bottle hover:underline">AutoMailer</Link>
            <span aria-hidden="true">/</span>
            <span>Accepted Bill Payment Reminder</span>
          </nav>
          <div className="max-w-4xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-bottle">AutoMailer · Local Windows app</p>
            <h1 className="display text-5xl text-ink sm:text-6xl">Accepted Bill Payment Reminder</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-mute">
              Turn LC Acceptance registers into reviewed payment reminders grouped by applicant, then open or send them through your own desktop Outlook.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-1.5 text-bottle">
                  <CheckIcon /><span className="text-ink">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14" aria-label="Download and setup">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr] lg:items-start">
          <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
            <span className="inline-flex rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-ink">One-time local setup</span>
            <h2 className="display mt-5 text-3xl text-ink sm:text-4xl">Set up on your Windows PC</h2>
            <p className="mt-3 leading-relaxed text-mute">
              The website provides the download and launcher. Outlook sending takes place through the companion app on your PC.
            </p>

            <ol className="mt-7 space-y-6">
              {setupSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="display flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-marigold text-sm text-ink">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-mute">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/downloads/accepted-bill-payment-reminder.zip" download className="rounded-md bg-bottle px-5 py-3 text-center font-semibold text-white hover:bg-bottle-dark">
                Download Windows app
              </a>
              <a href="http://localhost:8765/" target="_blank" rel="noopener noreferrer" className="rounded-md border-2 border-bottle px-5 py-3 text-center font-semibold text-bottle hover:bg-bottle hover:text-white">
                Open local app
              </a>
            </div>
            <p className="mt-3 text-sm text-mute">Open local app works only after the BAT launcher has started the companion server on your PC.</p>
          </div>

          <div className="space-y-6">
            <aside className="rounded-xl bg-bottle p-6 text-white sm:p-8" aria-labelledby="requirements-title">
              <h2 id="requirements-title" className="display text-3xl">Before you start</h2>
              <ul className="mt-5 space-y-4 text-white/85">
                {requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-3 text-marigold">
                    <CheckIcon /><span className="text-white/85">{requirement}</span>
                  </li>
                ))}
              </ul>
            </aside>

            <aside className="rounded-xl border border-line bg-white p-6 sm:p-8" aria-labelledby="daily-use-title">
              <h2 id="daily-use-title" className="text-xl font-semibold text-ink">After setup</h2>
              <p className="mt-3 leading-relaxed text-mute">
                You do not need to return to this website for daily use. Open Outlook and double-click the BAT file on your PC to open the operational page directly.
              </p>
              <div className="mt-5 border-l-2 border-marigold pl-4">
                <h3 className="text-sm font-semibold text-ink">Your files stay local</h3>
                <p className="mt-1 text-sm leading-relaxed text-mute">Spreadsheet parsing and email preparation happen on your PC. Nothing is uploaded to this website by the local app.</p>
              </div>
            </aside>
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-xl border border-line bg-white p-6 sm:grid-cols-3 sm:p-8" aria-label="Operational app capabilities">
          <div>
            <h2 className="font-semibold text-bottle">Review first</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">See bill counts, email queues, missing addresses, and full previews before taking action.</p>
          </div>
          <div>
            <h2 className="font-semibold text-bottle">Explicit sending</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">Nothing sends automatically. Select messages and confirm, or open them in Outlook to edit first.</p>
          </div>
          <div>
            <h2 className="font-semibold text-bottle">Local records</h2>
            <p className="mt-2 text-sm leading-relaxed text-mute">Sent copies remain in Outlook Sent Items, and open/send attempts are written to a monthly CSV log on your PC.</p>
          </div>
        </div>
      </section>
    </>
  );
}
