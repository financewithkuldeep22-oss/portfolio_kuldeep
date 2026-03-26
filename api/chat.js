export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
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

    console.log("Grok response:", data); // 👈 DEBUG

    let reply =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "No response";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Grok API failed' });
  }
}
