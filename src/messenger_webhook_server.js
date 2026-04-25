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

const WEBSITE = "www.bigbendrentals.net";
const CONTACT_TEXT = "Call 850-295-5373 or book online at www.bigbendrentals.net.";

const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastSelectedItemId: null,
      lastDays: 1,
      lastCategory: null,
      lastCategoryItems: [],
      lastDeliveryFee: 0,
      lastDeliveryPlace: null,
      awaitingDeliveryLocation: false,
      awaitingMulcherChoice: false,
      pendingMulcherIds: [],
      awaitingMulcherComboSelection: false,
      lastBundleItemIds: []
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

function categoryFromText(message) {
  const t = safeNormalize(message);
  if (/\baugers?\b/.test(t) || t.includes("post hole")) return "auger";
  if (t.includes("scissor")) return "scissor_lift";
  if (t.includes("boom lift") || t.includes("boom lifts") || t.includes("man lift")) return "boom_lift";
  if (t.includes("mini skid") || t.includes("boxer")) return "mini_skid";
  if (t.includes("skid steer") || t.includes("skid steers") || t.includes("track loader")) return "skid_steer";
  if (/\bexcavators?\b/.test(t) || t.includes("trackhoe")) return "excavator";
  if (/\bforklifts?\b/.test(t) || t.includes("fork lift") || t.includes("lift king")) return "forklift";
  if (t.includes("telehandler") || t.includes("lull")) return "telehandler";
  if (t.includes("pressure washer") || t.includes("power washer")) return "pressure_washer";
  if (/\bcompactors?\b/.test(t)) return "compactor";
  if (/\bmowers?\b/.test(t) || t.includes("zero turn")) return "mower";
  if (/\bmulchers?\b/.test(t) || t.includes("forestry mulcher") || t.includes("hm316") || t.includes("mh60d")) return "mulcher";
  if (t.includes("brush cutter") || t.includes("bush hog") || t.includes("rotary cutter")) return "brush_cutter";
  if (t.includes("trencher") || t.includes("ditch witch")) return "trencher";
  if (t.includes("drain snake") || t.includes("drain cleaner") || t.includes("electric eel")) return "drain_cleaner";
  if (/\btrailers?\b/.test(t)) return "trailer";
  if (/\bpumps?\b/.test(t)) return "pump";
  if (/\bcompressors?\b/.test(t)) return "compressor";
  if (t.includes("concrete") || t.includes("tile saw") || t.includes("core drill")) return "concrete";
  return normalizeCategory(findCategory(message));
}

function categoryIds(category) {
  const key = normalizeCategory(category);
  if (!key) return [];
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

function quoteText(item, days, extras = {}) {
  const totals = quoteTotals(item, days, extras);
  const locationText = totals.deliveryFee ? ` delivered to ${extras.deliveryPlace || "that area"}` : "";
  const trailerText = totals.trailerFee ? " with trailer" : "";
  const lines = [`${item.name} total for ${durationLabel(days)}${locationText}${trailerText}:`, "", `Rental: ${money(totals.rental)}`];
  if (totals.protection) lines.push(`Rental Protection Plan: ${money(totals.protection)}`);
  if (totals.deliveryFee) lines.push(`Delivery: ${money(totals.deliveryFee)}`);
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
  const deliveryFee = extras.deliveryFee || 0;
  const trailerFee = extras.trailerFee || 0;

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


export function handleMessage(message, senderId = "local-test") {
  const state = getState(senderId);
  const category = categoryFromText(message);

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
  const selectedId = globalDirectId || contextualId || explicit?.id || state.lastItemId || null;
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
    if (!selectedItem) return "Which machine are you referring to?";
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

  if (wantsTrailerAddedToTotal(message)) {
    if (!selectedItem) return "Which machine are you referring to?";
    rememberSelected(state, selectedId);
    const days = getDays(message, state);
    state.lastDays = days;
    return quoteText(selectedItem, days, { trailerFee: trailerSurcharge(days) });
  }

  if (isTrailerQuestion(message)) {
    return "We can supply a trailer for a $49.99 surcharge for the first day and $15.00 for each additional day. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.";
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

  return `Can you clarify what you're looking to rent? You can also check ${WEBSITE} and search for the equipment name.`;
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
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) return res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

app.get("/", (_req, res) => res.status(200).send("Messenger webhook is running."));

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Messenger webhook listening on port ${PORT}`));
}
