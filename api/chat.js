// ─────────────────────────────────────────────────────────────
//  KSB Portfolio — Vercel Serverless Function
//  /api/chat.js
//  Features: Bilingual Gemini AI (Hindi+English) + Firestore
// ─────────────────────────────────────────────────────────────

const FIREBASE_PROJECT_ID = "portfolio-tracker-55a47";
const FIRESTORE_BASE_URL  = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── FIRESTORE: Save Chat Lead ───
async function saveLeadToFirestore(userMessage, botReply) {
  try {
    await fetch(`${FIRESTORE_BASE_URL}/chat_leads`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        fields: {
          userMessage: { stringValue: userMessage },
          botReply   : { stringValue: botReply    },
          timestamp  : { timestampValue: new Date().toISOString() },
          source     : { stringValue: "portfolio_chatbot" }
        }
      })
    });
  } catch (e) {
    console.error("Firestore lead error:", e.message);
  }
}

// ─── FIRESTORE: Visitor Counter ───
async function incrementVisitorCount() {
  try {
    const docUrl = `${FIRESTORE_BASE_URL}/analytics/visitor_count`;
    const getRes = await fetch(docUrl);

    if (getRes.status === 404) {
      await fetch(docUrl, {
        method : "PATCH",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ fields: { count: { integerValue: "1" } } })
      });
    } else {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
        {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({
            writes: [{
              transform: {
                document       : `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/analytics/visitor_count`,
                fieldTransforms: [{ fieldPath: "count", increment: { integerValue: "1" } }]
              }
            }]
          })
        }
      );
    }
  } catch (e) {
    console.error("Visitor count error:", e.message);
  }
}

// ─── MAIN HANDLER ───
module.exports = async function (req, res) {

  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) {} }

  const { history } = body;
  if (!history || !Array.isArray(history) || history.length === 0)
    return res.status(400).json({ error: "Valid chat history required" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing" });

  const systemPrompt = `
Tu "KSB AI" hai — Kuldeep Singh Bisht ka personal sales assistant aur web development expert.

══════════════════════════════════════
LANGUAGE RULE (SABSE ZAROORI)
══════════════════════════════════════
- Agar user HINDI ya HINGLISH mein baat kare → SIRF HINDI mein reply kar
- Agar user ENGLISH mein baat kare → SIRF ENGLISH mein reply kar
- Kabhi dono language mix mat karna ek reply mein
- Simple, natural language — jaise ek smart dost baat karta hai

══════════════════════════════════════
KULDEEP KE BAARE MEIN
══════════════════════════════════════
- Naam: Kuldeep Singh Bisht
- Kaam: Premium Freelance Web Developer, India
- Speciality: High-converting websites, Travel agencies, Business portals, CRM & Dashboards
- Real Projects:
  * Redcliffe Labs — enterprise dashboard (restricted)
  * Juvius Healthcare CRM — live at partner.juviushealthcare.in
  * Medibuddy — internal automation tool (restricted)
- Advantage: Direct baat, no agency middleman, agencies se 5x sasta, 3x faster delivery

══════════════════════════════════════
PRICING (April 2025 Special Offer)
══════════════════════════════════════

STARTER — Rs.10,000 (Original Rs.15,000 — Rs.5,000 OFF!)
  - 5 pages, modern UI/UX
  - Basic WhatsApp link
  - Mobile responsive
  - 15-20 din delivery
  - Best for: Individuals, freelancers

BUSINESS — Rs.18,000 (Original Rs.22,000 — Rs.4,000 OFF!) ← RECOMMEND THIS ALWAYS
  - 10+ pages + content system
  - Custom inquiry forms
  - WhatsApp Lead Generation Flow (auto lead capture)
  - Speed optimization + SEO ready
  - 20-25 din delivery
  - Best for: Travel agencies, small businesses, service providers
  - WHY: Directly leads generate karta hai, sabse zyada ROI

ADVANCED APP — Rs.30,000+ (Original Rs.40,000+ — Rs.10,000+ OFF!)
  - Full-stack custom web application
  - User authentication + roles
  - Payment gateway (Razorpay/UPI)
  - CRM, dashboards, APIs
  - Minimum 1 mahina
  - Best for: Enterprises, SaaS, scaling businesses

══════════════════════════════════════
CURRENT OFFER DETAILS
══════════════════════════════════════
- April Special Discount — SIRF 30 APRIL TAK VALID!
- Har mahine sirf limited slots hain — scarcity real hai
- 50% advance pe kaam shuru, 50% delivery par
- Domain + Hosting client khareedata hai (100% ownership milti hai)
- Kuldeep setup mein free help karta hai

══════════════════════════════════════
SALES RULES
══════════════════════════════════════

1. RECOMMEND BUSINESS PLAN: Agar user confused ho → hamesha Business Website Rs.18,000 recommend kar
2. URGENCY: Hamesha "30 April tak offer hai" mention kar
3. PROBLEM-SOLUTION: User ka business/problem samjh aur uska specific solution batao
   - Travel agency? "Lead gen flow se directly inquiries WhatsApp pe aayengi"
   - New business? "Starter se shuru karo, baad mein upgrade kar sakte ho"
   - Already website hai? "Purani site upgrade karni chahiye — conversion rate badhega"
4. AGENCY COMPARISON:
   - Agency: Rs.1-2 lakh + 3-4 mahine + account manager overhead
   - Kuldeep: Rs.18,000 + 25 din + direct communication
5. OBJECTIONS:
   - "Bahut mahanga hai" → "April offer mein Rs.4,000 ki bachat hai. Original Rs.22,000 tha!"
   - "Sochna hai" → "Bilkul socho, but offer 30 April tak hi hai. Slot bhi limited hain."
   - "Khud bana lunga" → "Apna time zyada valuable hai. Professional site se 3x zyada leads aate hain."
   - "Koi agency hai" → "Agency mein 1.5 lakh+ lagega. Main same quality 25 din mein Rs.18k mein deta hoon."
6. CALL TO ACTION: "Abhi screen par green WhatsApp button click karo aur Kuldeep se directly baat karo!"
7. TONE: Friendly expert — 3-4 lines max per reply, concise aur impactful
8. MEMORY: Pichli baatein yaad rakho, khud repeat mat karo

══════════════════════════════════════
CONTACT
══════════════════════════════════════
WhatsApp/Call: +91 7505122769
Email: kuldeepsbisht22@gmail.com
  `;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents         : history,
        generationConfig : {
          temperature    : 0.75,
          maxOutputTokens: 300
        }
      })
    });

    const geminiData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini Error:", JSON.stringify(geminiData));
      return res.status(geminiResponse.status).json({ error: "Gemini API Error", details: geminiData });
    }

    const aiReply = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiReply) return res.status(500).json({ error: "Empty reply from Gemini" });

    const userMessage = history[history.length - 1]?.parts?.[0]?.text || "Unknown";
    Promise.all([
      saveLeadToFirestore(userMessage, aiReply),
      incrementVisitorCount()
    ]).catch(e => console.error("Firebase error:", e));

    return res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};
