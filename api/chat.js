module.exports = async function (req, res) {
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

  // Safe Body Parsing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  
  const message = body?.message;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 2. NEW API Key Check (Gemini)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "API Key Missing", 
      details: "The GEMINI_API_KEY is not set in Vercel Environment Variables." 
    });
  }

  // AI Persona
  const systemPrompt = `
    You are an expert sales assistant for Kuldeep Singh Bisht, a premium freelance web developer.
    Recommend the Business Website Plan (₹18,000) and mention the April Special Discount.
    Push them to use the WhatsApp button. Keep it under 2-3 sentences.
  `;

  try {
    // 3. Call the Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        // Note: Gemini takes the key in the URL, so no 'Authorization' header is needed
      },
      // Gemini has a specific JSON structure for messages
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          parts: [{ text: message }]
        }],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: "Gemini API Rejected the Request", 
        details: data 
      });
    }

    // 4. Send AI reply back (Gemini's response path is different from Grok's)
    const aiReply = data.candidates[0].content.parts[0].text;
    
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(500).json({ 
      error: "Vercel Server Error", 
      details: error.message 
    });
  }
};
