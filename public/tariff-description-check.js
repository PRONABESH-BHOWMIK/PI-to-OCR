// Tariff description lookup for AI-generated HS codes.
// Exact 8-digit match against public/data/hs-tariff-descriptions.js.
// No fuzzy matching and no fallback to 4/6-digit headings.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.TariffDescriptionCheck = api;
    const start = () => api.mount(root.document);
    if (root.document) {
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
      else start();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getTable(root) {
    const table = root && root.HS_TARIFF_DESCRIPTIONS;
    return table && typeof table === 'object' ? table : null;
  }

  function normalizeHsCode(value) {
    const match = String(value || '').match(/\d[\d\s.-]*/);
    if (!match) return null;
    return match[0].replace(/\D/g, '');
  }

  function extractExactHsCodes(text) {
    const codes = [];
    const pattern = /H\.?\s*S\.?\s*CODE\s*:\s*([^\r\n]*)/gi;
    for (const match of String(text || '').matchAll(pattern)) {
      const digits = normalizeHsCode(match[1]);
      if (!digits || digits.length !== 8) continue;
      const raw = match[1].trim().replace(/[\s.-]+$/, '');
      codes.push({ display: raw || digits, digits });
    }
    return codes;
  }

  function lookupTariffDescriptions(text, table) {
    const data = getTable(typeof table === 'object' && table ? { HS_TARIFF_DESCRIPTIONS: table } : globalThis);
    const codes = extractExactHsCodes(text);
    const matches = [];
    const seen = new Set();
    for (const code of codes) {
      if (seen.has(code.digits)) continue;
      seen.add(code.digits);
      const description = data && data[code.digits] ? String(data[code.digits]) : null;
      matches.push({ ...code, description });
    }
    return {
      codes,
      matches,
      hasDescriptions: matches.some((match) => match.description),
      allHaveDescriptions: matches.length > 0 && matches.every((match) => match.description),
      hasUnmatched: matches.some((match) => !match.description),
    };
  }

  function resultMessage(result) {
    if (!result.codes.length) return 'No exact 8-digit HS code was found to look up.';
    if (result.allHaveDescriptions) return 'Exact tariff descriptions found for the HS codes below.';
    if (result.hasDescriptions && result.hasUnmatched) return 'Tariff descriptions found for some HS codes. No exact match for codes below.';
    return 'No exact 8-digit tariff description was found for the HS codes below.';
  }

  function renderStatus(doc, result, tableLoaded) {
    const status = doc.getElementById('tariffCheckStatus');
    const message = doc.getElementById('tariffCheckMessage');
    const list = doc.getElementById('tariffCheckMatches');
    if (!status || !message || !list) return;

    if (!tableLoaded) {
      status.dataset.state = 'idle';
      message.textContent = 'Tariff description data is not loaded.';
      list.hidden = true;
      list.textContent = '';
      return;
    }

    const text = doc.getElementById('formattedText') ? doc.getElementById('formattedText').textContent.trim() : '';
    if (!text) {
      status.dataset.state = 'idle';
      message.textContent = 'Tariff descriptions will appear with the formatted results.';
      list.hidden = true;
      list.textContent = '';
      return;
    }

    const full = lookupTariffDescriptions(text, getTable(globalThis));
    const state = !full.codes.length ? 'idle' : full.allHaveDescriptions ? 'success' : 'warning';
    status.dataset.state = state;
    message.textContent = resultMessage(full);

    list.textContent = '';
    list.hidden = !full.codes.length;
    for (const match of full.matches) {
      const item = doc.createElement('li');
      const code = doc.createElement('span');
      const desc = doc.createElement('span');
      code.className = 'tariff-check-code';
      desc.className = 'tariff-check-description';
      code.textContent = match.display;
      desc.textContent = match.description || 'No exact description';
      item.append(code, desc);
      list.appendChild(item);
    }
  }

  function mount(doc) {
    if (!doc) return;
    const source = doc.getElementById('formattedText');
    const status = doc.getElementById('tariffCheckStatus');
    if (!source || !status || source.dataset.tariffCheckObserved) return;
    source.dataset.tariffCheckObserved = 'true';

    const render = () => renderStatus(doc, { codes: [] }, Boolean(getTable(globalThis)));
    render();
    const Observer = doc.defaultView && doc.defaultView.MutationObserver;
    if (Observer) new Observer(render).observe(source, { childList: true, characterData: true, subtree: true });
  }

  return {
    getTable,
    normalizeHsCode,
    extractExactHsCodes,
    lookupTariffDescriptions,
    resultMessage,
    renderStatus,
    mount,
  };
});
