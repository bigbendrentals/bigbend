import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
  findEquipment,
  findAllEquipment,
  findCategory,
  isDeliveryQuestion,
  deliveryInfo,
  isTrailerQuestion,
  wantsTrailerAddedToTotal,
  isPriceQuestion,
  parseDays
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
  const c = String(category).toLowerCase();

  if (c === "scissor" || c === "scissor_lift" || c === "scissor lift") return "scissor_lift";
  if (c === "boom" || c === "boom_lift" || c === "boom lift") return "boom_lift";
  if (c === "skid" || c === "skid_steer" || c === "skid steer") return "skid_steer";
  if (c === "mini") return "mini_skid";
  if (c === "auger" || c === "augers") return "auger";
  if (c === "excavator" || c === "excavators") return "excavator";
  if (c === "forklift" || c === "forklifts") return "forklift";
  if (c === "pressure_washer" || c === "pressure washer") return "pressure_washer";

  return c;
}

function categoryIds(category, message = "") {
  const key = normalizeCategory(category);
  if (!key) return [];

  if (CATEGORY_ITEMS?.[key]?.length) return CATEGORY_ITEMS[key];

  const t = normalize(message);

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

    return haystack.includes(key) || (t && haystack.includes(t));
  });
}

function cleanWords(message) {
  return normalize(message)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 1)
    .filter((w) => !["the", "a", "an", "for", "how", "much", "total", "with", "what", "about", "one", "it", "do", "you", "deliver", "delivery"].includes(w));
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const words = cleanWords(message);
  if (!words.length) return null;

  const scored = ids
    .map((id) => {
      const item = EQUIPMENT[id];
      if (!item) return null;

      const haystack = `${item.name || ""} ${(item.aliases || []).join(" ")} ${item.details || ""}`.toLowerCase();
      let score = 0;

      for (const word of words) {
        if (haystack.includes(word)) score += 3;
      }

      if (normalize(message).includes("stihl") && haystack.includes("stihl")) score += 10;
      if (normalize(message).includes("mini") && haystack.includes("mini")) score += 5;
      if (normalize(message).includes("gs1930") && haystack.includes("gs1930")) score += 10;
      if (normalize(message).includes("gs3246") && haystack.includes("gs3246")) score += 10;
      if (normalize(message).includes("jlg") && haystack.includes("jlg")) score += 10;
      if (normalize(message).includes("genie") && haystack.includes("genie")) score += 5;

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
  if (t.includes("week") || t.includes("weekly")) return 7;
  return parseDays(message) || state.lastDays || 1;
}

function getRentalAmount(item, days) {
  if (days >= 7 && item.week) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return weeks * item.week + remainingDays * (item.day || 0);
  }
  return (item.day || 0) * days;
}

function getTrailerCost(days) {
  if (days <= 1) return 49.99;
  return 49.99 + (days - 1) * 15;
}

function quoteText(item, days, includeTrailer = false) {
  const rental = getRentalAmount(item, days);
  const trailer = includeTrailer ? getTrailerCost(days) : 0;
  const subtotal = rental + trailer;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const lines = [
    `${item.name} total for ${days === 7 ? "a week" : `${days} day(s)`}${includeTrailer ? " with trailer" : ""}:`,
    "",
    `Rental: ${money(rental)}`
  ];

  if (includeTrailer) lines.push(`Trailer: ${money(trailer)}`);

  lines.push(
    `Subtotal: ${money(subtotal)}`,
    `Sales Tax (7%): ${money(tax)}`,
    `Total: ${money(total)}`,
    "",
    "Want me to reserve it for you?"
  );

  return lines.join("\n");
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

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const explicit = findEquipment(message);
  const matches = findAllEquipment(message);
  const category = findCategory(message);
  const contextualId = resolveFromLastOptions(message, state);

  const selectedId = contextualId || explicit?.id || null;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem) {
    state.lastItemId = selectedId;
  }

  // DELIVERY QUESTIONS MUST BE HANDLED BEFORE ITEM CONTEXT.
  // Otherwise a follow-up like "do you deliver" gets treated like a repeat question
  // about the last selected item.
  if (isDeliveryQuestion(message)) {
    const delivery = deliveryInfo(message);

    if (delivery) {
      return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`;
    }

    return "We deliver within about a 75-mile radius. What city or area are you in? Delivery pricing depends on location.";
  }

  if (wantsTrailerAddedToTotal(message)) {
    const item = selectedItem || (state.lastItemId ? EQUIPMENT[state.lastItemId] : null);
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;
    return quoteText(item, days, true);
  }

  if (isPriceQuestion(message)) {
    const item = selectedItem || (state.lastItemId ? EQUIPMENT[state.lastItemId] : null);
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;
    return quoteText(item, days, false);
  }

  if (isTrailerQuestion(message)) {
    const item = selectedItem || (state.lastItemId ? EQUIPMENT[state.lastItemId] : null);

    if (!item) {
      return "We can supply a trailer for a $49.99 surcharge for the first day. Which machine are you planning to haul?";
    }

    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
  }

  if (category && !selectedItem) {
    const ids = categoryIds(category, message);

    if (ids.length > 0) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;

      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  if (matches.length > 1 && !selectedItem) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;

    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  if (selectedItem) {
    return itemBasicText(selectedItem);
  }

  return "Can you clarify what you're looking to rent?";
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
