import express from "express";
import bodyParser from "body-parser";

import {
  findEquipment,
  findAllEquipment,
  findCategory,
  hasExplicitIntentOverride,
  isReferentialFollowup
} from "./intent.js";

import { EQUIPMENT, CATEGORY_ALIASES } from "./inventory.js";

const app = express();
app.use(bodyParser.json());

// ✅ CORRECT ENV VARIABLES
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";

// ---------------- HELPERS ----------------

function normalize(text) {
  return (text || "").toLowerCase();
}

function containsAny(text, arr) {
  return arr.some(w => text.includes(w));
}

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function parseDays(text) {
  const match = text.match(/(\d+)\s*day/);
  return match ? parseInt(match[1]) : null;
}

function splitMessage(text, maxLength = 1500) {
  if (!text) return [];

  const parts = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    parts.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }

  if (remaining.length) parts.push(remaining);

  return parts;
}

// ✅ FIXED SEND FUNCTION
async function sendMessengerText(psid, text) {
  const messages = splitMessage(text);

  for (const msg of messages) {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text: msg }
      })
    });
  }
}

// ---------------- CORE LOGIC ----------------

function formatMatchedOptions(ids) {
  const unique = [...new Set(ids)];

  return unique
    .map(id => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      let price = "";

      if (item.day) price += `${money(item.day)}/day`;
      if (item.week) price += `, ${money(item.week)}/week`;

      return `• ${item.name} — ${price}`;
    })
    .filter(Boolean)
    .join("\n");
}

function reply(message, state = {}) {
  const text = normalize(message);

  const explicitFound = findEquipment(message);
  const matchedIds = findAllEquipment(message);

  // 🔥 AUTO SELECT
  let selectedId = explicitFound?.id || null;

  if (!selectedId && matchedIds.length > 0) {
    if (matchedIds.length === 1) {
      selectedId = matchedIds[0];
    } else {
      const strongMatch = matchedIds.find(id => {
        const name = EQUIPMENT[id].name.toLowerCase();
        return text.split(" ").every(w => name.includes(w));
      });

      if (strongMatch) selectedId = strongMatch;
    }
  }

  const category = findCategory(message);

  // 🔥 MULTI MATCH FIX (NO LOOP)
  if (
    !selectedId &&
    matchedIds.length > 1 &&
    !containsAny(text, ["combo", "package", "with skid steer"])
  ) {
    return {
      text: `We have these options:\n\n${formatMatchedOptions(matchedIds)}\n\nWhich one are you interested in?`,
      state
    };
  }

  const id = selectedId || state.lastId || null;
  const item = id ? EQUIPMENT[id] : null;

  const days = parseDays(text) || 1;

  // 🔥 PRICING
  if (item) {
    let total = item.day * days;

    if (item.week && days >= 7) {
      const weeks = Math.floor(days / 7);
      const remainder = days % 7;
      total = weeks * item.week + remainder * item.day;
    }

    return {
      text: `${item.name} is ${money(item.day)}/day.\n\nFor ${days} day${days > 1 ? "s" : ""}, your total is ${money(total)}.`,
      state: { lastId: id }
    };
  }

  // CATEGORY
  if (category) {
    const ids = CATEGORY_ALIASES[category] || [];
    if (ids.length) {
      return {
        text: `We have these options:\n\n${formatMatchedOptions(ids)}\n\nWhich one are you interested in?`,
        state
      };
    }
  }

  return {
    text: "Sometimes my inventory database is incomplete, so you may need to check the website.",
    state
  };
}

// ---------------- WEBHOOK ----------------

app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    const senderId = messaging?.sender?.id;
    const messageText = messaging?.message?.text;

    if (!senderId || !messageText) return res.sendStatus(200);

    const response = reply(messageText);

    await sendMessengerText(senderId, response.text);

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(10000, () => {
  console.log("Messenger webhook listening on port 10000");
});
