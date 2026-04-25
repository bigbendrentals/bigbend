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

const RESERVE_TEXT = "To reserve, call 850-295-5373 during business hours or book online at www.bigbendrentals.net.";

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
  if (c.includes("mini")) return "mini_skid";
  if (c.includes("auger")) return "auger";
  if (c.includes("excavator")) return "excavator";
  if (c.includes("forklift")) return "forklift";
  if (c.includes("pressure")) return "pressure_washer";

  return c;
}

function categoryIds(category) {
  const key = normalizeCategory(category);
  if (!key) return [];

  if (CATEGORY_ITEMS?.[key]?.length) return CATEGORY_ITEMS[key];

  return Object.keys(EQUIPMENT).filter((id) => {
    const item = EQUIPMENT[id];
    const haystack = `${item?.name || ""} ${(item?.aliases || []).join(" ")} ${item?.category || ""} ${item?.details || ""}`.toLowerCase();

    if (key === "scissor_lift") return haystack.includes("scissor") || haystack.includes("gs1930") || haystack.includes("gs3246");
    if (key === "boom_lift") return haystack.includes("boom") || haystack.includes("z45") || haystack.includes("et500");
    if (key === "skid_steer") return haystack.includes("skid steer") || haystack.includes("skidsteer");
    if (key === "mini_skid") return haystack.includes("mini skid") || haystack.includes("boxer");
    if (key === "auger") return haystack.includes("auger");
    if (key === "excavator") return haystack.includes("excavator");
    if (key === "forklift") return haystack.includes("forklift") || haystack.includes("telehandler");
    if (key === "pressure_washer") return haystack.includes("pressure washer");

    return haystack.includes(key);
  });
}

function cleanWords(message) {
  return normalize(message)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 1)
    .filter((w) => ![
      "the", "a", "an", "for", "how", "much", "total", "with", "what",
      "about", "one", "it", "do", "you", "u", "have", "rent", "rental",
      "available", "deliver", "delivery", "can", "need", "want"
    ].includes(w));
}

function isBroadCategoryRequest(message) {
  const t = normalize(message);
  return (
    t.includes("do you have") ||
    t.includes("do u have") ||
    t.includes("what do you have") ||
    t.includes("what all do you have") ||
    t.includes("options") ||
    t.includes("available") ||
    /\b(augers|boom lifts|scissor lifts|excavators|skid steers|trailers|forklifts|compactors|mowers)\b/.test(t)
  );
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const words = cleanWords(message);
  if (!words.length) return null;

  const text = normalize(message);

  const scored = ids
    .map((id) => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      const haystack = `${item.name || ""} ${(item.aliases || []).join(" ")} ${item.details || ""}`.toLowerCase();

      let score = 0;
      for (const word of words) {
        if (haystack.includes(word)) score += 3;
      }

      if (text.includes("stihl") && haystack.includes("stihl")) score += 10;
      if (text.includes("mini") && haystack.includes("mini")) score += 6;
      if (text.includes("blue") && haystack.includes("blue")) score += 5;
      if (text.includes("diamond") && haystack.includes("diamond")) score += 5;
      if (text.includes("gs1930") && haystack.includes("gs1930")) score += 10;
      if (text.includes("gs3246") && haystack.includes("gs3246")) score += 10;
      if (text.includes("jlg") && haystack.includes("jlg")) score += 10;
      if (text.includes("z45") && haystack.includes("z45")) score += 10;
      if (text.includes("genie") && haystack.includes("genie")) score += 5;

      return { id, score };
    })
    .filter(Boolean)
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.id || null;
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

function getDays(message, state) {
  const t = normalize(message);
  if (t.includes("month") || t.includes("monthly")) return 30;
  if (t.includes("week") || t.includes("weekly")) return 7;
  return parseDays(message) || state.lastDays || 1;
}

function durationLabel(days) {
  if (days === 30) return "a month";
  if (days === 7) return "a week";
  return `${days} day(s)`;
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

  let text = `${item.name}${parts.length ? ` is ${parts.join(", ")}.` : "."}`;

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

function quoteText(item, days, extras = {}) {
  const rental = getRentalAmount(item, days);
  const deliveryFee = extras.deliveryFee || 0;
  const trailerFee = extras.trailerFee || 0;

  const subtotal = rental + deliveryFee + trailerFee;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const locationText = deliveryFee ? ` delivered to ${extras.deliveryPlace || "that area"}` : "";
  const trailerText = trailerFee ? " with trailer" : "";

  const lines = [
    `${item.name} total for ${durationLabel(days)}${locationText}${trailerText}:`,
    "",
    `Rental: ${money(rental)}`
  ];

  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  if (trailerFee) lines.push(`Trailer: ${money(trailerFee)}`);

  lines.push(
    `Subtotal: ${money(subtotal)}`,
    `Sales Tax (7%): ${money(tax)}`,
    `Total: ${money(total)}`,
    "",
    RESERVE_TEXT
  );

  return lines.join("\n");
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const category = findCategory(message);
  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);
  const contextualId = resolveFromLastOptions(message, state);

  // Category/list requests run before exact item matching.
  if (category && isBroadCategoryRequest(message)) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  const selectedId = contextualId || explicit?.id || null;

  if (selectedId && EQUIPMENT[selectedId]) {
    state.lastItemId = selectedId;
  }

  const selectedItem = selectedId
    ? EQUIPMENT[selectedId]
    : state.lastItemId
      ? EQUIPMENT[state.lastItemId]
      : null;

  // Price / total quote
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

    return quoteText(item, days, {
      deliveryFee,
      deliveryPlace
    });
  }

  // Delivery only
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

  // Trailer total
  if (wantsTrailerAddedToTotal(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    return quoteText(item, days, {
      trailerFee: getTrailerCost(days)
    });
  }

  // Trailer only
  if (isTrailerQuestion(message)) {
    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
  }

  // Category list
  if (category && !selectedId) {
    const ids = categoryIds(category);

    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // Multi-match list
  if (matches.length > 1 && !selectedId) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  // Single item
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
