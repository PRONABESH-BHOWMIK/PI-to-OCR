import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  metadataBase: new URL('https://trade-finance-tools.vercel.app'),
  title: { default: 'Trade Finance Tools - Tools for the trade finance desk', template: '%s | Trade Finance Tools' },
  description: 'Free tools for trade finance professionals: automated proforma invoice OCR today, with calculators, generators and lookups on the way.',
  keywords: 'trade finance, proforma invoice, OCR, letter of credit, HS code, INCOTERMS, SWIFT, CDCS',
  openGraph: { siteName: 'Trade Finance Tools', type: 'website', url: '/' },
  twitter: { card: 'summary' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,100..900&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
