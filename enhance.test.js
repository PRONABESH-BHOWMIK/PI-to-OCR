// Run: node enhance.test.js  (expected values produced by PIL convert("L") + ImageEnhance.Contrast(1.3))
const assert = require('assert');
const { enhance } = require('./enhance.js');

const rgb = [10, 20, 30, 200, 100, 50, 255, 255, 255, 0, 0, 0, 120, 130, 140, 30, 200, 90, 250, 10, 10, 90, 90, 90];
const rgba = new Uint8ClampedArray(rgb.length / 3 * 4);
for (let i = 0; i < rgb.length / 3; i++) rgba.set([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 255], i * 4);

enhance(rgba, 1.3);
assert.deepStrictEqual(Array.from({ length: 8 }, (_, i) => rgba[i * 4]), [0, 130, 255, 0, 135, 146, 75, 85]);
console.log('ok');
