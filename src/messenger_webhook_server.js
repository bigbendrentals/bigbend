import express from "express";
import bodyParser from "body-parser";
import {
  findEquipment,
  findAllEquipment,
  findCategory,
  hasExplicitIntentOverride,
  isTrailerQuestion,
  isReferentialFollowup,
  deliveryInfo
} from "./intent.js";

import { EQUIPMENT } from "./inventory.js";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// =========================
// HELPERS
// =========================

function money(n) {
  return `$${Number(n).toFixed(2)}`;
}

function normalize(text) {
  return (text || "").toLowerCase();
}

function containsAny(text, arr) {
  return arr.some(x => text.includes(x));
}

// SAFE SPLIT (fixes your crash)
function splitMessage(text, maxLength = 1800) {
  if (!text) return [""];

  const chunks = [];
  let current = "";

  for (const line of text.split("\n")) {
    if ((current + line).length > maxLength) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }

  if (current) chunks.push(current);

  return chunks;
}

function sendMessengerText(res, text) {
  const parts = splitMessage(text);
  parts.forEach(p => console.log("BOT:", p));
  res.json({ reply: parts });
}

// =========================
// FORMATTERS
// =========================

function formatMatchedOptions(ids) {
  const unique = [...new Set(ids)];

  return unique
    .map(id => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      const priceParts = [];
      if (item.day) priceParts.push(`${money(item.day)}/day`);
      if (item.week) priceParts.push(`${money(item.week)}/week`);
      if (item.month) priceParts.push(`${money(item.month)}/month`);

      const priceText = priceParts.length ? ` — ${priceParts.join(", ")}` : "";

      return `• ${item.name}${priceText}`;
    })
    .filter(Boolean)
    .join("\n");
}

// =========================
// STATE (simple memory)
// =========================

let state = {
  lastId: null,
  lastCategory: null,
  lastCategoryItems: [],
  lastDeliveryFee: 0,
  lastDeliveryPlace: null
};

function preserveContext(newState) {
  state = { ...state, ...newState };
}

// =========================
// MAIN REPLY LOGIC
// =========================

function reply(message) {
  const text = normalize(message);

  const explicitFound = findEquipment(message);
  const matchedIds = findAllEquipment(message);
  const category = findCategory(message);

  // =========================
  // MULTI-MATCH HANDLING (FIXED)
  // =========================
  if (
    matchedIds.length > 1 &&
    !containsAny(text, ["combo", "with skid steer", "package"])
  ) {
    const filtered = matchedIds.filter(id => {
      const name = EQUIPMENT[id].name.toLowerCase();

      if (text.includes("mini") && !name.includes("mini")) return false;
      if (text.includes("skid") && !name.includes("skid")) return false;
      if (text.includes("auger") && !name.includes("auger")) return false;

      return true;
    });

    const finalList = filtered.length ? filtered : matchedIds;

    preserveContext({
      lastCategory: "multi_match",
      lastCategoryItems: finalList
    });

    return `We have these options:\n\n${formatMatchedOptions(finalList)}\n\nWhich one are you interested in?`;
  }

  // =========================
  // SINGLE MATCH
  // =========================

  const id = explicitFound ? explicitFound.id : null;
  const item = id ? EQUIPMENT[id] : null;

  if (item) {
    preserveContext({ lastId: id });

    const priceParts = [];
    if (item.day) priceParts.push(`${money(item.day)}/day`);
    if (item.week) priceParts.push(`${money(item.week)}/week`);
    if (item.month) priceParts.push(`${money(item.month)}/month`);

    return `${item.name} is ${priceParts.join(", ")}.`;
  }

  // =========================
  // FALLBACK
  // =========================

  return "Sometimes my inventory database is incomplete, so you may need to check the website at www.bigbendrentals.net for that item.";
}

// =========================
// ROUTE
// =========================

app.post("/webhook", (req, res) => {
  try {
    const message = req.body.message || "";
    const response = reply(message);
    sendMessengerText(res, response);
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Error");
  }
});

// =========================

app.listen(PORT, () => {
  console.log(`Messenger webhook listening on port ${PORT}`);
});
