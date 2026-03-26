module.exports = async function (req, res) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle body parsing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  const message = body?.message;

  // 2. Check API Key
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    // Return 200 so the chatbot speaks the error!
    return res.status(200).json({ reply: "🚨 DEBUG: Vercel Environment Variable mein GROK_API_KEY missing hai." });
  }

  try {
    // 3. Call Grok API
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: "grok-2-latest", 
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: message || "Hello" }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    // 4. THE MAGIC: Agar Grok reject kare, toh exact reason screen par dikhao
    if (!response.ok) {
      let exactError = data.error?.message || data.error || JSON.stringify(data);
      return res.status(200).json({ 
        reply: `🚨 Grok API ne reject kiya. Reason: ${exactError}` 
      });
    }

    // 5. Success
    const aiReply = data.choices[0].message.content;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    return res.status(200).json({ reply: `🚨 Server Crash Error: ${error.message}` });
  }
};
