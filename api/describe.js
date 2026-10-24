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
    const { ocrText, retry } = await request.json();
    if (!ocrText || typeof ocrText !== 'string') {
      return json({ error: 'Missing or invalid ocrText' }, 400);
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: 'GROQ_API_KEY is not configured in Vercel' }, 500);
    }

    // llama-3.3-70b-versatile was shut down by Groq on 2026-08-16; this is Groq's recommended replacement
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const prompt = `You read the OCR text of a Proforma Invoice (PI). The text may contain recognition errors and mixed Bangla/English. Return ONLY a JSON object, no markdown fences and no commentary, in exactly this shape:

{"beneficiary":{"name":"...","address":"..."},"items":[{"item_name":"...","quantity":"...","uom":"...","currency":"...","unit_price":"...","hs_code":"..."}]}

Rules:
- beneficiary is the seller / exporter / shipper who issued the PI. name = the company name only. address = the full postal address (street, city, postal code, country) as one string. Leave out phone, fax, email and website.
- items has one entry per product line, in the PI's order. item_name = the item name only, as written in the PI (no quantity, price or H.S. code).
- quantity = the number only. uom = the unit of measure as written in the PI (YDS, PCS, KG, MTR, SET...). currency = the currency code (USD, EUR...). unit_price = the number only, the price for one unit.
- hs_code = the H.S. code printed in the PI for that item.
- Copy numbers and codes exactly as printed. Use null for anything that is not in the text. Do not guess.
${EXTRA_RULES}
${retry ? 'Your previous answer was rejected by the user. Re-read the text carefully and correct any mistakes.' : ''}

Raw OCR:
${ocrText}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: retry ? 0.5 : 0.1, // a re-generate should not just repeat the same answer
        max_tokens: 2048,
        // gpt-oss thinks before answering and thinking tokens count against max_tokens; keep it short
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
      }),
      // answer with a readable error before Vercel's own time limit kills the function
      signal: AbortSignal.timeout(8000)
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
    return json({
      beneficiary: parsed.beneficiary || null,
      items: Array.isArray(parsed.items) ? parsed.items : []
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return json({ error: 'Groq did not answer within 8 seconds' }, 504);
    }
    return json({ error: 'Internal Server Error', details: error.message }, 500);
  }
}
