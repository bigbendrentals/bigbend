import express from "express";
import bodyParser from "body-parser";
import { reply } from "./intent.js";

const app = express();
app.use(bodyParser.json());

// ------------------------
// CONFIG
// ------------------------

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PORT = process.env.PORT || 10000;

// ------------------------
// VERIFY WEBHOOK
// ------------------------

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

// ------------------------
// HANDLE MESSAGES
// ------------------------

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object === "page") {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            const senderId = event.sender.id;
            const messageText = event.message.text;

            console.log("Incoming:", messageText);

            const response = reply(messageText, {}); // state not persisted yet

            await sendText(senderId, response.text);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// ------------------------
// SEND MESSAGE
// ------------------------

async function sendText(recipientId, text) {
  if (!text || typeof text !== "string") {
    console.error("Invalid text passed to sendText:", text);
    return;
  }

  // Messenger has ~2000 char limit — split safely
  const chunks = splitMessage(text);

  for (const chunk of chunks) {
    await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: chunk },
      }),
    });
  }
}

// ------------------------
// SAFE MESSAGE SPLITTER
// ------------------------

function splitMessage(text) {
  if (!text) return [];

  const max = 1800;
  const chunks = [];

  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + max));
    i += max;
  }

  return chunks;
}

// ------------------------
// START SERVER
// ------------------------

app.listen(PORT, () => {
  console.log(`Messenger webhook listening on port ${PORT}`);
});
