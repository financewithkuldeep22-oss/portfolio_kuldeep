export default async function handler(req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 2. Security Check: Is the Vercel API Key actually loading?
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "API Key Missing", 
      details: "The GROK_API_KEY is not set in Vercel Environment Variables." 
    });
  }

  const systemPrompt = `
    You are an expert sales assistant for Kuldeep Singh Bisht, a premium freelance web developer.
    Recommend the Business Website Plan (₹18,000) and mention the April Special Discount.
    Push them to use the WhatsApp button. Keep it under 2-3 sentences.
  `;

  try {
    // 3. Direct Call to Grok's primary stable model
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "grok-2-latest", // Standard, most stable x.ai model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // 4. IF GROK REJECTS IT, SEND THE EXACT ERROR TO THE FRONTEND
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Grok API Rejected the Request", 
        details: data 
      });
    }

    // 5. SUCCESS! Send the AI reply back
    const aiReply = data.choices[0].message.content;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(500).json({ 
      error: "Vercel Server Error", 
      details: error.message 
    });
  }
}
