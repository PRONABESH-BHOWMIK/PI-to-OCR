// pages.js
// Reads a page selection such as "1-3, 5, 8-10" for a document with `total` pages.
// Blank or "all" means every page. Returns the page numbers in document order, without duplicates.
function parsePageSpec(spec, total) {
  const text = String(spec == null ? '' : spec).trim().toLowerCase().replace(/\s*[-\u2013\u2014]\s*/g, '-');
  if (text === '' || text === 'all') return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set();
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a page number or range (use for example 1-3, 5).`);
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from < 1 || to < from) throw new Error(`"${part}" is not a valid page range.`);
    if (to > total) throw new Error(`Page ${to} does not exist: the file has ${total} page${total === 1 ? '' : 's'}.`);
    for (let n = from; n <= to; n++) pages.add(n);
  }
  return [...pages].sort((a, b) => a - b);
}

if (typeof module !== 'undefined') module.exports = { parsePageSpec };
