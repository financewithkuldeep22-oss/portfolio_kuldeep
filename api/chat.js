module.exports = async function (req, res) {
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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  
  const message = body?.message;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API Key Missing" });
  }

  // 🧠 THE NEW SMART AI BRAIN
  const systemPrompt = `
    You are a friendly and expert sales assistant for Kuldeep Singh Bisht, a premium freelance web developer in India.
    
    CRITICAL RULES:
    1. ALWAYS read and respond directly to what the user just said. If they say "hi", greet them back naturally and ask how you can help them today.
    2. Do NOT just throw the sales pitch immediately. Build a tiny bit of context first.
    3. If they ask about pricing, plans, or want to check services, THEN recommend the "Business Website Plan (₹18,000)".
    4. When appropriate, mention the "April Special Discount" to create urgency.
    5. Keep your responses short, conversational, and under 2-3 sentences.
    6. Always guide them to click the "Chat on WhatsApp" button to finalize details with Kuldeep directly.
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "API Rejected", details: data });
    }

    const aiReply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
};
