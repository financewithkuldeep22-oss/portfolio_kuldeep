// ─────────────────────────────────────────────────────────────
//  KSB Portfolio — Vercel Serverless Function
//  /api/chat.js
//  Features: Gemini AI (with memory) + Firestore Lead Logger
// ─────────────────────────────────────────────────────────────

// ─── FIREBASE CONFIG ───
const FIREBASE_PROJECT_ID = "portfolio-tracker-55a47";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── FIRESTORE: Save Chat Lead (REST API — no SDK needed) ───
async function saveLeadToFirestore(userMessage, botReply) {
  try {
    const url = `${FIRESTORE_BASE_URL}/chat_leads`;

    const document = {
      fields: {
        userMessage:  { stringValue: userMessage },
        botReply:     { stringValue: botReply },
        timestamp:    { timestampValue: new Date().toISOString() },
        source:       { stringValue: "portfolio_chatbot" }
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document)
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("❌ Firestore Save Error:", JSON.stringify(errData));
    } else {
      console.log("✅ Lead saved to Firestore!");
    }
  } catch (e) {
    // Lead saving fail hone par main chat flow NAHI rukta
    console.error("❌ Firestore fetch error:", e.message);
  }
}

// ─── FIRESTORE: Visitor Counter (Atomic Increment via REST) ───
async function incrementVisitorCount() {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/analytics/visitor_count`;

    // Pehle check karo doc exist karta hai ya nahi
    const getRes = await fetch(docUrl);
    
    if (getRes.status === 404) {
      // Pehli baar — doc create karo count = 1 se
      await fetch(docUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { count: { integerValue: "1" } }
        })
      });
    } else {
      // Doc exist karta hai — transform se atomic increment karo
      const transformUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
      
      await fetch(transformUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writes: [{
            transform: {
              document: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/analytics/visitor_count`,
              fieldTransforms: [{
                fieldPath: "count",
                increment: { integerValue: "1" }
              }]
            }
          }]
        })
      });
    }
    console.log("✅ Visitor count updated!");
  } catch (e) {
    console.error("❌ Visitor count error:", e.message);
  }
}

// ─── MAIN HANDLER ───
module.exports = async function (req, res) {

  // ─── CORS HEADERS ───
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // ─── REQUEST BODY PARSE ───
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }

  const { history } = body;
  if (!history || !Array.isArray(history) || history.length === 0) {
    return res.status(400).json({ error: 'Valid chat history array is required' });
  }

  // ─── ENV CHECK ───
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY environment variable missing" });

  // ─── SYSTEM PROMPT (SALES BRAIN) ───
  const systemPrompt = `
    You are 'KSB AI', the expert sales assistant for Kuldeep Singh Bisht.
    Kuldeep is a premium freelance web developer in India who builds high-converting
    websites, especially for travel agencies and businesses.

    YOUR MISSION: Convince the user to buy a website and push them to chat with
    Kuldeep on WhatsApp.

    KULDEEP'S PRICING & FEATURES (Always use this info if asked):
    1. Starter Website (₹10,000):
       - Up to 5 pages, modern UI, basic WhatsApp link.
       - Delivery: 15-20 days. Best for individuals.

    2. Business Website (₹18,000) — **HIGHLY RECOMMENDED**:
       - 10+ pages, custom inquiry forms, WhatsApp Lead Gen flow, fast speed.
       - Delivery: 20-25 days. Best for small businesses. Best ROI.

    3. Advanced App/Web (₹30,000+):
       - Custom web apps, CRM, Dashboards (like Redcliffe or Juvius CRM).
       - Secure Auth, Payment integrations. Minimum 1 month.

    SALES STRATEGY & RULES:
    - CONVINCE: If confused, strongly recommend "Business Website (₹18,000)" for best ROI.
    - URGENCY: Always mention the "April Special Discount" (valid till 30 April).
    - ADVANTAGE: Remind them — direct communication, no agency middlemen, faster delivery.
    - TONE: Professional, friendly, confident, concise (max 3-4 short sentences per reply).
    - MEMORY: Read the user's previous messages. Do NOT repeat yourself.
    - CALL TO ACTION: End pitches by telling them to click the green "Chat on WhatsApp"
      button on the screen to finalize details with Kuldeep.
  `;

  try {
    // ─── GEMINI API CALL ───
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: history,
        generationConfig: { temperature: 0.6 }
      })
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini Error:", JSON.stringify(geminiData));
      return res.status(geminiResponse.status).json({
        error: "Gemini API Error",
        details: geminiData
      });
    }

    const aiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiReply) {
      return res.status(500).json({ error: "Empty reply from Gemini" });
    }

    // ─── FIREBASE: Save lead + count visitor (parallel, non-blocking) ───
    const userMessage = history[history.length - 1]?.parts?.[0]?.text || "Unknown";

    Promise.all([
      saveLeadToFirestore(userMessage, aiReply),
      incrementVisitorCount()
    ]).catch(e => console.error("Firebase background task error:", e));
    // NOTE: We do NOT await these — chat reply goes to user instantly

    // ─── SEND REPLY ───
    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
