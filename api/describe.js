// api/describe.js
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { ocrText } = await req.json();

    if (!ocrText || typeof ocrText !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid ocrText' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY is not configured in Vercel' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ 
        error: `Groq API failed: ${response.status}`, 
        details: errorData.error?.message || 'Unknown error' 
      }), { 
        status: response.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const data = await response.json();
    const formattedText = data.choices?.[0]?.message?.content || 'No formatted output returned.';
    
    return new Response(JSON.stringify({ text: formattedText }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
