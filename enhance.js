// enhance.js
function enhanceImage(canvas) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clamp long side to 2000 px for optimal OCR
  const maxSide = 2000;
  const scale = Math.min(maxSide / Math.max(width, height), 1);
  
  if (scale < 1) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * scale;
    tempCanvas.height = height * scale;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply grayscale and contrast (1.3)
  const contrast = 1.3;
  const intercept = 128 * (1 - contrast);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Apply contrast
    const finalVal = Math.min(255, Math.max(0, gray * contrast + intercept));
    
    data[i] = finalVal;
    data[i + 1] = finalVal;
    data[i + 2] = finalVal;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Return as JPEG with quality 85
  return canvas.toDataURL('image/jpeg', 0.85);
}
