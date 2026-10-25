// Run: node tablelines.test.js
const assert = require('assert');
const { removeTableLines } = require('./tablelines.js');

const W = 200, H = 120;
const rgba = new Uint8ClampedArray(W * H * 4).fill(255);
const paint = (x, y) => { const p = (y * W + x) * 4; rgba[p] = rgba[p + 1] = rgba[p + 2] = 0; };
const dark = (x, y) => rgba[(y * W + x) * 4] < 140;
for (let x = 10; x < 190; x++) paint(x, 60);          // long horizontal table line
for (let y = 10; y < 110; y++) paint(100, y);         // long vertical table line
for (let x = 20; x < 40; x++) paint(x, 20);           // short horizontal stroke, like the bar of a letter
for (let y = 80; y < 100; y++) paint(30, y);          // short vertical stroke, like the stem of a letter

removeTableLines(rgba, W, H);
assert(!dark(50, 60) && !dark(150, 60), 'horizontal line should be gone');
assert(!dark(100, 30) && !dark(100, 90), 'vertical line should be gone');
assert(dark(30, 20), 'short horizontal stroke should stay');
assert(dark(30, 90), 'short vertical stroke should stay');
console.log('ok');
