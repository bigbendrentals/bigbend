import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS, ITEM_IDS, MULCHER_COMBOS } from "./inventory.js";
import { money, getWeeklyRate, getMonthlyRate, getRentalAmount, protectionTotal, quoteTotals, trailerSurcharge } from "./pricing.js";
import {
  normalize,
  compact,
  containsAny,
  findEquipment,
  findAllEquipment,
  findCategory,
  scoreItem,
  isBroadCategoryRequest,
  isMoreInfoQuestion,
  isPronounFollowup,
  isTrailerQuestion,
  wantsTrailerAddedToTotal,
  isPriceQuestion,
  parseDays,
  isDeliveryQuestion,
  deliveryInfo,
  isWeightQuestion,
  isThumbQuestion,
  isBucketOrCabQuestion,
  bookingIntent
} from "./intent.js";

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const PORT = process.env.PORT || 10000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || "Big Bend Tool & Equipment Rentals, Perry, FL";
const DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES = Number(process.env.DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES || 10);
const DELIVERY_STANDARD_MAX_ROUND_TRIP_MILES = Number(process.env.DELIVERY_STANDARD_MAX_ROUND_TRIP_MILES || 75);
const DELIVERY_LOCAL_FEE = Number(process.env.DELIVERY_LOCAL_FEE || 200);
const DELIVERY_STANDARD_FEE = Number(process.env.DELIVERY_STANDARD_FEE || 300);


const WEBSITE = "www.bigbendrentals.net";
const OFFICE_INFO = `Office Hours:
Monday - Friday: 8:30 AM – 5:00 PM

The office closes at noon each day, but we are still on site and working.

For assistance, call 850-843-2248 and we will meet you at the office door.

Weekend Rentals:
We arrange weekend rentals during the week and regularly handle weekend pickups and drop-offs.

Security:
Our facility is monitored with AI-powered cameras for your safety and ours.`;

const CONTACT_TEXT = "Call 850-295-5373 or book online at www.bigbendrentals.net.";

const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastSelectedItemId: null,
      lastMachineItemId: null,
      lastDays: 1,
      lastCategory: null,
      lastCategoryItems: [],
      lastDeliveryFee: 0,
      lastDeliveryPlace: null,
      awaitingDeliveryLocation: false,
      awaitingExactDeliveryAddress: false,
      pendingDeliveryQuoteItemId: null,
      pendingDeliveryQuoteDays: null,
      pendingDeliveryQuotePlace: null,
      awaitingMulcherChoice: false,
      pendingMulcherIds: [],
      awaitingMulcherComboSelection: false,
      lastBundleItemIds: [],
      disclaimerShown: false,
      guidedMode: false
    };
  }
  return stateStore[senderId];
}

function safeNormalize(value) {
  return String(value || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s.-]/g, " ").replace(/\s+/g, " ").trim();
}

function itemHaystack(id) {
  const item = EQUIPMENT[id];
  if (!item) return "";
  return safeNormalize(`${item.name || ""} ${(item.aliases || []).join(" ")} ${item.keyword || ""} ${item.searchKeyword || ""} ${item.category || ""} ${item.details || ""}`);
}

function normalizeCategory(category) {
  if (!category) return null;
  const c = safeNormalize(category);
  if (c.includes("scissor")) return "scissor_lift";
  if (c.includes("boom")) return "boom_lift";
  if (c.includes("mini skid") || c === "boxer") return "mini_skid";
  if (c.includes("skid")) return "skid_steer";
  if (c.includes("post driver") || c.includes("post pounder") || c.includes("fence post")) return "post_driver";
  if (c.includes("dumpster") || c.includes("roll off")) return "dumpster";
  if (c.includes("genie")) return "genie";
  if (c.includes("auger")) return "auger";
  if (c.includes("excavator") || c.includes("trackhoe")) return "excavator";
  if (c.includes("forklift") || c.includes("fork lift") || c.includes("lift king")) return "forklift";
  if (c.includes("telehandler") || c.includes("lull")) return "telehandler";
  if (c.includes("pressure")) return "pressure_washer";
  if (c.includes("compactor")) return "compactor";
  if (c.includes("mower") || c.includes("zero turn")) return "mower";
  if (c.includes("mulcher") || c.includes("hm316") || c.includes("mh60d")) return "mulcher";
  if (c.includes("brush cutter") || c.includes("bush hog") || c.includes("rotary cutter")) return "brush_cutter";
  if (c.includes("trencher") || c.includes("ditch witch")) return "trencher";
  if (c.includes("drain") || c.includes("snake")) return "drain_cleaner";
  if (c.includes("trailer")) return "trailer";
  if (c.includes("pump")) return "pump";
  if (c.includes("compressor")) return "compressor";
  if (c.includes("concrete") || c.includes("tile saw") || c.includes("core drill")) return "concrete";
  return c;
}

function isHoursQuestion(message) {
  const t = normalize(message);

  const strongSignals =
    t.includes("hours") ||
    t.includes("open") ||
    t.includes("close") ||
    t.includes("closed") ||
    t.includes("what time") ||
    t.includes("when are you open") ||
    t.includes("business hours") ||
    t.includes("are you open") ||
    t.includes("open on");

  const rentalContext =
    t.includes("rent") ||
    t.includes("rental") ||
    t.includes("price") ||
    t.includes("pricing") ||
    t.includes("quote") ||
    t.includes("how much") ||
    t.includes("skid steer") ||
    t.includes("excavator") ||
    t.includes("trencher") ||
    t.includes("ditch witch") ||
    t.includes("mulcher") ||
    t.includes("brush cutter") ||
    t.includes("delivery") ||
    t.includes("deliver") ||
    t.includes("dropped off") ||
    t.includes("picked up");

  if (
    t.includes("weekend") &&
    rentalContext &&
    !t.includes("are you open") &&
    !t.includes("open on") &&
    !t.includes("hours") &&
    !t.includes("closed")
  ) {
    return false;
  }

  return strongSignals;
}

function categoryFromText(message) {
  if (isMachineHaulingTrailerRequest(message)) return null;
  if (isTrailerRentalCategoryRequest(message)) return "trailer";

  const t = normalize(message);


  if (t.includes("post driver") || t.includes("post pounder") || t.includes("fence post pounder")) return "post_driver";
  if (t.includes("dumpster") || t.includes("roll off")) return "dumpster";
  if (t.includes("genie")) return "genie";
  if (/\baugers?\b/.test(t)) return "auger";
  if (/\bmulchers?\b/.test(t) || t.includes("mulcher") || t.includes("mulched") || t.includes("forestry mulcher")) return "mulcher";
  if (t.includes("scissor")) return "scissor_lift";
  if (t.includes("boom lift") || t.includes("boom lifts")) return "boom_lift";
  if (t.includes("mini skid")) return "mini_skid";
  if (t.includes("skid steer") || t.includes("skid steers")) return "skid_steer";
  if (/\bexcavators?\b/.test(t)) return "excavator";
  if (/\bforklifts?\b/.test(t) || t.includes("fork lift") || t.includes("lift king")) return "forklift";
  if (t.includes("telehandler") || t.includes("lull")) return "telehandler";
  if (t.includes("pressure washer")) return "pressure_washer";
  if (/\bcompactors?\b/.test(t)) return "compactor";
  if (/\bmowers?\b/.test(t) || t.includes("zero turn")) return "mower";
  if (/\btrenchers?\b/.test(t) || t.includes("ditch witch")) return "trencher";

  return normalizeCategory(findCategory(message));
}

function categoryIds(category) {
  const key = normalizeCategory(category);
  if (!key) return [];
  if (key === "genie") return [ITEM_IDS.GENIE_Z45, ITEM_IDS.GS1930, ITEM_IDS.GS3246].filter((id) => EQUIPMENT[id]);
  const mapped = CATEGORY_ITEMS?.[key] || [];
  return [...new Set(mapped)].filter((id) => EQUIPMENT[id]);
}

function formatOptions(ids) {
  return [...new Set(ids)]
    .map((id) => {
      const item = EQUIPMENT[id];
      if (!item) return null;
      const parts = [];
      if (item.day) parts.push(`${money(item.day)}/day`);
      const week = getWeeklyRate(item);
      if (week) parts.push(`${money(week)}/week`);
      if (item.month) parts.push(`${money(item.month)}/month`);
      return `• ${item.name}${parts.length ? ` — ${parts.join(", ")}` : ""}`;
    })
    .filter(Boolean)
    .join("\n");
}


const AI_DISCLOSURE = `Hi — I’m the Big Bend Rentals AI assistant. I can help with equipment options, basic pricing, delivery info, trailer questions, and general rental details. I do not have live availability.`;

function guidedPrompt(extra = "") {
  return `${extra ? `${extra}\n\n` : ""}${AI_DISCLOSURE}\n\nFor accurate help, please send:\n• Equipment or attachment needed\n• Rental length\n• Pickup, delivery city, or using our trailer\n\nExamples:\n“CAT 239 for 1 week using your trailer”\n“Stump grinder for 1 day delivered to Perry”\n“Mulcher combo for Friday to Monday”\n\nFor booking or availability, call 850-295-5373 or book online at www.bigbendrentals.net.`;
}

function shortGuidedClarification(reason = "I need a little more detail before I price that.") {
  return `${reason}\n\nPlease tell me:\n1. Equipment or attachment\n2. Rental length\n3. Pickup, delivery city, or using our trailer\n\nExample: “CAT 239 for 1 week delivered to Perry.”`;
}

function hasDurationText(message) {
  const t = normalize(message);

  return parseDays(t) !== null || t.includes("day") || t.includes("week") || t.includes("month") || t.includes("weekend") || t.includes("friday") || t.includes("monday") || /\b\d+\s*(hr|hour|hours|day|days|week|weeks|month|months)\b/.test(t);
}

function isSpecificItemMention(message) {
  const t = normalize(message);

  const c = compact(message);
  const terms = ["cat 239", "cat239", "239", "cat 265", "cat265", "265", "333p", "john deere 333", "jd 333", "boxer", "3017", "301.7", "50p", "3075", "307.5", "z45", "et500", "gs1930", "gs3246", "stihl", "bt131", "blue diamond", "hm316", "mh60d", "rayco", "rg37", "spartan", "c30x", "lift king", "mitsubishi"];
  return terms.some((term) => t.includes(term) || c.includes(term.replace(/[^a-z0-9]/g, "")));
}

function isLikelyContextFollowup(message) {
  const t = normalize(message);

  return (
    isPriceQuestion(message) ||
    isMoreInfoQuestion(message) ||
    isTrailerQuestion(message) ||
    isDeliveryQuestion(message) ||
    isWeightQuestion(message) ||
    isThumbQuestion(message) ||
    isBucketOrCabQuestion(message) ||
    t.includes("that") ||
    t.includes("it") ||
    t.includes("this") ||
    t.includes("same") ||
    t.includes("week") ||
    t.includes("day") ||
    t.includes("month")
  );
}

function categorySelectionPrompt(category, state, reason = null) {
  const ids = categoryIds(category);
  if (!ids.length) return null;
  state.lastCategory = normalizeCategory(category);
  state.lastCategoryItems = ids;
  state.lastItemId = null;
  const header = reason || `I found more than one option for that.`;
  return `${header}\n\n${formatOptions(ids)}\n\nWhich one do you want pricing or info for?`;
}

function dumpsterInfoPrompt(state) {
  const ids = categoryIds("dumpster");
  state.lastCategory = "dumpster";
  state.lastCategoryItems = ids.length ? ids : [ITEM_IDS.DUMPSTER].filter((id) => EQUIPMENT[id]);

  const optionLine = EQUIPMENT[ITEM_IDS.DUMPSTER]
    ? `• ${EQUIPMENT[ITEM_IDS.DUMPSTER].name} — $500 standard service area, $600 coastal areas`
    : "• Maxx-D 20 Yard Dumpster — $500 standard service area, $600 coastal areas";

  return `We have this dumpster option:

${optionLine}

20-yard roll-off dumpster for residential cleanout, camper cleanout, remodel debris, storm cleanup, and similar non-hazardous material.

Pricing includes delivery and pickup unless otherwise stated. Coastal areas are $600 due to fuel costs. Coastal areas include Steinhatchee, Keaton Beach, Dekle Beach, Jena, and other coast/coastal references.

Weight limits and prohibited items may apply.

What rental length do you need, and what city is delivery to?`;
}

function shouldForceCategoryChoice(message, category) {
  const key = normalizeCategory(category);
  if (!key) return false;
  const multi = categoryIds(key).length > 1;
  if (!multi) return false;
  if (isSpecificItemMention(message)) return false;
  if (key === "mulcher") return false;
  return isPriceQuestion(message) || hasDurationText(message) || normalize(message).includes("looking for") || normalize(message).includes("need") || normalize(message).includes("interested in");
}

function itemKeyword(item) {
  return item.keyword || item.searchKeyword || item.name;
}


function isDumpTrailerItem(item) {
  const name = normalize(item?.name || "");
  const keyword = normalize(item?.keyword || "");
  const category = normalize(item?.category || "");
  return category === "trailer" || name.includes("dump trailer") || keyword.includes("dump trailer");
}

function wantsOurTrailerIncluded(message) {
  const t = normalize(message);

  return (
    t.includes("include your trailer") ||
    t.includes("include the trailer") ||
    t.includes("include a trailer") ||
    t.includes("including your trailer") ||
    t.includes("including the trailer") ||
    t.includes("including a trailer") ||
    t.includes("add your trailer") ||
    t.includes("add the trailer") ||
    t.includes("with your trailer") ||
    t.includes("with the trailer") ||
    t.includes("with a trailer") ||
    t.includes("need your trailer") ||
    t.includes("need the trailer") ||
    t.includes("use your trailer") ||
    t.includes("use the trailer") ||
    t.includes("using your trailer") ||
    t.includes("using the trailer") ||
    t.includes("using a trailer") ||
    t.includes("rent your trailer") ||
    t.includes("rent the trailer") ||
    t.includes("borrow your trailer") ||
    t.includes("borrow the trailer") ||
    t === "with trailer" ||
    t === "with the trailer" ||
    t === "include trailer" ||
    t === "add trailer"
  );
}

function trailerOptionText() {
  return "If you need to use our trailer to haul the machine, it is a $49.99 surcharge. You can also use your own trailer if it meets the weight requirements.";
}



function isMachineHaulingTrailerRequest(message) {
  const t = normalize(message);


  return (
    t.includes("come with a trailer") ||
    t.includes("comes with a trailer") ||
    t.includes("trailer come with it") ||
    t.includes("trailer comes with it") ||
    t.includes("have a trailer to haul") ||
    t.includes("trailer to haul") ||
    t.includes("trailer we can use") ||
    (t.includes("we can use") && t.includes("trailer")) ||
    t.includes("use your trailer") ||
    t.includes("use the trailer") ||
    t.includes("using your trailer") ||
    t.includes("using the trailer") ||
    t.includes("using a trailer") ||
    t.includes("borrow your trailer") ||
    t.includes("borrow the trailer") ||
    t.includes("need your trailer") ||
    t.includes("need the trailer") ||
    t.includes("include your trailer") ||
    t.includes("include the trailer") ||
    t.includes("include a trailer") ||
    t.includes("including your trailer") ||
    t.includes("including the trailer") ||
    t.includes("including a trailer") ||
    t.includes("add your trailer") ||
    t.includes("add the trailer") ||
    t.includes("with your trailer") ||
    t.includes("with the trailer") ||
    t.includes("with a trailer") ||
    (t.includes("haul the") && t.includes("trailer")) ||
    (t.includes("haul it") && t.includes("trailer")) ||
    (t.includes("haul") && t.includes("jd") && t.includes("trailer")) ||
    (t.includes("haul") && t.includes("333") && t.includes("trailer")) ||
    (t.includes("haul") && t.includes("skid") && t.includes("trailer")) ||
    (t.includes("haul") && t.includes("machine") && t.includes("trailer"))
  );
}

function isTrailerRentalCategoryRequest(message) {
  const t = normalize(message);


  if (isMachineHaulingTrailerRequest(message)) return false;

  return (
    t.includes("do you have trailers") ||
    t.includes("do you rent trailers") ||
    t.includes("rent trailers") ||
    t.includes("trailer rental") ||
    t.includes("dump trailer") ||
    t.includes("dump trailers") ||
    t === "trailer" ||
    t === "trailers"
  );
}



function isDumpsterItem(item) {
  const name = normalize(item?.name || "");
  const keyword = normalize(item?.keyword || "");
  const category = normalize(item?.category || "");
  return category === "dumpster" || name.includes("dumpster") || keyword.includes("dumpster");
}

function isCoastalArea(text) {
  const t = normalize(text);
  return (
    t.includes("steinhatchee") ||
    t.includes("keaton") ||
    t.includes("keaton beach") ||
    t.includes("dekle") ||
    t.includes("dekle beach") ||
    t.includes("jena") ||
    t.includes("coast") ||
    t.includes("coastal")
  );
}

function isSteinhatcheeText(text) {
  const t = normalize(text);
  return t.includes("steinhatchee") || t.includes("keaton") || t.includes("dekle");
}

function dumpsterInfoText(message = "") {
  if (isCoastalArea(message)) {
    return "Dumpster pricing for coastal areas is $600 due to fuel costs. Dumpster pricing includes delivery and pickup.";
  }

  return "Dumpster pricing includes delivery and pickup. Standard service-area dumpster pricing is $500. Coastal areas are $600 due to fuel costs.";
}


function hasUsefulDetails(item) {
  const details = String(item.details || "").trim();
  if (!details) return false;
  const itemName = String(item.name || "").trim().toLowerCase();
  const normalizedDetails = details.toLowerCase();
  if (normalizedDetails === itemName) return false;
  if (normalizedDetails.replace(/[^a-z0-9]/g, "") === itemName.replace(/[^a-z0-9]/g, "")) return false;
  if (normalizedDetails.length < 25 && itemName.includes(normalizedDetails)) return false;
  return true;
}

function itemBasicText(item) {
  const parts = [];
  if (item.day) parts.push(`${money(item.day)}/day`);
  const week = getWeeklyRate(item);
  if (week) parts.push(`${money(week)}/week`);
  const month = item.month ? getMonthlyRate(item) : null;
  if (month) parts.push(`${money(month)}/month`);
  let text = `${item.name}${parts.length ? ` is ${parts.join(", ")}.` : "."}`;
  if (item.protection) text += " Rental Protection Plan is required on that machine.";
  if (hasUsefulDetails(item)) text += ` ${item.details}`;
  text += `\n\n${CONTACT_TEXT}`;
  return text;
}

function itemMoreInfoText(item) {
  if (!hasUsefulDetails(item)) return `For more information, check the website at ${WEBSITE} and search "${itemKeyword(item)}".`;
  return `${item.name}: ${item.details}\n\nFor more information, check the website at ${WEBSITE} and search "${itemKeyword(item)}".`;
}

function rememberSelected(state, selectedId) {
  state.lastItemId = selectedId;
  state.lastSelectedItemId = selectedId;

  const item = EQUIPMENT[selectedId];
  if (item && !isDumpTrailerItem(item)) {
    state.lastMachineItemId = selectedId;
  }
}

function resolveFromLastOptions(message, state) {
  const ids = state.lastCategoryItems || [];
  if (!ids.length) return null;
  const scored = ids.map((id) => ({ id, score: scoreItem(id, message) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score < 200) return null;
  return scored[0].id;
}

function resolveGlobalDirect(message) {
  const t = safeNormalize(message);
  const c = compact(message);
  const strong = ["stihl", "bt131", "blue diamond", "lift king", "8k", "8000", "mitsubishi", "gs1930", "gs3246", "jlg", "et500", "z45", "boxer", "3017", "301.7", "50p", "3075", "307.5", "239", "265", "333p", "rayco", "rg37", "spartan", "c30x", "ditch witch", "electric eel", "k400", "brushcat", "land pride", "billy goat", "telehandler", "lull", "hm316", "mh60d", "mulcher", "forestry"];
  if (!strong.some((term) => t.includes(term) || c.includes(term.replace(/\s/g, "")))) return null;
  const scored = Object.keys(EQUIPMENT).map((id) => ({ id, score: scoreItem(id, message) })).filter((x) => x.score >= 80).sort((a, b) => b.score - a.score);
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
  if (days === 1) return "1 day";
  return `${days} days`;
}


function dumpsterQuoteText(item, message, days = 1) {
  const coastal = isCoastalArea(message);
  const rental = coastal ? 600 : 500;
  const subtotal = rental;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  const lines = [
    `${item.name} total${coastal ? " for coastal area" : " for standard service area"}:`,
    "",
    `Rental: ${money(rental)}`,
    dumpsterInfoText(message),
    `Subtotal: ${money(subtotal)}`,
    `Sales Tax (7%): ${money(tax)}`,
    `Total: ${money(total)}`,
    "",
    CONTACT_TEXT
  ];

  return lines.join("\n");
}

function quoteText(item, days, extras = {}) {
  const adjustedExtras = { ...extras };
  if (isDumpTrailerItem(item) || adjustedExtras.deliveryFee) adjustedExtras.trailerFee = 0;
  if (isDumpsterItem(item)) adjustedExtras.deliveryFee = 0;
  const totals = quoteTotals(item, days, adjustedExtras);
  const locationText = totals.deliveryFee ? ` delivered to ${extras.deliveryPlace || "that area"}` : "";
  const trailerText = totals.trailerFee ? " with trailer" : "";
  const lines = [`${item.name} total for ${durationLabel(days)}${locationText}${trailerText}:`, "", `Rental: ${money(totals.rental)}`];
  if (totals.protection) lines.push(`Rental Protection Plan: ${money(totals.protection)}`);
  if (totals.deliveryFee && !isDumpsterItem(item)) lines.push(`Delivery: ${money(totals.deliveryFee)}`);
  if (isDumpsterItem(item)) lines.push(dumpsterInfoText(extras.deliveryPlace || ""));
  if (totals.trailerFee) lines.push(`Trailer: ${money(totals.trailerFee)}`);
  lines.push(`Subtotal: ${money(totals.subtotal)}`, `Sales Tax (7%): ${money(totals.tax)}`, `Total: ${money(totals.total)}`, "", CONTACT_TEXT);
  return lines.join("\n");
}

function handleDeliveryOnly(message, state) {
  const delivery = deliveryInfo(message);
  if (delivery) {
    state.lastDeliveryFee = delivery.fee;
    state.lastDeliveryPlace = delivery.placeLabel;
    state.awaitingDeliveryLocation = false;
    return `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}. ${CONTACT_TEXT}`;
  }
  state.awaitingDeliveryLocation = true;
  return "We deliver within about a 75-mile radius. What city or area are you in?";
}

function isSupportIssue(message) {
  const t = normalize(message);

  return (
    t.includes("not working") ||
    t.includes("isnt working") ||
    t.includes("isn't working") ||
    t.includes("wont start") ||
    t.includes("won't start") ||
    t.includes("will not start") ||
    t.includes("wont run") ||
    t.includes("won't run") ||
    t.includes("will not run") ||
    t.includes("wont turn on") ||
    t.includes("won't turn on") ||
    t.includes("will not turn on") ||
    t.includes("broke") ||
    t.includes("broken") ||
    t.includes("stopped working") ||
    t.includes("quit working") ||
    t.includes("problem with") ||
    t.includes("machine issue") ||
    t.includes("equipment issue") ||
    t.includes("can you call me") ||
    t.includes("call me") ||
    t.includes("need help") ||
    t.includes("help with this machine") ||
    t.includes("help with the machine") ||
    (
      t.includes("problem") &&
      (t.includes("machine") || t.includes("equipment") || t.includes("mower") || t.includes("stump grinder") || t.includes("skid steer") || t.includes("excavator") || t.includes("trencher"))
    ) ||
    (
      t.includes("issue") &&
      (t.includes("machine") || t.includes("equipment") || t.includes("mower") || t.includes("stump grinder") || t.includes("skid steer") || t.includes("excavator") || t.includes("trencher"))
    )
  );
}

function hasExactAddress(message) {
  const t = normalize(message);

  return (
    /\b\d{2,6}\s+[a-z0-9]/.test(t) ||
    t.includes("address is") ||
    t.includes("my address") ||
    t.includes("street") ||
    t.includes("st ") ||
    t.includes(" ave") ||
    t.includes("avenue") ||
    t.includes(" road") ||
    t.includes(" rd") ||
    t.includes(" drive") ||
    t.includes(" dr") ||
    t.includes(" lane") ||
    t.includes(" ln") ||
    t.includes(" boulevard") ||
    t.includes(" blvd") ||
    t.includes(" highway") ||
    t.includes(" hwy")
  );
}

function exactAddressPrompt() {
  return "What is the exact delivery address?\n\nThat lets us confirm delivery availability and give you an accurate delivery price.";
}

function needsExactAddress(message) {
  const t = normalize(message);

  return (
    isDeliveryQuestion(message) &&
    !hasExactAddress(message) &&
    (
      t.includes("deliver") ||
      t.includes("delivery") ||
      t.includes("dropped off") ||
      t.includes("drop off") ||
      t.includes("picked up") ||
      t.includes("pick up") ||
      t.includes("bring it") ||
      t.includes("bring")
    )
  );
}

function calculateDeliveryFeeFromMiles(roundTripMiles) {
  const miles = Number(roundTripMiles || 0);

  if (miles <= DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES) {
    return DELIVERY_LOCAL_FEE;
  }

  if (miles <= DELIVERY_STANDARD_MAX_ROUND_TRIP_MILES) {
    return DELIVERY_STANDARD_FEE;
  }

  return null;
}

async function getDrivingMilesFromGoogle(destinationAddress) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured.");
  }

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters"
    },
    body: JSON.stringify({
      origin: { address: BUSINESS_ADDRESS },
      destination: { address: destinationAddress },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      units: "IMPERIAL"
    })
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Google Routes failed: ${response.status} ${bodyText}`);
  }

  const data = JSON.parse(bodyText || "{}");
  const distanceMeters = data?.routes?.[0]?.distanceMeters;

  if (!distanceMeters) {
    throw new Error("Google Routes did not return a driving distance.");
  }

  const oneWayMiles = Number(distanceMeters) / 1609.344;
  const roundTripMiles = oneWayMiles * 2;

  return { oneWayMiles, roundTripMiles };
}

async function quoteTextWithMileageDelivery(item, days, address) {
  try {
    const miles = await getDrivingMilesFromGoogle(address);
    const deliveryFee = calculateDeliveryFeeFromMiles(miles.roundTripMiles);

    if (deliveryFee === null) {
      return `${item.name} estimate for ${durationLabel(days)} before final delivery charge:

Rental: ${money(getRentalAmount(item, days))}
${item.protection ? `Rental Protection Plan: ${money(protectionTotal(days))}
` : ""}Delivery: This address is about ${miles.roundTripMiles.toFixed(1)} round-trip miles, which is outside the automatic 75-mile delivery quote range.

Estimated driving distance:
One way: ${miles.oneWayMiles.toFixed(1)} miles
Round trip: ${miles.roundTripMiles.toFixed(1)} miles

Call 850-295-5373 or book online at www.bigbendrentals.net so we can confirm delivery availability and the exact delivery price.`;
    }

    const quote = quoteText(item, days, {
      deliveryFee,
      deliveryPlace: address
    });

    const deliveryNote =
      miles.roundTripMiles <= DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES
        ? `Delivery pricing: ${money(DELIVERY_LOCAL_FEE)} up to ${DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES} round-trip miles.`
        : `Delivery pricing: ${money(DELIVERY_STANDARD_FEE)} for more than ${DELIVERY_LOCAL_MAX_ROUND_TRIP_MILES} and up to ${DELIVERY_STANDARD_MAX_ROUND_TRIP_MILES} round-trip miles.`;

    return `${quote}

${deliveryNote}

Estimated driving distance:
One way: ${miles.oneWayMiles.toFixed(1)} miles
Round trip: ${miles.roundTripMiles.toFixed(1)} miles`;
  } catch (err) {
    console.error("Delivery mileage calculation failed:", err);

    return `${item.name} estimate for ${durationLabel(days)} before final delivery charge:

Rental: ${money(getRentalAmount(item, days))}
${item.protection ? `Rental Protection Plan: ${money(protectionTotal(days))}
` : ""}Delivery: Exact delivery charge needs manual confirmation for this address.

Call 850-295-5373 or book online at www.bigbendrentals.net so we can confirm delivery availability and the exact delivery price.`;
  }
}



function isMulcherId(id) {
  return id === ITEM_IDS.CAT_MULCHER || id === ITEM_IDS.JD_MULCHER;
}

function isMulcherComboRequest(message) {
  const t = safeNormalize(message);
  return (
    t === "both" ||
    t.includes("both") ||
    t.includes("combo") ||
    t.includes("combination") ||
    t.includes("mulched combo") ||
    t.includes("mulcher combo") ||
    t.includes("with skid steer") ||
    t.includes("with a skid steer") ||
    t.includes("mulcher and skid steer") ||
    t.includes("skid steer and mulcher")
  );
}

function isMulcherAttachmentOnlyRequest(message) {
  const t = safeNormalize(message);
  return (
    t.includes("attachment only") ||
    t.includes("just the attachment") ||
    t.includes("just attachment") ||
    t.includes("mulcher only") ||
    t.includes("just the mulcher") ||
    t.includes("just mulcher") ||
    t.includes("only the mulcher") ||
    t === "attachment"
  );
}

function mulcherIdFromText(message) {
  const t = safeNormalize(message);
  const c = compact(message);

  if (t.includes("cat") || t.includes("hm316") || c.includes("cathm316")) return ITEM_IDS.CAT_MULCHER;
  if (t.includes("john deere") || t.includes("deere") || t.includes("jd") || t.includes("mh60d") || c.includes("jdmh60d")) return ITEM_IDS.JD_MULCHER;

  return null;
}

function comboIdsForMulcher(mulcherId) {
  if (mulcherId === ITEM_IDS.CAT_MULCHER) return MULCHER_COMBOS.cat;
  if (mulcherId === ITEM_IDS.JD_MULCHER) return MULCHER_COMBOS.jd;
  return null;
}

function pairedMachineName(mulcherId) {
  const ids = comboIdsForMulcher(mulcherId);
  return ids?.[1] && EQUIPMENT[ids[1]] ? EQUIPMENT[ids[1]].name : "the matching skid steer";
}

function mulcherChoicePrompt(ids) {
  const mulcherIds = [...new Set(ids || [])].filter((id) => isMulcherId(id) && EQUIPMENT[id]);
  const pairLines = mulcherIds.map((id) => `• ${EQUIPMENT[id].name} pairs with ${pairedMachineName(id)} only`).join("\n");

  return `Do you want just the mulcher attachment, or the skid steer + mulcher combo?\n\n${pairLines}\n\nReply "attachment only" or "combo".`;
}

function quoteBundleText(itemIds, days, extras = {}) {
  const ids = [...new Set(itemIds || [])].filter((id) => EQUIPMENT[id]);
  const items = ids.map((id) => EQUIPMENT[id]);
  let deliveryFee = extras.deliveryFee || 0;
  let trailerFee = extras.trailerFee || 0;
  if (items.some((item) => isDumpTrailerItem(item)) || deliveryFee) trailerFee = 0;
  if (items.some((item) => isDumpsterItem(item))) deliveryFee = 0;

  let rental = 0;
  let protection = 0;

  const locationText = deliveryFee ? ` delivered to ${extras.deliveryPlace || "that area"}` : "";
  const trailerText = trailerFee ? " with trailer" : "";
  const lines = [`${items.map((item) => item.name).join(" + ")} total for ${durationLabel(days)}${locationText}${trailerText}:`, ""];

  for (const item of items) {
    const itemRental = getRentalAmount(item, days);
    rental += itemRental;
    lines.push(`${item.name}: ${money(itemRental)}`);
    if (item.protection) protection += protectionTotal(days);
  }

  if (protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  if (trailerFee) lines.push(`Trailer: ${money(trailerFee)}`);

  const subtotal = rental + protection + deliveryFee + trailerFee;
  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  lines.push(`Subtotal: ${money(subtotal)}`, `Sales Tax (7%): ${money(tax)}`, `Total: ${money(total)}`, "", CONTACT_TEXT);
  return lines.join("\n");
}

function askWhichMulcherCombo() {
  return `Which skid steer + mulcher combo do you want?\n\n• CAT HM316 Forestry Mulcher + CAT 265\n• John Deere MH60D Forestry Mulcher + John Deere 333P`;
}

function categoryResponse(category, state) {
  const ids = categoryIds(category);
  if (!ids.length) return null;
  const normalizedCategory = normalizeCategory(category);
  state.lastCategory = normalizedCategory;
  state.lastCategoryItems = ids;
  state.lastItemId = null;

  if (normalizedCategory === "mulcher") {
    state.awaitingMulcherChoice = true;
    state.pendingMulcherIds = ids.filter((id) => isMulcherId(id));
    return `We have these mulcher options:

${formatOptions(ids)}

${mulcherChoicePrompt(ids)}`;
  }

  return `We have these options:

${formatOptions(ids)}

Which one are you interested in?`;
}


export async function handleMessage(message, senderId = "local-test") {
  const state = getState(senderId);
  const category = categoryFromText(message);

  if (!state.disclaimerShown) {
    state.disclaimerShown = true;

    const hasClearIntent =
      isHoursQuestion(message) ||
      isPriceQuestion(message) ||
      category ||
      findEquipment(message) ||
      isDeliveryQuestion(message) ||
      hasDurationText(message) ||
      isTrailerQuestion(message) ||
      bookingIntent(message);

    if (!hasClearIntent) {
      return guidedPrompt("Thanks for messaging Big Bend Rentals.");
    }
  }

  const t = normalize(message);

  // CUSTOMER SUPPORT / EQUIPMENT ISSUE HANDLER
  // This must run before inventory, category, and pricing logic.
  if (isSupportIssue(message)) {
    return `I'm sorry you're having trouble with the equipment.

Please call 850-295-5373 right away so we can help.

If possible, include:
• Your name
• The machine you're using
• What it's doing or not doing

We'll take care of you.`;
  }

  // HIGH FLOW BRUSH CUTTER LOGIC
  // Only the CAT 265 and John Deere 333P are high-flow skid steers.
  if (
    t.includes("high flow") &&
    (
      t.includes("brush cutter") ||
      t.includes("brushcat") ||
      t.includes("brush cat") ||
      t.includes("skid steer brush cutter")
    )
  ) {
    const ids = [ITEM_IDS.CAT_265, ITEM_IDS.JD_333P].filter((id) => EQUIPMENT[id]);

    state.lastCategory = "skid_steer";
    state.lastCategoryItems = ids;
    state.lastItemId = null;

    return `We do have high-flow skid steer options for that attachment:

${formatOptions(ids)}

Which one are you interested in?`;
  }

  if (state.awaitingExactDeliveryAddress) {
    if (!hasExactAddress(message)) {
      return exactAddressPrompt();
    }

    state.awaitingExactDeliveryAddress = false;

    const itemId = state.pendingDeliveryQuoteItemId;
    const days = state.pendingDeliveryQuoteDays || 1;

    if (itemId && EQUIPMENT[itemId]) {
      const item = EQUIPMENT[itemId];

      state.lastSelectedItemId = itemId;
      state.lastDays = days;
      state.lastDeliveryPlace = message;
      state.pendingDeliveryQuoteItemId = null;
      state.pendingDeliveryQuoteDays = null;
      state.pendingDeliveryQuotePlace = null;

      return await quoteTextWithMileageDelivery(item, days, message);
    }

    return "Got it. What equipment are you needing delivered?";
  }

  if (needsExactAddress(message)) {
    const pendingId = resolveGlobalDirect(message) || resolveFromLastOptions(message, state) || findEquipment(message)?.id || state.lastSelectedItemId || state.lastItemId || null;
    const pendingDays = getDays(message, state);

    state.awaitingExactDeliveryAddress = true;
    state.pendingDeliveryQuoteItemId = pendingId;
    state.pendingDeliveryQuoteDays = pendingDays;
    state.pendingDeliveryQuotePlace = deliveryInfo(message)?.placeLabel || null;

    if (pendingId && EQUIPMENT[pendingId]) {
      rememberSelected(state, pendingId);
      state.lastDays = pendingDays;
    }

    return exactAddressPrompt();
  }


  if (isHoursQuestion(message)) return OFFICE_INFO;

  if ((t.includes("mulcher") || t.includes("mulched")) && t.includes("skid steer") && t.includes("combo")) {
    state.lastCategory = "mulcher";
    state.lastCategoryItems = categoryIds("mulcher");
    state.awaitingMulcherChoice = true;
    state.awaitingMulcherComboSelection = true;
    state.pendingMulcherIds = categoryIds("mulcher");
    return askWhichMulcherCombo();
  }

  if (category === "dumpster" && !hasDurationText(message)) {
    return dumpsterInfoPrompt(state);
  }

  if (
    !category &&
    state.lastCategory === "dumpster" &&
    (hasDurationText(message) || isPriceQuestion(message) || isCoastalArea(message))
  ) {
    const id = ITEM_IDS.DUMPSTER;
    const item = EQUIPMENT[id];

    if (!item) {
      return "I can help with the dumpster, but I need the delivery city to price it correctly.";
    }

    rememberSelected(state, id);
    const days = getDays(message, state);
    state.lastDays = days;

    return dumpsterQuoteText(item, message, days);
  }


  if (category === "genie" && !isSpecificItemMention(message)) {
    return categorySelectionPrompt("genie", state, "I need to know which Genie lift you mean. We have these Genie options:");
  }

  if (category === "post_driver") {
    const id = ITEM_IDS.FENCE_POST_POUNDER;
    rememberSelected(state, id);
    if (isPriceQuestion(message) || hasDurationText(message)) {
      const days = getDays(message, state);
      state.lastDays = days;
      return quoteText(EQUIPMENT[id], days);
    }
    return itemBasicText(EQUIPMENT[id]);
  }

  if (shouldForceCategoryChoice(message, category)) {
    const response = categorySelectionPrompt(category, state, `I can help, but I need to know which ${String(category).replace(/_/g, " ")} you want.`);
    if (response) return response;
  }

  if (isMachineHaulingTrailerRequest(message)) {
    const priorId = state.lastMachineItemId || state.lastSelectedItemId || state.lastItemId || null;
    const priorItem = priorId ? EQUIPMENT[priorId] : null;

    if (priorItem && isDumpTrailerItem(priorItem)) {
      return `${priorItem.name} is rented as its own trailer item, so the $49.99 machine-hauling trailer surcharge does not apply.`;
    }

    if (priorItem && (isPriceQuestion(message) || wantsTrailerAddedToTotal(message) || wantsOurTrailerIncluded(message))) {
      const days = getDays(message, state);
      state.lastDays = days;
      rememberSelected(state, priorId);
      return quoteText(priorItem, days, { trailerFee: trailerSurcharge(days) });
    }

    return trailerOptionText();
  }


  if (state.awaitingMulcherChoice) {
    const pendingMulchers = (state.pendingMulcherIds || []).filter((id) => isMulcherId(id) && EQUIPMENT[id]);
    const requestedMulcherId = mulcherIdFromText(message);
    const resolvedMulcherId = requestedMulcherId || (pendingMulchers.length === 1 ? pendingMulchers[0] : null);

    if (state.awaitingMulcherComboSelection && resolvedMulcherId) {
      const days = getDays(message, state);
      const delivery = deliveryInfo(message);
      if (delivery) {
        state.lastDeliveryFee = delivery.fee;
        state.lastDeliveryPlace = delivery.placeLabel;
        state.awaitingDeliveryLocation = false;
      }
      const deliveryFee = delivery ? delivery.fee : isDeliveryQuestion(message) ? state.lastDeliveryFee || 0 : 0;
      const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;
      const comboIds = comboIdsForMulcher(resolvedMulcherId);

      state.lastDays = days;
      state.awaitingMulcherChoice = false;
      state.awaitingMulcherComboSelection = false;
      state.pendingMulcherIds = [];
      state.lastBundleItemIds = comboIds;
      rememberSelected(state, resolvedMulcherId);

      return quoteBundleText(comboIds, days, { deliveryFee, deliveryPlace });
    }

    if (isMulcherComboRequest(message)) {
      if (!resolvedMulcherId) {
        state.awaitingMulcherComboSelection = true;
        return askWhichMulcherCombo();
      }

      const days = getDays(message, state);
      const delivery = deliveryInfo(message);
      if (delivery) {
        state.lastDeliveryFee = delivery.fee;
        state.lastDeliveryPlace = delivery.placeLabel;
        state.awaitingDeliveryLocation = false;
      }

      const deliveryFee = delivery ? delivery.fee : isDeliveryQuestion(message) ? state.lastDeliveryFee || 0 : 0;
      const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;
      const comboIds = comboIdsForMulcher(resolvedMulcherId);

      state.lastDays = days;
      state.awaitingMulcherChoice = false;
      state.awaitingMulcherComboSelection = false;
      state.pendingMulcherIds = [];
      state.lastBundleItemIds = comboIds;
      rememberSelected(state, resolvedMulcherId);

      return quoteBundleText(comboIds, days, { deliveryFee, deliveryPlace });
    }

    if (isMulcherAttachmentOnlyRequest(message)) {
      if (!resolvedMulcherId) {
        return `Which mulcher attachment do you want?\n\n• CAT HM316 Forestry Mulcher\n• John Deere MH60D Forestry Mulcher`;
      }

      state.awaitingMulcherChoice = false;
      state.awaitingMulcherComboSelection = false;
      state.pendingMulcherIds = [];
      state.lastBundleItemIds = [];
      rememberSelected(state, resolvedMulcherId);
      return itemBasicText(EQUIPMENT[resolvedMulcherId]);
    }

    if (requestedMulcherId && pendingMulchers.length > 1) {
      state.pendingMulcherIds = [requestedMulcherId];
      return `${itemBasicText(EQUIPMENT[requestedMulcherId])}\n\n${mulcherChoicePrompt([requestedMulcherId])}`;
    }
  }

  if (category === "mulcher" && isMulcherComboRequest(message)) {
    const requestedMulcherId = mulcherIdFromText(message);
    const ids = categoryIds("mulcher").filter((id) => isMulcherId(id));
    state.lastCategory = "mulcher";
    state.lastCategoryItems = ids;
    state.awaitingMulcherChoice = true;
    state.awaitingMulcherComboSelection = !requestedMulcherId;
    state.pendingMulcherIds = requestedMulcherId ? [requestedMulcherId] : ids;

    if (!requestedMulcherId) return askWhichMulcherCombo();

    const days = getDays(message, state);
    const delivery = deliveryInfo(message);
    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      state.awaitingDeliveryLocation = false;
    }
    const deliveryFee = delivery ? delivery.fee : isDeliveryQuestion(message) ? state.lastDeliveryFee || 0 : 0;
    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;
    const comboIds = comboIdsForMulcher(requestedMulcherId);
    state.awaitingMulcherChoice = false;
    state.awaitingMulcherComboSelection = false;
    state.pendingMulcherIds = [];
    state.lastBundleItemIds = comboIds;
    rememberSelected(state, requestedMulcherId);
    return quoteBundleText(comboIds, days, { deliveryFee, deliveryPlace });
  }

  if (state.awaitingDeliveryLocation && !isPriceQuestion(message) && !isTrailerQuestion(message)) {
    return handleDeliveryOnly(message, state);
  }

  if (category && isBroadCategoryRequest(message)) {
    const response = categoryResponse(category, state);
    if (response) return response;
  }

  if (isMoreInfoQuestion(message) && isPronounFollowup(message) && state.lastSelectedItemId && EQUIPMENT[state.lastSelectedItemId]) {
    return itemMoreInfoText(EQUIPMENT[state.lastSelectedItemId]);
  }

  const contextualId = resolveFromLastOptions(message, state);
  const globalDirectId = resolveGlobalDirect(message);
  const explicit = globalDirectId || contextualId ? null : findEquipment(message);
  const fallbackId = isLikelyContextFollowup(message) ? state.lastItemId : null;
  const selectedId = globalDirectId || contextualId || explicit?.id || fallbackId || null;
  const selectedItem = selectedId ? EQUIPMENT[selectedId] : null;

  if (selectedItem && isMulcherId(selectedId) && isMulcherComboRequest(message)) {
    const days = getDays(message, state);
    const delivery = deliveryInfo(message);
    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      state.awaitingDeliveryLocation = false;
    }
    const deliveryFee = delivery ? delivery.fee : isDeliveryQuestion(message) ? state.lastDeliveryFee || 0 : 0;
    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;
    const comboIds = comboIdsForMulcher(selectedId);
    state.lastDays = days;
    state.awaitingMulcherChoice = false;
    state.awaitingMulcherComboSelection = false;
    state.pendingMulcherIds = [];
    state.lastBundleItemIds = comboIds;
    rememberSelected(state, selectedId);
    return quoteBundleText(comboIds, days, { deliveryFee, deliveryPlace });
  }

  if (selectedItem && isMulcherId(selectedId) && isPriceQuestion(message) && !isMulcherAttachmentOnlyRequest(message)) {
    rememberSelected(state, selectedId);
    state.awaitingMulcherChoice = true;
    state.pendingMulcherIds = [selectedId];
    return `Do you want pricing for just the mulcher attachment, or the skid steer + mulcher combo?\n\n${selectedItem.name} pairs with ${pairedMachineName(selectedId)} only.\n\nReply "attachment only" or "combo".`;
  }

  // Broad shared terms should show all options unless the user clearly selected one.
  if (!globalDirectId && category && !contextualId && isBroadCategoryRequest(message)) {
    const response = categoryResponse(category, state);
    if (response) return response;
  }

  if (selectedItem && isMoreInfoQuestion(message)) {
    rememberSelected(state, selectedId);
    return itemMoreInfoText(selectedItem);
  }

  if (selectedItem && isWeightQuestion(message)) {
    rememberSelected(state, selectedId);
    return selectedItem.weight ? `${selectedItem.name} weighs about ${selectedItem.weight.toLocaleString()} lb.\n\n${CONTACT_TEXT}` : `I don't have the weight stored for ${selectedItem.name}. Check ${WEBSITE} and search "${itemKeyword(selectedItem)}", or call 850-295-5373.`;
  }

  if (selectedItem && isThumbQuestion(message)) {
    rememberSelected(state, selectedId);
    return selectedItem.thumb || `I don't have thumb details stored for ${selectedItem.name}. Check ${WEBSITE} and search "${itemKeyword(selectedItem)}", or call 850-295-5373.`;
  }

  if (selectedItem && isBucketOrCabQuestion(message)) {
    rememberSelected(state, selectedId);
    return itemMoreInfoText(selectedItem);
  }

  const delivery = deliveryInfo(message);
  const wantsDelivery = isDeliveryQuestion(message);

  if (isPriceQuestion(message)) {
    if (category && shouldForceCategoryChoice(message, category)) {
      const response = categorySelectionPrompt(category, state, "I need to know which option you want priced.");
      if (response) return response;
    }
    if (!selectedItem) return shortGuidedClarification("I need to know which machine or attachment you want priced.");
    rememberSelected(state, selectedId);
    const days = getDays(message, state);
    state.lastDays = days;
    if (delivery) {
      state.lastDeliveryFee = delivery.fee;
      state.lastDeliveryPlace = delivery.placeLabel;
      state.awaitingDeliveryLocation = false;
    }
    const deliveryFee = delivery ? delivery.fee : wantsDelivery ? state.lastDeliveryFee || 0 : 0;
    const deliveryPlace = delivery?.placeLabel || state.lastDeliveryPlace;
    return quoteText(selectedItem, days, { deliveryFee, deliveryPlace });
  }

  if (wantsDelivery && state.lastBundleItemIds?.length) {
    const deliveryOnly = deliveryInfo(message);
    if (!deliveryOnly) return handleDeliveryOnly(message, state);
    state.lastDeliveryFee = deliveryOnly.fee;
    state.lastDeliveryPlace = deliveryOnly.placeLabel;
    state.awaitingDeliveryLocation = false;
    const days = getDays(message, state);
    return quoteBundleText(state.lastBundleItemIds, days, { deliveryFee: deliveryOnly.fee, deliveryPlace: deliveryOnly.placeLabel });
  }

  if (wantsDelivery) return handleDeliveryOnly(message, state);

  if (wantsTrailerAddedToTotal(message) || wantsOurTrailerIncluded(message)) {
    if (!selectedItem) return "Which machine are you referring to?";

    if (isDumpTrailerItem(selectedItem)) {
      return `${selectedItem.name} is rented as its own trailer item, so the $49.99 machine-hauling trailer surcharge does not apply.`;
    }

    const delivery = deliveryInfo(message);
    const wantsDelivery = isDeliveryQuestion(message);
    const deliveryFee = delivery ? delivery.fee : wantsDelivery ? state.lastDeliveryFee || 0 : 0;

    if (deliveryFee) {
      return `For delivery jobs, we do not add the trailer surcharge. ${trailerOptionText()}`;
    }

    rememberSelected(state, selectedId);
    const days = getDays(message, state);
    state.lastDays = days;
    return quoteText(selectedItem, days, { trailerFee: trailerSurcharge(days) });
  }

  if (isTrailerQuestion(message)) {
    if (isMachineHaulingTrailerRequest(message)) {
      const priorId = state.lastMachineItemId || state.lastSelectedItemId || state.lastItemId || null;
      const priorItem = priorId ? EQUIPMENT[priorId] : null;

      if (priorItem && !isDumpTrailerItem(priorItem) && (isPriceQuestion(message) || wantsTrailerAddedToTotal(message) || wantsOurTrailerIncluded(message))) {
        const days = getDays(message, state);
        state.lastDays = days;
        rememberSelected(state, priorId);
        return quoteText(priorItem, days, { trailerFee: trailerSurcharge(days) });
      }

      return trailerOptionText();
    }

    const response = categoryResponse("trailer", state);
    if (response) return response;

    return trailerOptionText();
  }

  if (bookingIntent(message)) {
    if (selectedItem) rememberSelected(state, selectedId);
    return CONTACT_TEXT;
  }

  const matches = findAllEquipment(message);
  if (!selectedId && matches.length > 1) {
    state.lastCategory = "multi_match";
    state.lastCategoryItems = matches;
    state.lastItemId = null;
    return `We have these options:\n\n${formatOptions(matches)}\n\nWhich one are you interested in?`;
  }

  if (category && !selectedId) {
    const response = categoryResponse(category, state);
    if (response) return response;
  }

  if (selectedItem) {
    rememberSelected(state, selectedId);

    if (isMulcherId(selectedId)) {
      state.awaitingMulcherChoice = true;
      state.pendingMulcherIds = [selectedId];
      return `${itemBasicText(selectedItem)}

${mulcherChoicePrompt([selectedId])}`;
    }

    return itemBasicText(selectedItem);
  }

  return shortGuidedClarification("I’m not confident enough to answer that accurately yet.");
}

async function sendMessage(senderId, text) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${PAGE_ACCESS_TOKEN}` },
    body: JSON.stringify({ recipient: { id: senderId }, messaging_type: "RESPONSE", message: { text: String(text || "Can you clarify what you're looking to rent?") } })
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
          const reply = await handleMessage(message, senderId);
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
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.get("/", (_req, res) => res.status(200).send("Messenger webhook is running."));

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Messenger webhook listening on port ${PORT}`));
}
