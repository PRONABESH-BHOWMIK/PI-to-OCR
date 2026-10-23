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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Vercel' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(JSON.stringify({ 
        error: `Gemini API failed: ${response.status}`, 
        details: errorData.error?.message || 'Unknown error' 
      }), { 
        status: response.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const data = await response.json();
    const formattedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No formatted output returned.';
    
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
