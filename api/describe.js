// api/describe.js
export const config = {
  runtime: 'edge', // or 'nodejs' depending on your Vercel setup
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

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DASHSCOPE_API_KEY is not configured' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-flash';

    const prompt = `You are an expert data extraction assistant. Format the following raw OCR text from a Proforma Invoice into a specific plain text format. 

Rules:
- One block per item, plain numbering, comma separated.
- No line longer than 60 characters.
- Missing values must be shown as N/A.
- Example format: 
1. ITEM NAME, QUANTITY : 5000 YDS, UNIT PRICE : USD 1.85/YDS,
H.S. CODE : 5208.39.00.
- Output ONLY the formatted text. No markdown, no introductory conversation, no JSON wrappers.

Raw OCR Text:
${ocrText}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a precise data formatting assistant. Output only the requested plain text format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Provider error: ${response.status}`, details: errorText }), { 
        status: response.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { 
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
