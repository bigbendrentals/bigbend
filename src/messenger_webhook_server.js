// FULL CLEAN FILE WITH FIXED "MORE INFO" LOGIC

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
      lastDays: 1,
      lastCategoryItems: [],
      lastDeliveryFee: 0,
      lastDeliveryPlace: null,
      awaitingDeliveryLocation: false
    };
  }
  return stateStore[senderId];
}

function formatOptions(ids) {
  return ids.map(id => {
    const item = EQUIPMENT[id];
    if (!item) return null;

    const parts = [];
    if (item.day) parts.push(`${money(item.day)}/day`);
    if (item.week) parts.push(`${money(item.week)}/week`);
    if (item.month) parts.push(`${money(item.month)}/month`);

    return `• ${item.name}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
  }).filter(Boolean).join("\n");
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

  if (item.details && item.details.trim() && item.details !== item.name) {
    text += ` ${item.details}`;
  }

  return text;
}

function itemMoreInfoText(item) {
  const keyword = item.keyword || item.name;
  const details = item.details || "";

  if (!details.trim() || details.trim() === item.name.trim()) {
    return `For more information, check the website at www.bigbendrentals.net and search "${keyword}".`;
  }

  return `${item.name}: ${details}`;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);

  if (matches.length > 1) {
    state.lastCategoryItems = matches;
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  const selectedId = explicit?.id || state.lastItemId;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem) state.lastItemId = selectedId;

  if (
    selectedItem &&
    containsAny(normalize(message), ["more about", "more info", "tell me more", "details", "info about"])
  ) {
    return itemMoreInfoText(selectedItem);
  }

  if (selectedItem) {
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
