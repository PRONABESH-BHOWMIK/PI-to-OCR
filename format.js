// Formats extracted PI items into: "1. ITEM, QUANTITY : q UoM, UNIT PRICE : CUR p/UoM, H.S. CODE : hs."
// wrapped so no line exceeds 60 characters (a single word longer than that stays whole).
function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

function formatItems(items) {
  const v = (x, d = 'N/A') => (x == null || String(x).trim() === '' ? d : String(x).trim());
  return items.map((it, i) => {
    const uom = v(it.uom, ''), cur = v(it.currency, '');
    const qty = `${v(it.quantity)} ${uom}`.trim();
    const price = `${cur} ${v(it.unit_price)}/${uom}`.trim();
    return wrap(`${i + 1}. ${v(it.item_name)}, QUANTITY : ${qty}, UNIT PRICE : ${price}, H.S. CODE : ${v(it.hs_code)}.`, 60);
  }).join('\n');
}

if (typeof module !== 'undefined') module.exports = { formatItems };
