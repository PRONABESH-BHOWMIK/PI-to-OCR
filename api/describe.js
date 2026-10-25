// api/describe.js
// Vercel web handler: export a function named after the HTTP method.
// (A plain `export default function handler(req)` that returns a Response is treated as a
// Node (req, res) handler, so the response is never sent and the request ends in a 504 timeout.)
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Your own corrections go here: extra rules for mistakes the AI keeps making, plus 2-3 short worked
// examples (OCR text -> the correct JSON). Every request pays for this text, so keep it short.
const EXTRA_RULES = '';

export async function POST(request) {
  try {
    const { ocrText, retry, images } = await request.json();
    if (!ocrText || typeof ocrText !== 'string') {
      return json({ error: 'Missing or invalid ocrText' }, 400);
    }
    // Page pictures (JPEG data URLs). Groq's vision models take at most 3 images per request.
    const pictures = Array.isArray(images) ? images : [];
    if (pictures.length > 3 || pictures.some((u) => typeof u !== 'string' || !u.startsWith('data:image/jpeg;base64,')) || pictures.join('').length > 4000000) {
      return json({ error: 'Invalid images: send at most 3 JPEG data URLs, 4 MB in total' }, 400);
    }
    const vision = pictures.length > 0;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: 'GROQ_API_KEY is not configured in Vercel' }, 500);
    }

    // Text model: llama-3.3-70b-versatile was shut down by Groq on 2026-08-16; this is Groq's recommended replacement.
    // Vision model: Groq lists qwen/qwen3.8-27b (preview) for images; set GROQ_VISION_MODEL if Groq changes it.
    const model = vision ? (process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b') : (process.env.GROQ_MODEL || 'openai/gpt-oss-120b');
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 8000;

    const intro = vision
      ? "You read a Proforma Invoice (PI) from its page pictures, the way a person would: the pictures show which name, quantity, price and amount sit in the same row, so use the layout. The OCR text after the rules is a machine reading of the same pages and may be wrong, garbled or out of order: trust the pictures and use the OCR text only to double-check digits. The PI may mix Bangla and English."
      : 'You read the OCR text of a Proforma Invoice (PI). The text may contain recognition errors and mixed Bangla/English.';

    const prompt = `${intro} Return ONLY a JSON object, no markdown fences and no commentary, in exactly this shape:

{"beneficiary":{"name":"...","address":"..."},"items":[{"item_name":"...","quantity":"...","uom":"...","currency":"...","unit_price":"...","line_total":"...","hs_code":"..."}],"notes":""}

Rules:
- beneficiary is the seller / exporter / shipper who issued the PI. name = the company name only. address = the full postal address (street, city, postal code, country) as one string. Leave out phone, fax, email and website.
- items has one entry per product line, in the PI's order. item_name = the item name only, as written in the PI (no quantity, price or H.S. code).
- quantity = the number only. uom = the unit of measure as written in the PI (YDS, PCS, KG, MTR, SET...). currency = the currency code (USD, EUR...). unit_price = the number only, the price for one unit.
- The text may be a table with one row per item, columns separated by spaces. Do not mistake the pack size (for example 120 Kg drum) for the ordered quantity (the Qty column), or the line total for the unit price (the Unit Price column).
- line_total = the amount printed for that item's row (number only).
- hs_code = the H.S. code printed in the PI for that item.
- In a table, an item's name can wrap over two lines, so the name may sit on the line above or below the line that carries the serial number, quantity and amounts. Pair them in order. Return one entry for every numbered row or row with an amount, even when some fields are unreadable (use null for those). Return an empty items list only when the text has no item rows at all, and then say why in notes.
- Never calculate, estimate or correct numbers yourself. Copy each number exactly as it appears in the text (the OCR may have dropped a decimal point; copy it as it appears). A program checks quantity x unit price = line total afterwards and only uses numbers that are written in the text.
- Use null for anything that is not in the text. Do not guess. notes = one short sentence only if something stopped you reading the items, otherwise an empty string.
${EXTRA_RULES}
${retry ? 'Your previous answer was rejected by the user. Re-read the text carefully and correct any mistakes.' : ''}

${vision ? 'OCR text (may be wrong or out of order):' : 'Raw OCR:'}
${ocrText}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: vision
            ? [...pictures.map((url) => ({ type: 'image_url', image_url: { url } })), { type: 'text', text: prompt }]
            : prompt
        }],
        temperature: retry ? 0.5 : 0.1, // a re-generate should not just repeat the same answer
        max_tokens: vision ? 4096 : 2048,
        // gpt-oss thinks before answering and thinking tokens count against max_tokens; keep it short
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        // Qwen vision: instruct mode (no thinking, per Groq's model page) and guaranteed JSON
        ...(vision ? { reasoning_effort: 'none', response_format: { type: 'json_object' } } : {})
      }),
      // answer with a readable error before Vercel's own time limit kills the function
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return json({
        error: `Groq API failed: ${response.status}`,
        details: errorData.error?.message || 'Unknown error'
      }, 502);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); // tolerates stray text or fences
    } catch {
      return json({ error: 'Could not read the reply as data', details: raw.slice(0, 200) }, 502);
    }
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return json({
      beneficiary: parsed.beneficiary || null,
      items,
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      via: vision ? 'pictures' : 'text',
      // when nothing was found, pass the AI's own reply along so the page can show why
      ...(items.length ? {} : { debug: raw.slice(0, 300) })
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return json({ error: 'Groq did not answer in time' }, 504);
    }
    return json({ error: 'Internal Server Error', details: error.message }, 500);
  }
}
