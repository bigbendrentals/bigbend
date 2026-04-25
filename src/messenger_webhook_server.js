// messenger_webhook_server.js (FIXED DIRECT MATCH)

import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
  containsAny,
  findEquipment,
  findAllEquipment,
  findCategory
} from "./intent.js";

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PORT = process.env.PORT || 10000;

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

// FIXED DIRECT MATCH
function resolveDirectNamedItem(message) {
  const t = normalize(message);

  const directMap = [
    { terms: ["stihl"], idContains: "stihl" },
    { terms: ["bt131"], idContains: "bt131" },
    { terms: ["blue diamond"], idContains: "blue diamond" },
    { terms: ["gs1930"], idContains: "gs1930" },
    { terms: ["gs3246"], idContains: "gs3246" },
    { terms: ["et500", "jlg"], idContains: "et500" },
    { terms: ["z45"], idContains: "z45" },
    { terms: ["boxer"], idContains: "boxer" }
  ];

  for (const rule of directMap) {
    const matched = rule.terms.some(term => t.includes(term));
    if (matched) {
      const found = Object.keys(EQUIPMENT).find(id => {
        const haystack = `${EQUIPMENT[id].name} ${(EQUIPMENT[id].aliases || []).join(" ")}`.toLowerCase();
        return haystack.includes(rule.idContains);
      });
      if (found) return found;
    }
  }

  return null;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const direct = resolveDirectNamedItem(message);
  if (direct) {
    const item = EQUIPMENT[direct];
    state.lastItemId = direct;
    return `${item.name} is $${item.day}/day.`;
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
      messaging_type: "RESPONSE",
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
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.listen(PORT, () => console.log("running"));
