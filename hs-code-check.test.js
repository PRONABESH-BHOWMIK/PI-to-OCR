const assert = require('assert');
const {
  CONTROLLED_PREFIXES,
  BANNED_PREFIXES,
  extractHsCodes,
  checkHsCodes,
  resultMessage,
} = require('./public/hs-code-check.js');

const check = (code) => checkHsCodes(`H.S. CODE : ${code}.`);

assert.strictEqual(CONTROLLED_PREFIXES.length, 20);
assert.strictEqual(BANNED_PREFIXES.length, 13);
assert.deepStrictEqual(extractHsCodes('H.S. CODE : 5208.39.00.').map((code) => code.display), ['5208.39.00']);
assert.deepStrictEqual(extractHsCodes('H.S. CODE : 0306.17.00.').map((code) => code.prefix), ['0306']);
assert.deepStrictEqual(extractHsCodes('HS CODE: 8703 23 51').map((code) => code.prefix), ['8703']);
assert.deepStrictEqual(extractHsCodes('H.S. CODE : N/A.'), []);

assert.deepStrictEqual(check('5208.39.00').matches, []);
assert.strictEqual(resultMessage(check('5208.39.00')), 'No Controlled or Banned goods found in PI.');
assert.strictEqual(resultMessage(checkHsCodes('No item lines found.')), 'No readable HS code was found to check.');

assert.strictEqual(resultMessage(check('8702.10.00')), 'The below HS codes might be related to Controlled goods in Bangladesh.');
assert.strictEqual(resultMessage(check('1207.50.00')), 'The below HS codes might be related to Banned goods in Bangladesh.');
assert.strictEqual(resultMessage(check('2713.11.00')), 'The below HS codes might be related to both Controlled and Banned goods in Bangladesh.');
assert.deepStrictEqual(
  check('8703.23.51').matches.map(({ controlled, banned }) => ({ controlled, banned })),
  [{ controlled: true, banned: true }],
);

const acrossCategories = checkHsCodes('H.S. CODE : 8701.10.00.\nH.S. CODE : 9018.90.00.');
assert.strictEqual(resultMessage(acrossCategories), 'The below HS codes might be related to both Controlled and Banned goods in Bangladesh.');
assert.strictEqual(acrossCategories.matches.length, 2);

// Prefixes must be exact: a matching four-digit substring elsewhere is not enough.
assert.deepStrictEqual(check('1870.30.00').matches, []);
assert.deepStrictEqual(check('9870.30.00').matches, []);

for (const prefix of CONTROLLED_PREFIXES) {
  assert(check(`${prefix}00`).matches[0].controlled, `${prefix} should be Controlled`);
}
for (const prefix of BANNED_PREFIXES) {
  assert(check(`${prefix}00`).matches[0].banned, `${prefix} should be Banned`);
}

console.log('HS code check tests passed.');
