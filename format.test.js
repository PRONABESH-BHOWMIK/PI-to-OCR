// Run: node format.test.js
const assert = require('assert');
const { formatItems } = require('./format.js');

const out = formatItems([
  { item_name: 'Cotton Woven Fabric 100% Cotton Dyed', quantity: '5000', uom: 'YDS', currency: 'USD', unit_price: '1.85', hs_code: '5208.39.00' },
  { item_name: 'Zipper', quantity: '2000', uom: 'PCS', currency: 'USD', unit_price: '0.05', hs_code: null },
]);

assert.strictEqual(out, [
  '1. Cotton Woven Fabric 100% Cotton Dyed, QUANTITY : 5000',
  'YDS, UNIT PRICE : USD 1.85/YDS, H.S. CODE : 5208.39.00.',
  '2. Zipper, QUANTITY : 2000 PCS, UNIT PRICE : USD 0.05/PCS,',
  'H.S. CODE : N/A.',
].join('\n'));
out.split('\n').forEach(l => assert(l.length <= 60, `line too long: ${l}`));
console.log('ok');
