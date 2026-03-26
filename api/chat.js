export default async function handler(req, res) {
  // 1. CORS Headers (To fix the 405 OPTIONS error)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle the browser's preflight check
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 2. The AI Sales Persona
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

  // 3. Array of all possible Grok models to try
  const modelsToTry = [
    "grok-2-latest", 
    "grok-beta", 
    "grok-2", 
    "grok-1.5", 
    "grok-1"
  ];

  let aiReply = null;
  let lastErrorDetails = null;

  // 4. Try models one by one until one works
  for (const modelName of modelsToTry) {
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROK_API_KEY}` 
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          temperature: 0.7, 
          max_tokens: 150   
        })
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices.length > 0) {
        // Success! Get the reply and break out of the loop
        aiReply = data.choices[0].message.content;
        console.log(`Success with model: ${modelName}`);
        break; 
      } else {
        // Log the failure and let the loop try the next model
        console.log(`Model ${modelName} failed. Trying next...`);
        lastErrorDetails = data;
      }
    } catch (error) {
      console.log(`Network/Fetch error with model ${modelName}. Trying next...`);
      lastErrorDetails = error.message;
    }
  }

  // 5. Final Check
  if (aiReply) {
    return res.status(200).json({ reply: aiReply });
  } else {
    console.error("All Grok models failed.", lastErrorDetails);
    return res.status(500).json({ 
      error: "All Grok models failed", 
      details: lastErrorDetails 
    });
  }
}
