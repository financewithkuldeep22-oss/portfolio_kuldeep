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

  // 2. API Key Check
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API Key Missing" });
  }

  // 3. AI Sales Prompt
  const systemPrompt = `
    You are an expert sales assistant for Kuldeep Singh Bisht, a premium freelance web developer specializing in high-converting websites.
    Recommend the Business Website Plan (₹18,000) and mention the April Special Discount.
    Push them to use the WhatsApp button to convert. Keep it under 2-3 sentences and friendly.
  `;

  try {
    // 4. Call Grok API (Updated to the active 2026 model)
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-non-reasoning", // <--- THE FINAL FIX: Newest Active Model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Grok Error:", data);
      return res.status(response.status).json({ error: "Grok API Error", details: data });
    }

    // 5. Success! Send AI reply
    const aiReply = data.choices[0].message.content;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
};
