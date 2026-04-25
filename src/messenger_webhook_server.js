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
      lastCategoryItems: [],
      lastDeliveryFee: 0,
      lastDeliveryPlace: null
    };
  }
  return stateStore[senderId];
}

function normalizeCategory(category) {
  if (!category) return null;
  const c = String(category).toLowerCase();

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
    const item = EQUIPMENT[id];
    const haystack = `${item?.name || ""} ${(item?.aliases || []).join(" ")} ${item?.category || ""} ${item?.details || ""}`.toLowerCase();
    return haystack.includes(key);
  });
}

function formatOptions(ids) {
  return [...new Set(ids)]
    .map(id => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      const parts = [];
      if (item.day) parts.push(`${money(item.day)}/day`);
      if (item.week) parts.push(`${money(item.week)}/week`);
      if (item.month) parts.push(`${money(item.month)}/month`);

      return `• ${item.name} — ${parts.join(", ")}`;
    })
    .filter(Boolean)
    .join("\n");
}

function getDays(message, state) {
  const t = normalize(message);

  if (t.includes("month") || t.includes("monthly")) return 30;
  if (t.includes("week") || t.includes("weekly")) return 7;

  return parseDays(message) || state.lastDays || 1;
}

function getRentalAmount(item, days) {
  if (days >= 30 && item.month) return item.month;

  if (days >= 7 && item.week) {
    const weeks = Math.floor(days / 7);
    const extraDays = days % 7;
    return weeks * item.week + extraDays * (item.day || 0);
  }

  return (item.day || 0) * days;
}

function getTrailerCost(days) {
  if (days <= 1) return 49.99;
  return 49.99 + (days - 1) * 15;
}

function itemBasicText(item) {
  const parts = [];

  if (item.day) parts.push(`${money(item.day)}/day`);
  if (item.week) parts.push(`${money(item.week)}/week`);
  if (item.month) parts.push(`${money(item.month)}/month`);

  let text = `${item.name} is ${parts.join(", ")}.`;

  if (item.category === "scissor_lift") {
    text += " These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.";
  }

  if (item.protection) {
    text += " Rental Protection Plan is required on that machine.";
  }

  if (item.details) {
    text += ` ${item.details}`;
  }

  return text;
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const category = findCategory(message);

  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);

  // CATEGORY LIST MUST COME BEFORE EXPLICIT ITEM MATCH
  // This prevents "do you have augers" from selecting the first auger.
  if (category && normalize(message).includes("do you have")) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  if (explicit?.id && EQUIPMENT[explicit.id]) {
    state.lastItemId = explicit.id;
  }

  const selectedItem = explicit?.id
    ? EQUIPMENT[explicit.id]
    : state.lastItemId
      ? EQUIPMENT[state.lastItemId]
      : null;

  // PRICE + DELIVERY / PRICE ONLY
  if (isPriceQuestion(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
    }

    const deliveryFee = delivery
      ? delivery.fee
      : wantsDelivery
        ? state.lastDeliveryFee || 0
        : 0;

    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;

    const rental = getRentalAmount(item, days);
    const subtotal = rental + deliveryFee;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    const durationLabel =
      days === 30 ? "a month" :
      days === 7 ? "a week" :
      `${days} day(s)`;

    const lines = [
      `${item.name} total for ${durationLabel}${deliveryFee ? ` delivered to ${deliveryPlace || "that area"}` : ""}:`,
      "",
      `Rental: ${money(rental)}`
    ];

    if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);

    lines.push(
      `Subtotal: ${money(subtotal)}`,
      `Sales Tax (7%): ${money(tax)}`,
      `Total: ${money(total)}`,
      "",
      "To reserve, call 850-295-5373 during business hours or book online at www.bigbendrentals.net."
    );

    return lines.join("\n");
  }

  // DELIVERY ONLY
  if (wantsDelivery) {
    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`;
    }

    if (state.lastDeliveryFee) {
      return `Yes, we can deliver. The last delivery area quoted was ${state.lastDeliveryPlace || "that area"} at ${money(state.lastDeliveryFee)}.`;
    }

    return "We deliver within about a 75-mile radius. What city or area are you in?";
  }

  // TRAILER TOTAL
  if (wantsTrailerAddedToTotal(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    const rental = getRentalAmount(item, days);
    const trailer = getTrailerCost(days);
    const subtotal = rental + trailer;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    return `${item.name} total for ${days === 7 ? "a week" : `${days} day(s)`} with trailer:

Rental: ${money(rental)}
Trailer: ${money(trailer)}
Subtotal: ${money(subtotal)}
Sales Tax (7%): ${money(tax)}
Total: ${money(total)}

To reserve, call 850-295-5373 during business hours or book online at www.bigbendrentals.net.`;
  }

  // TRAILER ONLY
  if (isTrailerQuestion(message)) {
    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
  }

  // CATEGORY LIST
  if (category && !explicit) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // MULTI-MATCH LIST
  if (matches.length > 1 && !explicit) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  // SINGLE ITEM
  if (selectedItem) {
    return itemBasicText(selectedItem);
  }

  return "Can you clarify what you're looking to rent?";
}
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const category = findCategory(message);

  if (explicit?.id && EQUIPMENT[explicit.id]) {
    state.lastItemId = explicit.id;
  }

  const selectedItem = explicit?.id
    ? EQUIPMENT[explicit.id]
    : state.lastItemId
      ? EQUIPMENT[state.lastItemId]
      : null;

  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);

  // PRICE + DELIVERY / PRICE ONLY
  if (isPriceQuestion(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
    }

    const deliveryFee = delivery
      ? delivery.fee
      : wantsDelivery
        ? state.lastDeliveryFee || 0
        : 0;

    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;

    const rental = getRentalAmount(item, days);
    const subtotal = rental + deliveryFee;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    const durationLabel =
      days === 30 ? "a month" :
      days === 7 ? "a week" :
      `${days} day(s)`;

    const lines = [
      `${item.name} total for ${durationLabel}${deliveryFee ? ` delivered to ${deliveryPlace || "that area"}` : ""}:`,
      "",
      `Rental: ${money(rental)}`
    ];

    if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);

    lines.push(
      `Subtotal: ${money(subtotal)}`,
      `Sales Tax (7%): ${money(tax)}`,
      `Total: ${money(total)}`,
      "",
      "To reserve, call 850-295-5373 during business hours or book online at www.bigbendrentals.net."
    );

    return lines.join("\n");
  }

  // DELIVERY ONLY
  if (wantsDelivery) {
    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`;
    }

    if (state.lastDeliveryFee) {
      return `Yes, we can deliver. The last delivery area quoted was ${state.lastDeliveryPlace || "that area"} at ${money(state.lastDeliveryFee)}.`;
    }

    return "We deliver within about a 75-mile radius. What city or area are you in?";
  }

  // TRAILER TOTAL
  if (wantsTrailerAddedToTotal(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    const rental = getRentalAmount(item, days);
    const trailer = getTrailerCost(days);
    const subtotal = rental + trailer;
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    return `${item.name} total for ${days === 7 ? "a week" : `${days} day(s)`} with trailer:

Rental: ${money(rental)}
Trailer: ${money(trailer)}
Subtotal: ${money(subtotal)}
Sales Tax (7%): ${money(tax)}
Total: ${money(total)}

Want me to reserve it for you?`;
  }

  // TRAILER ONLY
  if (isTrailerQuestion(message)) {
    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
  }

  // CATEGORY LIST
  if (category && !explicit) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // MULTI-MATCH LIST
  if (matches.length > 1 && !explicit) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  // SINGLE ITEM
  if (selectedItem) {
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
    const body = req.body;
    if (body.object !== "page") return res.sendStatus(404);

    for (const entry of body.entry || []) {
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

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(200);
  }
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.get("/", (_req, res) => {
  res.status(200).send("Messenger webhook is running.");
});

app.listen(PORT, () => {
  console.log(`Messenger webhook listening on port ${PORT}`);
});
