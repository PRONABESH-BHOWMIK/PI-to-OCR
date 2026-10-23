// CommonJS on purpose: works on Vercel without a package.json.
const PROMPT = (text) => `You are reading a Proforma Invoice (PI). The text below was extracted by OCR and may contain minor recognition errors or mixed Bangla/English.

For EACH distinct product/item line in the PI, extract exactly these fields. Return ONLY a json object (no markdown fences, no commentary):

{"items":[{"item_name":"the item name only, nothing else","quantity":"numeric quantity, e.g. 500","uom":"unit of measure, e.g. KG, PCS, MT","currency":"currency code, e.g. USD","unit_price":"numeric unit price, e.g. 2.50","hs_code":"the H.S. Code, or null if not present"}]}

Use null for any field genuinely not present in the text. Do not guess.

--- OCR TEXT START ---
${text}
--- OCR TEXT END ---`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return res.status(500).json({ error: 'DEEPSEEK_API_KEY is not set in Vercel environment variables' });

  const text = String(req.body?.text ?? '').slice(0, 20000); // caps token spend per request
  if (!text.trim()) return res.status(400).json({ error: 'No text to analyse' });

  let r;
  try {
    r = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash', // old deepseek-chat alias was retired 2026-07-24
        messages: [{ role: 'user', content: PROMPT(text) }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: `Could not reach DeepSeek: ${e.message}` });
  }
  if (!r.ok) return res.status(502).json({ error: `DeepSeek returned HTTP ${r.status}` });

  try {
    const data = await r.json();
    return res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch {
    return res.status(502).json({ error: 'DeepSeek reply was not valid JSON' });
  }
};
