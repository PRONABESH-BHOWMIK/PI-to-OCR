// tablelines.js
// Whitens long straight horizontal and vertical strokes (ruled table lines and boxes) in a gray RGBA image,
// so they stop confusing the OCR's page layout detection. Used on a copy for OCR only; the PDF keeps the original.
// Letters never have strokes this long. Runs shorter than minH (horizontal) or minV (vertical) pixels are kept.
function removeTableLines(rgba, width, height, minH = 60, minV = 50, dark = 140) {
  const n = width * height;
  const isDark = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) isDark[i] = rgba[p] < dark ? 1 : 0;

  const line = new Uint8Array(n);
  for (let y = 0; y < height; y++) {            // horizontal runs
    let start = -1;
    const row = y * width;
    for (let x = 0; x <= width; x++) {
      if (x < width && isDark[row + x]) { if (start < 0) start = x; }
      else if (start >= 0) { if (x - start >= minH) line.fill(1, row + start, row + x); start = -1; }
    }
  }
  for (let x = 0; x < width; x++) {             // vertical runs
    let start = -1;
    for (let y = 0; y <= height; y++) {
      if (y < height && isDark[y * width + x]) { if (start < 0) start = y; }
      else if (start >= 0) { if (y - start >= minV) for (let k = start; k < y; k++) line[k * width + x] = 1; start = -1; }
    }
  }

  for (let y = 0; y < height; y++) {            // whiten each line pixel plus a 1 px margin (anti-aliased edges)
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < width && line[yy * width + xx]) { hit = 1; break; }
        }
      }
      if (hit) { const p = (y * width + x) * 4; rgba[p] = rgba[p + 1] = rgba[p + 2] = 255; }
    }
  }
}

if (typeof module !== 'undefined') module.exports = { removeTableLines };
