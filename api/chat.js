export default async function handler(req, res) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 2. The AI Sales Persona (System Prompt)
  const systemPrompt = `
    You are an expert sales assistant for Kuldeep Singh Bisht, a premium freelance web developer specializing in high-converting websites for travel agencies and businesses.
    
    Your goal is to understand the client's needs, build trust, and recommend the best plan. 
    
    Kuldeep's Plans:
    1. Starter Website: ₹10,000 (Best for individuals, 5 pages)
    2. Business Website: ₹18,000 (Best for small businesses, WhatsApp lead flow, highly recommended)
    3. Advanced App/Web: ₹30,000+ (Best for scaling, custom dashboards like the Redcliffe or Juvius CRM projects)
    
    Rules:
    - Keep responses concise, professional, and friendly. Do not write long paragraphs.
    - Ask ONE clarifying question if needed to understand their business.
    - Create urgency: Mention the "April Special Discount" valid only until April 30th.
    - Push to conversion: Always encourage them to use the WhatsApp button to finalize details directly with Kuldeep.
    - Never mention that you are an AI from x.ai or Grok. You are "Kuldeep's AI Assistant".
  `;

  try {
    // 3. Call the Grok API
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}` 
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7, // Keeps it creative but focused on sales
        max_tokens: 150   // Keeps responses short and punchy
      })
    });

    const data = await response.json();

    // 4. Handle API-side errors gracefully
    if (!response.ok) {
      console.error("Grok API Error:", data);
      return res.status(response.status).json({ 
        error: "Grok API error", 
        details: data 
      });
    }

    // 5. Send the successful reply back to the frontend
    const aiReply = data.choices[0].message.content;
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
