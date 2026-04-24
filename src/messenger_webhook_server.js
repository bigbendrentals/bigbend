import express from "express";
import { EQUIPMENT } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
  findEquipment,
  findAllEquipment,
  findCategory,
  isTrailerQuestion,
  wantsTrailerAddedToTotal,
  isPriceQuestion,
  parseDays
} from "./intent.js";

const app = express();
app.use(express.json());

/* =========================
   ENV
========================= */
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PORT = process.env.PORT || 10000;

/* =========================
   STATE MEMORY
========================= */
const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastDays: 1
    };
  }
  return stateStore[senderId];
}

/* =========================
   SEND MESSAGE
========================= */
async function sendMessage(senderId, text) {
  try {
    await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: senderId },
        messaging_type: "RESPONSE",
        message: { text }
      })
    });
  } catch (err) {
    console.error("Send error:", err);
  }
}

/* =========================
   FORMAT OPTIONS
========================= */
function formatOptions(ids) {
  return ids
    .map(id => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      let parts = [];
      if (item.day) parts.push(`${money(item.day)}/day`);
      if (item.week) parts.push(`${money(item.week)}/week`);
      if (item.month) parts.push(`${money(item.month)}/month`);

      return `• ${item.name} — ${parts.join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");
}

/* =========================
   TRAILER COST
========================= */
function getTrailerCost(days) {
  if (days <= 1) return 49.99;
  return 49.99 + (days - 1) * 15;
}

/* =========================
   MAIN LOGIC
========================= */
function handleMessage(message, senderId) {
  const text = normalize(message);
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);

  /* =========================
     CATEGORY HANDLING (NEW FIX)
  ========================= */
  const category = findCategory(message);

  if (category) {
    const ids = Object.keys(EQUIPMENT).filter(id =>
      EQUIPMENT[id].name.toLowerCase().includes(category)
    );

    if (ids.length > 0) {
      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  /* =========================
     MULTI MATCH
  ========================= */
  if (matches.length > 1 && !explicit) {
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  /* =========================
     SET CONTEXT
  ========================= */
  if (explicit) {
    state.lastItemId = explicit.id;
    return `${explicit.name} is ${money(explicit.day)} per day.`;
  }

  const item = state.lastItemId ? EQUIPMENT[state.lastItemId] : null;

  /* =========================
     TRAILER QUESTION
  ========================= */
  if (isTrailerQuestion(message)) {
    if (!item) return "Which machine are you planning to haul?";
    return "We can supply a trailer for $49.99 for the first day and $15 for each additional day.";
  }

  /* =========================
     TOTAL WITH TRAILER
  ========================= */
  if (wantsTrailerAddedToTotal(message)) {
    if (!item) return "Which machine are you referring to?";

    const days = parseDays(message) || state.lastDays || 1;
    state.lastDays = days;

    const rental = days >= 7 && item.week
      ? item.week
      : item.day * days;

    const trailer = getTrailerCost(days);

    const subtotal = rental + trailer;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    return `${item.name} total for ${days} day(s) with trailer:

Rental: ${money(rental)}
Trailer: ${money(trailer)}
Subtotal: ${money(subtotal)}
Sales Tax (7%): ${money(tax)}
Total: ${money(total)}

Want me to reserve it for you?`;
  }

  /* =========================
     TOTAL WITHOUT TRAILER
  ========================= */
  if (isPriceQuestion(message)) {
    if (!item) return "Which machine are you referring to?";

    const days = parseDays(message) || state.lastDays || 1;
    state.lastDays = days;

    const rental = days >= 7 && item.week
      ? item.week
      : item.day * days;

    return `${item.name} total for ${days} day(s) is ${money(rental)}.`;
  }

  return "Can you clarify what you're looking to rent?";
}

/* =========================
   WEBHOOK
========================= */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    const senderId = messaging?.sender?.id;
    const message = messaging?.message?.text;

    if (senderId && message) {
      console.log("Incoming:", message);

      const reply = handleMessage(message, senderId);

      console.log("Reply:", reply);

      await sendMessage(senderId, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

/* =========================
   VERIFY
========================= */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

/* =========================
   START
========================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
