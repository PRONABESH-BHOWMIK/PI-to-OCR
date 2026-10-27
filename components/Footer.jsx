import Link from 'next/link';

const link = 'hover:text-marigold underline-offset-4 hover:underline';

export default function Footer() {
  return (
    <footer className="bg-bottle text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-6 border-b border-white/20 pb-12 md:flex-row md:items-end md:justify-between">
          <h2 className="display max-w-xl text-4xl sm:text-5xl">Missing a tool you need on the desk?</h2>
          <Link href="/contact" className="w-fit rounded-md bg-marigold px-6 py-3 font-semibold text-ink hover:bg-white">
            Request a tool
          </Link>
        </div>

        <div className="grid gap-10 pt-12 sm:grid-cols-3">
          <div>
            <h3 className="font-semibold text-marigold">Tools</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/tools/proforma-invoice-ocr" className={link}>Proforma Invoice OCR</Link></li>
              <li><Link href="/tools" className={link}>All tools</Link></li>
              <li className="text-white/60">More tools coming soon</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-marigold">Site</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/about" className={link}>About</Link></li>
              <li><Link href="/contact" className={link}>Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-marigold">Get in touch</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="tel:+8801614244131" className={link}>+880 1614244131</a></li>
              <li><a href="mailto:pbsbd@yahoo.com" className={link}>pbsbd@yahoo.com</a></li>
              <li><a href="https://www.linkedin.com/in/pronabesh-bhowmik" target="_blank" rel="noopener noreferrer" className={link}>LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-white/20 pt-6 text-sm text-white/70">
          &copy; {new Date().getFullYear()} Trade Finance Tools. Developed by Pronabesh Bhowmik, CDCS.
        </p>
      </div>
    </footer>
  );
}
