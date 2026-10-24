// api/describe.js
// Vercel web handler: export a function named after the HTTP method.
// (A plain `export default function handler(req)` that returns a Response is treated as a
// Node (req, res) handler, so the response is never sent and the request ends in a 504 timeout.)
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request) {
  try {
    const { ocrText } = await request.json();
    if (!ocrText || typeof ocrText !== 'string') {
      return json({ error: 'Missing or invalid ocrText' }, 400);
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: 'GROQ_API_KEY is not configured in Vercel' }, 500);
    }

    // llama-3.3-70b-versatile was shut down by Groq on 2026-08-16; this is Groq's recommended replacement
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const prompt = `Format this PI OCR text. Rules: 1 block per item, plain numbering, comma separated. Max 60 chars per line. Missing = N/A. Example: 1. ITEM NAME, QUANTITY : 5000 YDS, UNIT PRICE : USD 1.85/YDS, H.S. CODE : 5208.39.00. Output ONLY the formatted text. No markdown, no intro.

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
        temperature: 0.1,
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
    return json({ text: data.choices?.[0]?.message?.content || 'No formatted output returned.' });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return json({ error: 'Groq did not answer within 8 seconds' }, 504);
    }
    return json({ error: 'Internal Server Error', details: error.message }, 500);
  }
}
