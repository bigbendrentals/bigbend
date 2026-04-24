import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
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

const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastDays: 1,
      lastCategory: null,
      lastCategoryItems: []
    };
  }
  return stateStore[senderId];
}

function normalizeCategory(category) {
  if (!category) return null;
  const c = category.toLowerCase();

  if (c.includes("scissor")) return "scissor_lift";
  if (c.includes("boom")) return "boom_lift";
  if (c.includes("skid")) return "skid_steer";
  if (c.includes("auger")) return "auger";

  return c;
}

function categoryIds(category) {
  const key = normalizeCategory(category);
  if (!key) return [];

  if (CATEGORY_ITEMS?.[key]) return CATEGORY_ITEMS[key];

  return Object.keys(EQUIPMENT).filter(id => {
    const name = EQUIPMENT[id].name.toLowerCase();
    return name.includes(key);
  });
}

function formatOptions(ids) {
  return ids.map(id => {
    const item = EQUIPMENT[id];
    const parts = [];

    if (item.day) parts.push(`${money(item.day)}/day`);
    if (item.week) parts.push(`${money(item.week)}/week`);
    if (item.month) parts.push(`${money(item.month)}/month`);

    return `• ${item.name} — ${parts.join(", ")}`;
  }).join("\n");
}

function getDays(message, state) {
  const t = normalize(message);

  if (t.includes("month")) return 30;
  if (t.includes("week")) return 7;

  return parseDays(message) || state.lastDays || 1;
}

function getRentalAmount(item, days) {
  if (days >= 30 && item.month) return item.month;
  if (days >= 7 && item.week) {
    const weeks = Math.floor(days / 7);
    const extra = days % 7;
    return (weeks * item.week) + (extra * (item.day || 0));
  }
  return (item.day || 0) * days;
}

function getTrailerCost(days) {
  if (days <= 1) return 49.99;
  return 49.99 + ((days - 1) * 15);
}

function itemBasicText(item) {
  const parts = [];

  if (item.day) parts.push(`${money(item.day)}/day`);
  if (item.week) parts.push(`${money(item.week)}/week`);
  if (item.month) parts.push(`${money(item.month)}/month`);

  let text = `${item.name} is ${parts.join(", ")}.`;

  if (item.category === "scissor_lift") {
    text += " These are slab scissor lifts, not rough-terrain scissor lifts.";
  }

  if (item.protection) {
    text += " Rental Protection Plan is required on that machine.";
  }

  return text;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const category = findCategory(message);

  const selectedItem = explicit ? EQUIPMENT[explicit.id] : (state.lastItemId ? EQUIPMENT[state.lastItemId] : null);

  if (explicit) {
    state.lastItemId = explicit.id;
  }

  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);

  // =========================
  // PRICE + DELIVERY COMBINED
  // =========================
  if (isPriceQuestion(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    const rental = getRentalAmount(item, days);
    const deliveryFee = delivery ? delivery.fee : 0;

    const subtotal = rental + deliveryFee;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    const lines = [
      `${item.name} total for ${days === 30 ? "a month" : days === 7 ? "a week" : `${days} day(s)`}${delivery ? ` delivered to ${delivery.placeLabel}` : ""}:`,
      "",
      `Rental: ${money(rental)}`
    ];

    if (delivery) lines.push(`Delivery: ${money(deliveryFee)}`);

    lines.push(
      `Subtotal: ${money(subtotal)}`,
      `Sales Tax (7%): ${money(tax)}`,
      `Total: ${money(total)}`,
      "",
      "Want me to reserve it for you?"
    );

    return lines.join("\n");
  }

  // =========================
  // DELIVERY ONLY
  // =========================
  if (wantsDelivery) {
    if (delivery) {
      return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`;
    }
    return "We deliver within about a 75-mile radius. What city are you in?";
  }

  // =========================
  // CATEGORY LIST
  // =========================
  if (category && !explicit) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // =========================
  // MULTI MATCH
  // =========================
  if (matches.length > 1 && !explicit) {
    state.lastCategoryItems = matches;
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  // =========================
  // ITEM DETAILS
  // =========================
  if (selectedItem) {
    return itemBasicText(selectedItem);
  }

  return "Can you clarify what you're looking to rent?";
}

// =========================
// SEND MESSAGE
// =========================
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

// =========================
// WEBHOOK
// =========================
app.post("/webhook", async (req, res) => {
  const body = req.body;

  for (const entry of body.entry || []) {
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

// =========================
// VERIFY
// =========================
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
