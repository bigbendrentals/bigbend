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

const WEBSITE = "www.bigbendrentals.net";
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

function compactText(value) {
  return normalize(value).replace(/[\s.-]/g, "");
}

function haystackFor(id) {
  const item = EQUIPMENT[id];
  if (!item) return "";
  return `${item.name || ""} ${(item.aliases || []).join(" ")} ${item.keyword || ""} ${item.searchKeyword || ""} ${item.category || ""}`.toLowerCase();
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
  if (c.includes("compactor")) return "compactor";

  return c;
}

function categoryFromText(message) {
  const t = normalize(message);

  if (t.includes("auger") || t.includes("augers")) return "auger";
  if (t.includes("scissor")) return "scissor_lift";
  if (t.includes("boom lift") || t.includes("boom lifts")) return "boom_lift";
  if (t.includes("skid steer") || t.includes("skid steers")) return "skid_steer";
  if (t.includes("mini skid")) return "mini_skid";
  if (t.includes("excavator") || t.includes("excavators")) return "excavator";
  if (t.includes("forklift") || t.includes("forklifts")) return "forklift";
  if (t.includes("pressure washer")) return "pressure_washer";
  if (t.includes("compactor") || t.includes("compactors")) return "compactor";

  return normalizeCategory(findCategory(message));
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
    if (key === "compactor") return haystack.includes("compactor");

    return haystack.includes(key);
  });
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

  if (normalizedDetails === itemName) return false;
  return true;
}

function itemBasicText(item) {
  const parts = [];
  if (item.day) parts.push(`${money(item.day)}/day`);
  if (item.week) parts.push(`${money(item.week)}/week`);
  if (item.month) parts.push(`${money(item.month)}/month`);

  let text = `${item.name}${parts.length ? ` is ${parts.join(", ")}.` : "."}`;

  if (item.protection) text += " Rental Protection Plan is required on that machine.";
  if (hasUsefulDetails(item)) text += ` ${item.details}`;

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

function scoreAgainstMessage(id, message) {
  const item = EQUIPMENT[id];
  if (!item) return 0;

  const t = normalize(message);
  const compact = compactText(message);
  const haystack = haystackFor(id);
  const compactHaystack = compactText(haystack);
  const itemName = normalize(item.name || "");

  let score = 0;

  // High confidence exact terms. These intentionally outrank general aliases.
  if (t.includes("stihl") && itemName.includes("stihl")) score += 100;
  if (t.includes("bt131") && compactHaystack.includes("bt131")) score += 100;
  if (t.includes("blue diamond") && itemName.includes("blue diamond")) score += 100;
  if (t.includes("gs1930") && compactHaystack.includes("gs1930")) score += 100;
  if (t.includes("gs3246") && compactHaystack.includes("gs3246")) score += 100;
  if (t.includes("jlg") && itemName.includes("jlg")) score += 100;
  if (t.includes("et500") && compactHaystack.includes("et500")) score += 100;
  if (t.includes("z45") && compactHaystack.includes("z45")) score += 100;
  if (t.includes("boxer") && itemName.includes("boxer")) score += 100;

  // Generic word matches.
  const words = t
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !["the", "and", "for", "how", "much", "what", "about", "with", "you", "have", "rent", "rental", "more", "info", "details"].includes(w));

  for (const word of words) {
    if (haystack.includes(word)) score += 5;
  }

  // If the full short phrase is in the haystack, help it a bit.
  if (t.length >= 3 && haystack.includes(t)) score += 20;
  if (compact.length >= 3 && compactHaystack.includes(compact)) score += 20;

  return score;
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const scored = ids
    .map((id) => ({ id, score: scoreAgainstMessage(id, message) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  return scored[0].id;
}

function resolveGlobalDirect(message) {
  const t = normalize(message);

  // Only global-direct when the customer uses a specific, high-confidence term.
  const hasStrongTerm =
    t.includes("stihl") ||
    t.includes("bt131") ||
    t.includes("blue diamond") ||
    t.includes("gs1930") ||
    t.includes("gs3246") ||
    t.includes("jlg") ||
    t.includes("et500") ||
    t.includes("z45") ||
    t.includes("boxer");

  if (!hasStrongTerm) return null;

  const scored = Object.keys(EQUIPMENT)
    .map((id) => ({ id, score: scoreAgainstMessage(id, message) }))
    .filter((x) => x.score >= 100)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  return scored[0].id;
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

function handleDeliveryOnly(message, state) {
  const delivery = deliveryInfo(message);

  if (delivery) {
    state.lastDeliveryFee = delivery.fee;
    state.lastDeliveryPlace = delivery.placeLabel;
    state.awaitingDeliveryLocation = false;
    return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`;
  }

  state.awaitingDeliveryLocation = true;
  return "We deliver within about a 75-mile radius. What city or area are you in?";
}

function handleMessage(message, senderId) {
  const state = getState(senderId);

  const category = categoryFromText(message);

  if (state.awaitingDeliveryLocation && !isPriceQuestion(message) && !isTrailerQuestion(message)) {
    const response = handleDeliveryOnly(message, state);
    if (response.includes("What city or area")) {
      return `I may need Dave to confirm delivery for that area. ${RESERVE_TEXT}`;
    }
    return response;
  }

  // Broad category requests must run before old item context.
  if (category && isBroadCategoryRequest(message)) {
    const ids = categoryIds(category);
    if (ids.length) {
      state.lastCategoryItems = ids;
      state.lastItemId = null;
      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // IMPORTANT ORDER:
  // 1. Match inside last listed options first
  // 2. Then strong global direct terms
  // 3. Then normal findEquipment
  const contextualId = resolveFromLastOptions(message, state);
  const directId = contextualId || resolveGlobalDirect(message);
  const explicit = directId ? null : findEquipment(message);
  const selectedId = directId || explicit?.id || state.lastItemId || null;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem && isMoreInfoQuestion(message)) {
    state.lastItemId = selectedId;
    return itemMoreInfoText(selectedItem);
  }

  const matches = findAllEquipment(message);

  // Avoid relisting if the phrase is simply selecting from the previous list.
  if (!selectedId && matches.length > 1) {
    state.lastCategoryItems = matches;
    state.lastItemId = null;
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);

  if (isPriceQuestion(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      state.awaitingDeliveryLocation = false;
    }

    const deliveryFee = delivery ? delivery.fee : wantsDelivery ? state.lastDeliveryFee || 0 : 0;
    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;

    return quoteText(item, days, { deliveryFee, deliveryPlace });
  }

  if (wantsDelivery) return handleDeliveryOnly(message, state);

  if (wantsTrailerAddedToTotal(message)) {
    const item = selectedItem;
    if (!item) return "Which machine are you referring to?";

    const days = getDays(message, state);
    state.lastDays = days;

    return quoteText(item, days, { trailerFee: getTrailerCost(days) });
  }

  if (isTrailerQuestion(message)) {
    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
  }

  if (category && !selectedId) {
    const ids = categoryIds(category);
    if (ids.length) {
      state.lastCategoryItems = ids;
      state.lastItemId = null;
      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
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
  if (!response.ok) console.error("Facebook send failed:", response.status, bodyText);
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

app.listen(PORT, () => console.log(`Messenger webhook listening on port ${PORT}`));
