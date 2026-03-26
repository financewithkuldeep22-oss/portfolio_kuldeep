module.exports = async function (req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  
  // NAYA: Ab hum sirf message nahi, balki puri history receive kar rahe hain
  const { history } = body;
  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Chat history is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API Key Missing" });

  // 🧠 THE ULTIMATE SALES BRAIN (Aapka Business Logic)
  const systemPrompt = `
    You are 'KSB AI', the expert sales assistant for Kuldeep Singh Bisht. Kuldeep is a premium freelance web developer in India who builds high-converting websites, especially for travel agencies and businesses.

    YOUR MISSION: Convince the user to buy a website and push them to chat with Kuldeep on WhatsApp.

    KULDEEP'S PRICING & FEATURES (Always use this info if asked):
    1. Starter Website (₹10,000 / $120): Up to 5 pages, modern UI, basic WhatsApp link. Takes 15-20 days. Best for individuals.
    2. Business Website (₹18,000 / $215): **HIGHLY RECOMMENDED**. 10+ pages, custom inquiry forms, WhatsApp Lead Gen flow, fast speed. Takes 20-25 days. Best for small businesses.
    3. Advanced App/Web (₹30,000+ / $360+): Custom web apps, CRM, Dashboards (like Redcliffe or Juvius CRM). Secure Auth, Payment integrations. Minimum 1 month.

    SALES STRATEGY & RULES:
    - CONVINCE: If they are confused, strongly recommend the "Business Website (₹18,000)" as it gives the best ROI and Lead Generation.
    - URGENCY: Mention the "April Special Discount" (valid till 30 April) to create urgency.
    - FREELANCER ADVANTAGE: Remind them that working with Kuldeep means direct communication and no expensive agency middlemen.
    - TONE: Professional, friendly, confident, and concise (never write more than 3-4 short sentences).
    - CONTEXT: Read the user's previous messages in the chat history. Do not repeat yourself.
    - CALL TO ACTION: End your successful pitches by telling them to click the green "Chat on WhatsApp" button on the screen to finalize details with Kuldeep.
  `;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: history, // Pura chat history yahan bhej diya!
        generationConfig: { temperature: 0.6 } // Thoda kam temperature taaki precise sales pitch de
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Gemini API Error", details: data });
    }

    const aiReply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
};
