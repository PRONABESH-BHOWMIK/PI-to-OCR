// format.js
function formatOutput(text) {
  if (!text) return '';
  
  // Clean up the text: remove markdown code blocks if the AI accidentally adds them
  let cleaned = text.replace(/```[a-z]*\n?/g, '').trim();
  
  // Split into lines and remove empty lines
  const lines = cleaned.split('\n').filter(line => line.trim().length > 0);
  
  return lines.join('\n');
}
