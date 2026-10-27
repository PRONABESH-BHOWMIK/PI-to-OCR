"use client";

const field = 'w-full rounded-md border border-line bg-white px-3 py-2.5 text-ink focus:border-bottle focus:outline-none focus:ring-2 focus:ring-marigold';

// No server involved: this opens the visitor's email app with the message filled in.
export default function ContactForm() {
  const submit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `${f.get('message')}\n\nFrom: ${f.get('first')} ${f.get('last')} (${f.get('email')})`;
    window.location.href = `mailto:pbsbd@yahoo.com?subject=${encodeURIComponent(f.get('subject'))}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="first" className="mb-1.5 block text-sm font-medium">First name</label>
          <input id="first" name="first" required className={field} />
        </div>
        <div>
          <label htmlFor="last" className="mb-1.5 block text-sm font-medium">Last name</label>
          <input id="last" name="last" className={field} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input id="email" name="email" type="email" required className={field} />
      </div>
      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">Subject</label>
        <select id="subject" name="subject" className={field}>
          <option>General inquiry</option>
          <option>Tool request</option>
          <option>Bug report</option>
          <option>Partnership</option>
        </select>
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea id="message" name="message" rows={5} required className={`${field} resize-none`} />
      </div>
      <button type="submit" className="w-full rounded-md bg-bottle px-6 py-3 font-semibold text-white hover:bg-bottle-dark">
        Send message
      </button>
      <p className="text-sm text-mute">This opens your email app with the message filled in.</p>
    </form>
  );
}
