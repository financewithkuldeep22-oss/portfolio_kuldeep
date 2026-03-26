export default async function handler(req, res) {
  // 1. Check HTTP Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  // 2. Validate input
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 3. Check if API Key exists in environment
  if (!process.env.GROK_API_KEY) {
    console.error("Missing GROK_API_KEY in environment variables.");
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta', 
        messages: [
          {
            role: 'system',
            content: "You are a sales assistant. Convince user to buy website and redirect to WhatsApp."
          },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();

    // 4. Handle Grok API Errors (e.g., 401 Unauthorized, 429 Rate Limit)
    if (!response.ok) {
      console.error("Grok API Error Details:", data); // Vercel logs mein dikhega
      return res.status(response.status).json({ 
        error: 'Grok API returned an error', 
        details: data 
      });
    }

    console.log("Grok Success Response:", data); // 👈 DEBUG

    // 5. Extract Reply
    let reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "No response";

    return res.status(200).json({ reply });

  } catch (error) {
    // Ye tab run hoga jab network/fetch fail ho
    console.error("Internal Server Error:", error);
    return res.status(500).json({ error: 'Internal server error while connecting to Grok' });
  }
}
