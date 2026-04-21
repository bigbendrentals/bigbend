import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

// ===== SIMPLE TEST REPLY (we’ll plug your full AI back in after this works) =====
function reply(message) {
  const text = message.toLowerCase();

  if (text.includes("skid")) {
    return "Yes, we have skid steers. What are you trying to do with it?";
  }

  if (text.includes("excavator")) {
    return "We have mini and mid-size excavators available.";
  }

  return "Tell me what equipment you need and I’ll help you out.";
}

// ===== VERIFY WEBHOOK =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ===== HANDLE MESSAGES =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object === "page") {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            const senderId = event.sender.id;
            const messageText = event.message.text;

            const responseText = reply(messageText);

            await fetch(
              "https://graph.facebook.com/v18.0/me/messages",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                  recipient: { id: senderId },
                  message: { text: responseText },
                }),
              }
            );
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
