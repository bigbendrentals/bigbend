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
      lastCategory: null,
      lastCategoryItems: [],
      lastDeliveryFee: 0,
      lastDeliveryPlace: null,
      awaitingDeliveryLocation: false
    };
  }
  return stateStore[senderId];
}

function safeNormalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return safeNormalize(value).replace(/[\s.-]/g, "");
}

function itemHaystack(id) {
  const item = EQUIPMENT[id];
  if (!item) return "";
  return safeNormalize(`${item.name || ""} ${(item.aliases || []).join(" ")} ${item.keyword || ""} ${item.searchKeyword || ""} ${item.category || ""} ${item.details || ""}`);
}

function itemCompactHaystack(id) {
  return compact(itemHaystack(id));
}

function normalizeCategory(category) {
  if (!category) return null;
  const c = safeNormalize(category);

  if (c.includes("scissor")) return "scissor_lift";
  if (c.includes("boom")) return "boom_lift";
  if (c.includes("mini skid")) return "mini_skid";
  if (c.includes("skid")) return "skid_steer";
  if (c.includes("auger")) return "auger";
  if (c.includes("excavator")) return "excavator";
  if (c.includes("forklift")) return "forklift";
  if (c.includes("telehandler")) return "telehandler";
  if (c.includes("pressure")) return "pressure_washer";
  if (c.includes("compactor")) return "compactor";
  if (c.includes("mower")) return "mower";
  if (c.includes("trailer")) return "trailer";

  return c;
}

function categoryFromText(message) {
  const t = safeNormalize(message);

  if (/\baugers?\b/.test(t)) return "auger";
  if (t.includes("scissor")) return "scissor_lift";
  if (t.includes("boom lift") || t.includes("boom lifts")) return "boom_lift";
  if (t.includes("mini skid")) return "mini_skid";
  if (t.includes("skid steer") || t.includes("skid steers")) return "skid_steer";
  if (/\bexcavators?\b/.test(t)) return "excavator";
  if (/\bforklifts?\b/.test(t)) return "forklift";
  if (t.includes("telehandler") || t.includes("lull")) return "telehandler";
  if (t.includes("pressure washer")) return "pressure_washer";
  if (/\bcompactors?\b/.test(t)) return "compactor";
  if (/\bmowers?\b/.test(t) || t.includes("zero turn")) return "mower";
  if (/\btrailers?\b/.test(t)) return "trailer";

  return normalizeCategory(findCategory(message));
}

function isBroadCategoryRequest(message) {
  const t = safeNormalize(message);
  return (
    t.includes("do you have") ||
    t.includes("do u have") ||
    t.includes("do you rent") ||
    t.includes("do u rent") ||
    t.includes("what do you have") ||
    t.includes("what all do you have") ||
    t.includes("available") ||
    t.includes("options") ||
    /\b(augers|boom lifts|scissor lifts|excavators|skid steers|trailers|forklifts|compactors|mowers)\b/.test(t)
  );
}

function categoryIds(category) {
  const key = normalizeCategory(category);
  if (!key) return [];

  if (CATEGORY_ITEMS?.[key]?.length) return CATEGORY_ITEMS[key];

  return Object.keys(EQUIPMENT).filter((id) => {
    const h = itemHaystack(id);

    if (key === "auger") return h.includes("auger");
    if (key === "scissor_lift") return h.includes("scissor") || h.includes("gs1930") || h.includes("gs3246");
    if (key === "boom_lift") return h.includes("boom") || h.includes("z45") || h.includes("et500");
    if (key === "mini_skid") return h.includes("mini skid") || h.includes("boxer");
    if (key === "skid_steer") return h.includes("skid steer") || h.includes("skidsteer");
    if (key === "excavator") return h.includes("excavator");
    if (key === "forklift") return h.includes("forklift");
    if (key === "telehandler") return h.includes("telehandler") || h.includes("lull");
    if (key === "pressure_washer") return h.includes("pressure washer");
    if (key === "compactor") return h.includes("compactor");
    if (key === "mower") return h.includes("mower") || h.includes("zero turn");
    if (key === "trailer") return h.includes("trailer");

    return h.includes(key);
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
  if (normalizedDetails.replace(/[^a-z0-9]/g, "") === itemName.replace(/[^a-z0-9]/g, "")) return false;

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
  const t = safeNormalize(message);
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

function resolveStihlBt131() {
  return Object.keys(EQUIPMENT).find((id) => {
    const h = itemHaystack(id);
    const c = itemCompactHaystack(id);
    return (h.includes("stihl") && c.includes("bt131")) || c.includes("stihlbt131");
  }) || null;
}

function scoreItemAgainstMessage(id, message) {
  const item = EQUIPMENT[id];
  if (!item) return 0;

  const t = safeNormalize(message);
  const c = compact(message);
  const h = itemHaystack(id);
  const hc = itemCompactHaystack(id);
  const name = safeNormalize(item.name || "");

  let score = 0;

  if (t.includes("stihl") && name.includes("stihl") && hc.includes("bt131")) score += 1000;
  if (t.includes("bt131") && hc.includes("bt131")) score += 1000;
  if (t.includes("blue diamond") && name.includes("blue diamond")) score += 500;
  if (t.includes("gs1930") && hc.includes("gs1930")) score += 500;
  if (t.includes("gs3246") && hc.includes("gs3246")) score += 500;
  if (t.includes("jlg") && name.includes("jlg")) score += 500;
  if (t.includes("et500") && hc.includes("et500")) score += 500;
  if (t.includes("z45") && hc.includes("z45")) score += 500;
  if (t.includes("boxer") && name.includes("boxer")) score += 500;

  const words = t
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !["the", "and", "for", "how", "much", "what", "about", "with", "you", "have", "rent", "rental", "more", "info", "details", "this", "that"].includes(w));

  for (const word of words) {
    if (h.includes(word)) score += 10;
  }

  if (t.length >= 3 && h.includes(t)) score += 25;
  if (c.length >= 3 && hc.includes(c)) score += 25;

  return score;
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;

  const scored = ids
    .map((id) => ({ id, score: scoreItemAgainstMessage(id, message) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  return scored[0].id;
}

function resolveGlobalDirect(message) {
  const t = safeNormalize(message);
  const c = compact(message);

  if (t === "stihl" || c === "stihl" || t.includes("stihl bt131") || c.includes("stihlbt131") || c.includes("bt131")) {
    return resolveStihlBt131();
  }

  const strongTerm = [
    "blue diamond",
    "gs1930",
    "gs3246",
    "jlg",
    "et500",
    "z45",
    "boxer"
  ].find((term) => t.includes(term));

  if (!strongTerm) return null;

  const scored = Object.keys(EQUIPMENT)
    .map((id) => ({ id, score: scoreItemAgainstMessage(id, message) }))
    .filter((x) => x.score >= 500)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.id || null;
}

function getDays(message, state) {
  const t = safeNormalize(message);
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

  // Broad category requests are always new searches and must run before old context.
  if (category && isBroadCategoryRequest(message)) {
    const ids = categoryIds(category);
    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
      state.lastCategoryItems = ids;
      state.lastItemId = null;
      return `We have these options:\n\n${formatOptions(ids)}\n\nWhich one are you interested in?`;
    }
  }

  // Selection order:
  // 1. Previous options list
  // 2. Strong direct terms like Stihl BT131
  // 3. Normal inventory matcher
  // 4. Previous item context
  const contextualId = resolveFromLastOptions(message, state);
  const globalDirectId = contextualId ? null : resolveGlobalDirect(message);
  const explicit = contextualId || globalDirectId ? null : findEquipment(message);
  const selectedId = contextualId || globalDirectId || explicit?.id || state.lastItemId || null;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem && isMoreInfoQuestion(message)) {
    state.lastItemId = selectedId;
    return itemMoreInfoText(selectedItem);
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

  // Multi-match only after specific/context/direct matching fails.
  const matches = findAllEquipment(message);
  if (!selectedId && matches.length > 1) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  if (category && !selectedId) {
    const ids = categoryIds(category);
    if (ids.length) {
      state.lastCategory = normalizeCategory(category);
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
