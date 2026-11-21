// lib/hs-code-parse.js
// Parses the HS code input on the HS Code Finder tool.
//
// Rules:
// - Accept codes with or without dots: "52083900" and "5208.39.00" both
//   normalize to "52083900".
// - Accept several codes separated by commas (commas and whitespace are the
//   only separators).
// - Only 8-digit codes are kept; anything else is dropped so it never matches.

/** Strip dots and whitespace, then validate: exactly 8 digits. */
export function normalizeHsCode(raw) {
  const digits = String(raw ?? '')
    .replace(/[.\s]/g, '')
    .trim();
  return /^\d{8}$/.test(digits) ? digits : null;
}

/**
 * Parse a comma-separated input into an ordered, de-duplicated list of
 * normalized 8-digit codes. Invalid entries are ignored.
 */
export function parseHsCodes(input) {
  const seen = new Set();
  const codes = [];
  for (const piece of String(input ?? '').split(',')) {
    const code = normalizeHsCode(piece);
    if (code && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}
