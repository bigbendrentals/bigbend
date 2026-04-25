// FIXED FILE WITH CONTEXT RESOLUTION (STIHL ISSUE FIXED)

import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
  containsAny,
  findEquipment,
  findAllEquipment,
  findCategory,
  isTrailerQuestion,
  wantsTrailerAddedToTotal,
  isPriceQuestion,
  parseDays,
  isDeliveryQuestion,
  deliveryInfo
} from "./intent.js";

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PORT = process.env.PORT || 10000;

const RESERVE_TEXT = "To reserve, call 850-295-5373 during business hours or book online at www.bigbendrentals.net.";

const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastCategoryItems: []
    };
  }
  return stateStore[senderId];
}

// 🔧 CONTEXT RESOLVER (THIS FIXES YOUR ISSUE)
function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const text = normalize(message);

  return ids.find(id => {
    const item = EQUIPMENT[id];
    if (!item) return false;

    const haystack = `${item.name} ${(item.aliases || []).join(" ")}`.toLowerCase();

    return haystack.includes(text);
  }) || null;
}

function formatOptions(ids) {
  return ids.map(id => {
    const item = EQUIPMENT[id];
    if (!item) return null;

    const parts = [];
    if (item.day) parts.push(`${money(item.day)}/day`);
    if (item.week) parts.push(`${money(item.week)}/week`);

    return `• ${item.name} — ${parts.join(", ")}`;
  }).filter(Boolean).join("\n");
}

function itemBasicText(item) {
  let text = `${item.name} is ${money(item.day)}/day.`;

  if (item.details) {
    text += ` ${item.details}`;
  }

  return text;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const contextualId = resolveFromLastOptions(message, state);

  if (matches.length > 1) {
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  const selectedId = contextualId || explicit?.id || state.lastItemId;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem) {
    state.lastItemId = selectedId;
    return itemBasicText(selectedItem);
  }

  return "Can you clarify what you're looking to rent?";
}

async function sendMessage(senderId, text) {
  await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      recipient: { id: senderId },
      message: { text }
    })
  });
}

app.post("/webhook", async (req, res) => {
  for (const entry of req.body.entry || []) {
    for (const event of entry.messaging || []) {
      const senderId = event.sender?.id;
      const message = event.message?.text;

      if (senderId && message) {
        const reply = handleMessage(message, senderId);
        await sendMessage(senderId, reply);
      }
    }
  }
  res.sendStatus(200);
});

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.listen(PORT, () => console.log("Running..."));
