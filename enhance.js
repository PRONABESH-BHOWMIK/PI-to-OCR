// Same math as the notebook's PIL steps: convert("L") then ImageEnhance.Contrast(factor).
// Edits an RGBA array in place; result is gray (R=G=B).
function enhance(rgba, contrast) {
  let sum = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    const g = (19595 * rgba[i] + 38470 * rgba[i + 1] + 7471 * rgba[i + 2] + 0x8000) >> 16;
    rgba[i] = g;
    sum += g;
  }
  const mean = Math.floor(sum / (rgba.length / 4) + 0.5);
  for (let i = 0; i < rgba.length; i += 4) {
    const t = mean * (1 - contrast) + rgba[i] * contrast;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = t <= 0 ? 0 : t >= 255 ? 255 : Math.floor(t);
  }
}

if (typeof module !== 'undefined') module.exports = { enhance };
