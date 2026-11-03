// Bangladesh import-control HS prefix check.
// Source: the user-supplied "Controlled and Banned goods.txt" list.
// This is an exact, deterministic first-four-digit comparison; no AI or fuzzy matching is used.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    root.HSCodeCheck = api;
    const start = () => api.mount(root.document);
    if (root.document) {
      if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
      else start();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONTROLLED_PREFIXES = Object.freeze([
    '1302', '2710', '2713', '3808', '4508', '8701', '8702', '8703', '8704', '8708',
    '8711', '9302', '9303', '9304', '9305', '2841', '0306', '8802', '4813', '5502',
  ]);
  const BANNED_PREFIXES = Object.freeze([
    '1207', '1211', '2307', '2711', '2713', '2929', '2930', '3923', '6305', '8408',
    '8703', '9018', '2301',
  ]);
  const controlled = new Set(CONTROLLED_PREFIXES);
  const banned = new Set(BANNED_PREFIXES);

  // Read the structured H.S. CODE lines produced by formatItems. Punctuation and spaces
  // are ignored for matching, while the original code is retained for display.
  function extractHsCodes(text) {
    const codes = [];
    const pattern = /H\.?\s*S\.?\s*CODE\s*:\s*([^\r\n]*)/gi;
    for (const match of String(text || '').matchAll(pattern)) {
      const value = match[1].match(/\d[\d\s.-]*/);
      if (!value) continue;
      const digits = value[0].replace(/\D/g, '');
      if (digits.length < 4) continue;
      codes.push({
        display: value[0].trim().replace(/[\s.-]+$/, ''),
        digits,
        prefix: digits.slice(0, 4),
      });
    }
    return codes;
  }

  function checkHsCodes(text) {
    const codes = extractHsCodes(text);
    const matches = [];
    const seen = new Set();
    for (const code of codes) {
      const isControlled = controlled.has(code.prefix);
      const isBanned = banned.has(code.prefix);
      if ((!isControlled && !isBanned) || seen.has(code.digits)) continue;
      seen.add(code.digits);
      matches.push({ ...code, controlled: isControlled, banned: isBanned });
    }
    return {
      codes,
      matches,
      hasControlled: matches.some((match) => match.controlled),
      hasBanned: matches.some((match) => match.banned),
    };
  }

  function resultMessage(result) {
    if (!result.codes.length) return 'No readable HS code was found to check.';
    if (!result.matches.length) return 'No Controlled or Banned goods found in PI.';
    const category = result.hasControlled && result.hasBanned
      ? 'both Controlled and Banned'
      : result.hasControlled ? 'Controlled' : 'Banned';
    return `The below HS codes might be related to ${category} goods in Bangladesh.`;
  }

  function mount(doc) {
    if (!doc) return;
    const source = doc.getElementById('formattedText');
    const status = doc.getElementById('hsCheckStatus');
    const message = doc.getElementById('hsCheckMessage');
    const list = doc.getElementById('hsCheckMatches');
    if (!source || !status || !message || !list || source.dataset.hsCheckObserved) return;
    source.dataset.hsCheckObserved = 'true';

    const render = () => {
      const text = source.textContent.trim();
      const result = checkHsCodes(text);
      const state = !text || !result.codes.length ? 'idle' : result.matches.length ? 'danger' : 'success';
      status.dataset.state = state;
      message.textContent = text ? resultMessage(result) : 'HS code check will appear with the formatted results.';
      list.textContent = '';
      list.hidden = !result.matches.length || !text;
      for (const match of result.matches) {
        if (!text) break;
        const item = doc.createElement('li');
        const code = doc.createElement('span');
        const category = doc.createElement('span');
        code.className = 'hs-check-code';
        category.className = 'hs-check-category';
        code.textContent = match.display;
        category.textContent = match.controlled && match.banned
          ? 'Controlled and Banned'
          : match.controlled ? 'Controlled' : 'Banned';
        item.append(code, category);
        list.appendChild(item);
      }
    };

    render();
    const Observer = doc.defaultView && doc.defaultView.MutationObserver;
    if (Observer) new Observer(render).observe(source, { childList: true, characterData: true, subtree: true });
  }

  return { CONTROLLED_PREFIXES, BANNED_PREFIXES, extractHsCodes, checkHsCodes, resultMessage, mount };
});
