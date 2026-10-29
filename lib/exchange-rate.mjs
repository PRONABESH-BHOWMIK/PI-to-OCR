export const BANGLADESH_BANK_URL = 'https://www.bb.org.bd/en/index.php/econdata/exchangerate';

export const BB_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'SEK', 'SGD', 'CNH', 'INR', 'LKR'];

function cleanHtml(fragment) {
  return fragment
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function isoEffectiveDate(html) {
  const text = cleanHtml(html);
  const numeric = /FX Rate Sheet effective for\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(text);
  if (numeric) return `${numeric[3]}-${numeric[2]}-${numeric[1]}`;

  const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const named = /Exchange Rate of Taka\s*\((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(\d{4})\)/i.exec(text);
  if (named) return `${named[3]}-${months[named[1].toLowerCase()]}-${named[2].padStart(2, '0')}`;
  return null;
}

export function parseBangladeshBankRate(html, currency) {
  if (typeof html !== 'string' || !BB_CURRENCIES.includes(currency)) return null;
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((match) => cleanHtml(match[1]));
    if (cells[0]?.toUpperCase() !== currency) continue;

    const values = cells.slice(1).map((cell) => {
      const match = cell.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : NaN;
    }).filter(Number.isFinite);

    // Both the USD table and cross-rate table put Ask in the second numeric column.
    if (values.length >= 2 && values[1] > 0) {
      return {
        currency,
        rate: values[1],
        rateType: 'ask',
        effectiveDate: isoEffectiveDate(html),
        source: 'Bangladesh Bank',
        sourceUrl: BANGLADESH_BANK_URL,
      };
    }
  }
  return null;
}
