const assert = require('assert');
const {
  getTable,
  normalizeHsCode,
  extractExactHsCodes,
  lookupTariffDescriptions,
  resultMessage,
} = require('./public/tariff-description-check.js');

const TABLE = {
  '52083900': 'Dyed Woven Cotton Fabrics, With >=85% Cotton, Nes',
  '03028911': 'Hilsha fish wrapped/canned upto 2.5 kg',
  '87032351': 'Recond. Motor Cars and oth. Vehicle, incl.stn. wagon,CBU, cap. >2000cc,but =<3000cc',
};

assert.strictEqual(getTable({ HS_TARIFF_DESCRIPTIONS: TABLE }), TABLE);
assert.strictEqual(getTable({}), null);
assert.strictEqual(getTable({ HS_TARIFF_DESCRIPTIONS: 'not-object' }), null);

assert.strictEqual(normalizeHsCode('5208.39.00.'), '52083900');
assert.strictEqual(normalizeHsCode('5208 39 00'), '52083900');
assert.strictEqual(normalizeHsCode('52083900'), '52083900');
assert.strictEqual(normalizeHsCode('N/A'), null);

assert.deepStrictEqual(
  extractExactHsCodes('H.S. CODE : 5208.39.00.').map((code) => code.digits),
  ['52083900'],
);
assert.deepStrictEqual(
  extractExactHsCodes('H.S. CODE : 03028911').map((code) => code.digits),
  ['03028911'],
);
assert.deepStrictEqual(extractExactHsCodes('H.S. CODE : 5208390.'), [], 'Must be exactly 8 digits');
assert.deepStrictEqual(extractExactHsCodes('H.S. CODE : N/A.'), []);
assert.deepStrictEqual(extractExactHsCodes('No item lines found.'), []);

const exact = lookupTariffDescriptions('H.S. CODE : 5208.39.00.', TABLE);
assert.strictEqual(exact.matches.length, 1);
assert.strictEqual(exact.matches[0].digits, '52083900');
assert.strictEqual(exact.matches[0].description, TABLE['52083900']);
assert.strictEqual(exact.allHaveDescriptions, true);
assert.strictEqual(resultMessage(exact), 'Exact tariff descriptions found for the HS codes below.');

const missing = lookupTariffDescriptions('H.S. CODE : 99999999.', TABLE);
assert.strictEqual(missing.matches.length, 1);
assert.strictEqual(missing.matches[0].description, null);
assert.strictEqual(missing.allHaveDescriptions, false);
assert.strictEqual(missing.hasDescriptions, false);
assert.strictEqual(resultMessage(missing), 'No exact 8-digit tariff description was found for the HS codes below.');

const mixed = lookupTariffDescriptions('H.S. CODE : 5208.39.00.\nH.S. CODE : 99999999.', TABLE);
assert.strictEqual(mixed.matches.length, 2);
assert.strictEqual(mixed.hasDescriptions, true);
assert.strictEqual(mixed.allHaveDescriptions, false);
assert.strictEqual(resultMessage(mixed), 'Tariff descriptions found for some HS codes. No exact match for codes below.');

// Duplicate codes are collapsed.
const duplicate = lookupTariffDescriptions('H.S. CODE : 5208.39.00.\nH.S. CODE : 52083900.', TABLE);
assert.strictEqual(duplicate.matches.length, 1);

// Codes shorter than 8 digits are ignored, even if a prefix exists in the table.
assert.deepStrictEqual(extractExactHsCodes('H.S. CODE : 5208390.'), []);

console.log('HS tariff description lookup tests passed.');
