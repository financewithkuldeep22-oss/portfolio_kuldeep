const FIREBASE_PROJECT_ID = "portfolio-tracker-55a47";
const FIRESTORE_BASE_URL  = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const { name, phone, email, source, timestamp } = body;

  if (!name) {
    return res.status(400).json({ error: "Name required" });
  }

  try {
    await fetch(`${FIRESTORE_BASE_URL}/contact_leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          name : { stringValue: name },
          phone: { stringValue: phone || "" },
          email: { stringValue: email || "" },
          source: { stringValue: source || "popup" },
          submittedAt: { timestampValue: timestamp }
        }
      })
    });

    return res.status(200).json({ success: true });

  } catch (e) {
    return res.status(500).json({ error: "Firestore error" });
  }
};
