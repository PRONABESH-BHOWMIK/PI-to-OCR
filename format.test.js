// Run: node format.test.js
const assert = require('assert');
const { formatItems, formatBeneficiary } = require('./format.js');

// Items: capital letters, line break before QUANTITY and before H.S. CODE, full labels, N/A for missing
const out = formatItems([
  { item_name: 'Cotton Woven Fabric 100% Cotton Dyed', quantity: '5000', uom: 'YDS', currency: 'USD', unit_price: '1.85', hs_code: '5208.39.00' },
  { item_name: 'Zipper', quantity: '2000', uom: 'PCS', currency: 'USD', unit_price: '0.05', hs_code: null },
]);
assert.strictEqual(out, [
  '1. COTTON WOVEN FABRIC 100% COTTON DYED,',
  'QUANTITY : 5000 YDS, UNIT PRICE : USD 1.85/YDS,',
  'H.S. CODE : 5208.39.00.',
  '2. ZIPPER,',
  'QUANTITY : 2000 PCS, UNIT PRICE : USD 0.05/PCS,',
  'H.S. CODE : N/A.',
].join('\n'));

// A long item name wraps at 60, and wrapped lines start at the left edge (no indent)
const long = formatItems([{ item_name: 'Polyester Spun Sewing Thread 40/2 5000 Meters Cone Dyed Assorted Colours Premium Quality', quantity: '10', uom: 'CTN', currency: 'USD', unit_price: '3', hs_code: '5401.10.00' }]);
long.split('\n').forEach((l) => { assert(l.length <= 60, `item line too long: ${l}`); assert(l === l.trimStart(), `indented line: "${l}"`); assert(l === l.toUpperCase(), `not capitals: ${l}`); });
assert(long.split('\n').length > 3);

// Missing everything still gives full labels
assert.strictEqual(formatItems([{}]), ['1. N/A,', 'QUANTITY : N/A, UNIT PRICE : N/A,', 'H.S. CODE : N/A.'].join('\n'));

// Beneficiary: capital letters, max 35 per line, as many lines as needed, a very long word is cut
const ben = formatBeneficiary({ name: 'Shenzhen Golden Textile Trading Co., Ltd.', address: 'Room 1203, Building B, Huaqiang North Road, Futian District, Shenzhen 518000, Guangdong, China' });
ben.split('\n').forEach((l) => { assert(l.length <= 35, `beneficiary line too long: ${l}`); assert(l === l.trimStart() && l === l.toUpperCase()); });
assert(ben.split('\n').length >= 4);
assert(ben.startsWith('SHENZHEN GOLDEN TEXTILE TRADING\nCO., LTD.\nROOM 1203, BUILDING B, HUAQIANG')); // 'CO.,' would make the first line 36 characters
formatBeneficiary({ name: 'A'.repeat(80), address: '' }).split('\n').forEach((l) => assert(l.length <= 35));
assert.strictEqual(formatBeneficiary(null), 'N/A');

console.log('ok');
