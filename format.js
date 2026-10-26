// format.js
// Turns the AI's extracted data into the two copy-ready text blocks. All layout rules live here
// (not in the AI prompt), so they are applied the same way every time.

// Word wrap to `width` characters. Lines never start with a space. With hard=true a single word
// longer than the limit is cut, so the limit can never be exceeded.
function wrapWords(text, width, hard) {
  const lines = [];
  let line = '';
  for (let word of String(text).trim().split(/\s+/).filter(Boolean)) {
    while (hard && word.length > width) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (line && (line + ' ' + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

const clean = (x) => (x == null ? '' : String(x).trim());
const orNA = (x) => clean(x) || 'N/A';

// 1. ITEM NAME,
// QUANTITY : 5000 YDS, UNIT PRICE : USD 1.85/YDS,
// H.S. CODE : 5208.39.00.
// Capital letters, max 60 characters per line, continuation lines start at the left edge.
function formatItems(items) {
  return items.map((it, i) => {
    const uom = clean(it.uom);
    const qty = clean(it.quantity) ? `${clean(it.quantity)} ${uom}`.trim() : 'N/A';
    const price = clean(it.unit_price)
      ? `${clean(it.currency)} ${clean(it.unit_price)}${uom ? '/' + uom : ''}`.trim()
      : 'N/A';
    return [
      `${i + 1}. ${orNA(it.item_name)},`,
      `QUANTITY : ${qty}, UNIT PRICE : ${price},`,
      `H.S. CODE : ${orNA(it.hs_code)}.`,
    ].map((part) => wrapWords(part.toUpperCase(), 60, false).join('\n')).join('\n');
  }).join('\n');
}

// PI number and date in one line: "RH-2026-01391-(C-G) DATED 20.08.2026" (capital letters, N/A for a missing part).
function formatPiRef(pi) {
  const number = clean(pi && pi.number), date = clean(pi && pi.date);
  if (!number && !date) return 'N/A';
  return `${orNA(number)} DATED ${orNA(date)}`.toUpperCase();
}

// Seller / exporter / shipper: name, then address; capital letters, max 35 characters per line.
function formatBeneficiary(b) {
  const lines = [
    ...wrapWords(clean(b && b.name).toUpperCase(), 35, true),
    ...wrapWords(clean(b && b.address).toUpperCase(), 35, true),
  ];
  return lines.length ? lines.join('\n') : 'N/A';
}

if (typeof module !== 'undefined') module.exports = { formatItems, formatBeneficiary, formatPiRef };
