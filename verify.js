// verify.js
// Cross-checks the AI's quantity / unit price / line total with arithmetic, done here in code (not by the AI).
// A number is only ever filled in or corrected when it is worked out from two other numbers of the same row
// AND the result is actually present in the extracted text. Nothing is invented.

// "22,500.00" -> 22500, "360,0" -> 360, "USD 4.50/KG" -> 4.5
function toNumber(x) {
  if (x == null) return NaN;
  let s = String(x).replace(/[^\d.,-]/g, '');
  if (!/\d/.test(s)) return NaN;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');   // thousands separators
  else if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');           // comma used as the decimal point
  else s = s.replace(/,/g, '');
  return parseFloat(s);
}

// Index of every number written in the text.
//  exact: numbers printed with a decimal point or thousands comma, compared by value (22,500.00 -> 22500).
//  bare:  plain digit strings (no . or ,), compared by their digits, because OCR often loses the decimal point
//         (a printed 2000.00 may be read as "200000", 4.50 as "450").
const stripZeros = (d) => d.replace(/^0+/, '');
function textIndex(text) {
  const exact = new Set(), bare = new Set();
  for (const raw of String(text).match(/\d[\d.,]*/g) || []) {
    const tok = raw.replace(/[.,]+$/, '');
    if (/^\d+$/.test(tok)) { const sig = stripZeros(tok); if (sig.length >= 2) bare.add(sig); }
    else { const v = toNumber(tok); if (Number.isFinite(v)) exact.add(v.toFixed(4)); }
  }
  return { exact, bare };
}

// Is the value v written somewhere in the text?
function inText(v, idx) {
  if (idx.exact.has(v.toFixed(4))) return true;
  for (let d = 0; d <= 3; d++) {
    if (Math.abs(Number(v.toFixed(d)) - v) > 1e-9) continue;
    const sig = stripZeros(String(Math.round(v * 10 ** d)));
    if (sig.length >= 2 && idx.bare.has(sig)) return true;
  }
  return false;
}

const close = (a, b) => Math.abs(a - b) <= Math.max(0.02, 0.005 * Math.abs(b));
const ok = (v) => Number.isFinite(v) && v > 0;
const money = (v) => { let s = String(+v.toFixed(4)); if (!s.includes('.')) s += '.00'; else if (s.split('.')[1].length < 2) s += '0'; return s; };
const plain = (v) => String(+v.toFixed(3));

function checkItems(items, ocrText) {
  const idx = textIndex(ocrText);
  const notes = [];
  const checked = items.map((it, i) => {
    const item = { ...it };
    const n = i + 1;
    const q = toNumber(it.quantity), p = toNumber(it.unit_price), t = toNumber(it.line_total);
    const has = (v) => Number.isFinite(v) && v > 0 && inText(v, idx);

    if (ok(q) && ok(p) && ok(t)) {
      if (close(q * p, t)) return item;                                    // all three agree
      const fixes = [];
      if (has(t / p)) fixes.push('q');
      if (has(t / q)) fixes.push('p');
      if (has(q * p)) fixes.push('t');
      if (fixes.length === 1 && fixes[0] === 'q') {
        item.quantity = plain(t / p);
        notes.push(`Item ${n}: quantity ${it.quantity} did not fit unit price ${it.unit_price} and line total ${it.line_total}. ${item.quantity} (line total / unit price) is written in the text, so it was used.`);
      } else if (fixes.length === 1 && fixes[0] === 'p') {
        item.unit_price = money(t / q);
        notes.push(`Item ${n}: unit price ${it.unit_price} did not fit quantity ${it.quantity} and line total ${it.line_total}. ${item.unit_price} (line total / quantity) is written in the text, so it was used.`);
      } else if (fixes.length === 1 && fixes[0] === 't') {
        notes.push(`Item ${n}: line total ${it.line_total} differs from quantity x unit price (${money(q * p)}), which is written in the text. Quantity and unit price were kept; please check the line total.`);
      } else {
        // Both numbers may have lost their decimal point in the OCR (2000.00 read as 200000, 4.50 as 450):
        // accept a scaled pair only if both scaled values are written in the text AND their product equals the line total.
        const pairs = [];
        for (const a of [0, 1, 2]) for (const b of [0, 1, 2]) {
          if (a === 0 && b === 0) continue;
          const q2 = q / 10 ** a, p2 = p / 10 ** b;
          if (close(q2 * p2, t) && has(q2) && has(p2)) pairs.push([q2, p2]);
        }
        if (pairs.length === 1) {
          item.quantity = plain(pairs[0][0]);
          item.unit_price = money(pairs[0][1]);
          notes.push(`Item ${n}: quantity ${it.quantity} and unit price ${it.unit_price} did not fit line total ${it.line_total}. With the decimal points restored, ${item.quantity} x ${item.unit_price} equals the line total and both numbers are written in the text, so they were used.`);
        } else {
          notes.push(`Item ${n}: quantity ${it.quantity} x unit price ${it.unit_price} = ${money(q * p)}, but the line total is ${it.line_total}. Please check this item against the PI.`);
        }
      }
    } else if (ok(t) && ok(p) && !ok(q)) {
      const c = t / p;
      if (has(c)) { item.quantity = plain(c); notes.push(`Item ${n}: quantity was missing. ${item.quantity} (line total ${it.line_total} / unit price ${it.unit_price}) is written in the text, so it was used.`); }
      else notes.push(`Item ${n}: quantity is missing. Line total / unit price gives ${plain(c)}, but that number is not in the text, so it was not used.`);
    } else if (ok(t) && ok(q) && !ok(p)) {
      const c = t / q;
      if (has(c)) { item.unit_price = money(c); notes.push(`Item ${n}: unit price was missing. ${item.unit_price} (line total ${it.line_total} / quantity ${it.quantity}) is written in the text, so it was used.`); }
      else notes.push(`Item ${n}: unit price is missing. Line total / quantity gives ${money(c)}, but that number is not in the text, so it was not used.`);
    } else if (ok(q) && ok(p) && !ok(t)) {
      if (!has(q * p)) notes.push(`Item ${n}: no line total was found, and quantity x unit price (${money(q * p)}) is not in the text. Please check this item.`);
    } else if (ok(t) && !ok(q) && !ok(p)) {
      notes.push(`Item ${n}: quantity and unit price are both missing; they cannot be worked out from the line total alone.`);
    }
    return item;
  });
  return { items: checked, notes };
}

// The PI number and date the AI gives must be written in the extracted text (case, spaces, dots and dashes ignored).
const squash = (x) => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
function checkPiRef(pi, ocrText) {
  const text = squash(ocrText);
  const notes = [];
  for (const [label, key] of [['PI number', 'number'], ['PI date', 'date']]) {
    const value = pi && pi[key] != null ? String(pi[key]).trim() : '';
    if (!squash(value)) notes.push(`${label} was not found in the text.`);
    else if (!text.includes(squash(value))) notes.push(`${label} ${value} is not written in the extracted text exactly as given. Please check it against the PI.`);
  }
  return notes;
}

if (typeof module !== 'undefined') module.exports = { checkItems, checkPiRef, toNumber };
