// FIXED FILE: context selection + more-info website keyword + detail follow-ups before broad matching

import express from "express";
import { EQUIPMENT } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
  containsAny,
  findEquipment,
  findAllEquipment
} from "./intent.js";

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PORT = process.env.PORT || 10000;

const WEBSITE = "www.bigbendrentals.net";

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

function formatOptions(ids) {
  return [...new Set(ids)]
    .map((id) => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      const parts = [];
      if (item.day) parts.push(`${money(item.day)}/day`);
      if (item.week) parts.push(`${money(item.week)}/week`);
      if (item.month) parts.push(`${money(item.month)}/month`);

      return `• ${item.name}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}

function itemKeyword(item) {
  return item.keyword || item.searchKeyword || item.name;
}

function hasUsefulDetails(item) {
  const details = String(item.details || "").trim();
  if (!details) return false;

  const itemName = String(item.name || "").trim().toLowerCase();
  const normalizedDetails = details.toLowerCase();

  // Treat details that only repeat the name as not useful.
  if (normalizedDetails === itemName) return false;

  return true;
}

function itemBasicText(item) {
  const parts = [];
  if (item.day) parts.push(`${money(item.day)}/day`);
  if (item.week) parts.push(`${money(item.week)}/week`);
  if (item.month) parts.push(`${money(item.month)}/month`);

  let text = `${item.name}${parts.length ? ` is ${parts.join(", ")}.` : "."}`;

  if (item.protection) {
    text += " Rental Protection Plan is required on that machine.";
  }

  if (hasUsefulDetails(item)) {
    text += ` ${item.details}`;
  }

  return text;
}

function itemMoreInfoText(item) {
  if (!hasUsefulDetails(item)) {
    return `For more information, check the website at ${WEBSITE} and search "${itemKeyword(item)}".`;
  }

  return `${item.name}: ${item.details}`;
}

function isMoreInfoQuestion(message) {
  const t = normalize(message);
  return containsAny(t, [
    "more about",
    "more info",
    "tell me more",
    "details",
    "info about",
    "information",
    "what is it",
    "what does it do",
    "handheld",
    "hand held",
    "is this",
    "does it",
    "do it",
    "can it"
  ]);
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const text = normalize(message);
  if (!text) return null;

  return ids.find((id) => {
    const item = EQUIPMENT[id];
    if (!item) return false;

    const haystack = `${item.name || ""} ${(item.aliases || []).join(" ")} ${item.details || ""}`.toLowerCase();
    return haystack.includes(text);
  }) || null;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const contextualId = resolveFromLastOptions(message, state);
  const selectedId = contextualId || explicit?.id || state.lastItemId || null;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  // IMPORTANT: detail/more-info follow-ups must run BEFORE broad matching.
  // Otherwise "is this a handheld auger" sees "auger" and re-lists all augers.
  if (selectedItem && isMoreInfoQuestion(message)) {
    state.lastItemId = selectedId;
    return itemMoreInfoText(selectedItem);
  }

  const matches = findAllEquipment(message);

  if (matches.length > 1) {
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  if (selectedItem) {
    state.lastItemId = selectedId;
    return itemBasicText(selectedItem);
  }

  return "Can you clarify what you're looking to rent?";
}

async function sendMessage(senderId, text) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      recipient: { id: senderId },
      messaging_type: "RESPONSE",
      message: { text: String(text || "Can you clarify what you're looking to rent?") }
    })
  });

  const bodyText = await response.text();
  if (!response.ok) {
    console.error("Facebook send failed:", response.status, bodyText);
  }
}

app.post("/webhook", async (req, res) => {
  try {
    for (const entry of req.body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const message = event.message?.text;

        if (senderId && message) {
          console.log("Incoming:", message);
          const reply = handleMessage(message, senderId);
          console.log("Reply:", reply);
          await sendMessage(senderId, reply);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200);
  }
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

app.get("/", (_req, res) => {
  res.status(200).send("Messenger webhook is running.");
});

app.listen(PORT, () => {
  console.log(`Messenger webhook listening on port ${PORT}`);
});
