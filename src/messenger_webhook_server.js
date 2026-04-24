import express from "express";
import dotenv from "dotenv";
import { EQUIPMENT, ITEM_IDS, MULCHER_COMBOS, CATEGORY_ITEMS } from "./inventory.js";
import {
  money,
  trailerPolicyText,
  buildBundleQuote,
  multiDayQuote,
  applyTrailerToQuote
} from "./pricing.js";
import {
  normalize,
  containsAny,
  parseDays,
  isMonthlyRequest,
  isPriceQuestion,
  isFinalTotalFollowup,
  isWeightQuestion,
  isThumbQuestion,
  isBucketOrCabQuestion,
  bookingIntent,
  isDeliveryQuestion,
  isTrailerQuestion,
  isDeliveryPriceQuestion,
  isTrailerIncludedQuestion,
  wantsTrailerAddedToTotal,
  wantsDeliveryAddedToTotal,
  deliveryInfo,
  arrangedBoomLiftIntent,
  isMulcherQuestion,
  isMulcherComboQuestion,
  isMulcherOnlyQuestion,
  isReferentialFollowup,
  findEquipment,
  findAllEquipment,
  findCategory,
  hasExplicitIntentOverride
} from "./intent.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";

if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
  console.error("Missing META_VERIFY_TOKEN or META_PAGE_ACCESS_TOKEN in environment variables.");
  process.exit(1);
}

const DAVE_PHONE = "850-843-2245";
const WEBSITE = "www.bigbendrentals.net";
const DELIVERY_RADIUS_MILES = 75;

const sessions = new Map();

function getSession(psid) {
  if (!sessions.has(psid)) {
    sessions.set(psid, {
      lastId: null,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [],
      lastQuote: null,
      lastMulcherComboChoice: null,
      lastDeliveryFee: 0,
      lastDeliveryPlace: null,
      updatedAt: Date.now()
    });
  }

  return sessions.get(psid);
}

function updateSession(psid, updates) {
  const current = getSession(psid);
  sessions.set(psid, { ...current, ...updates, updatedAt: Date.now() });
}

function clearCategoryFields(patch = {}) {
  return { ...patch, lastCategory: null, lastCategoryItems: [] };
}

function preserveContext(state, extra = {}) {
  return {
    lastId: state.lastId,
    lastCategory: state.lastCategory,
    lastCategoryItems: state.lastCategoryItems,
    lastQuotedItems: state.lastQuotedItems,
    lastQuote: state.lastQuote,
    lastMulcherComboChoice: state.lastMulcherComboChoice,
    lastDeliveryFee: state.lastDeliveryFee,
    lastDeliveryPlace: state.lastDeliveryPlace,
    ...extra
  };
}

function formatCategoryQuote(ids) {
  return ids
    .map((id) => {
      const item = EQUIPMENT[id];
      if (!item) return null;
      return `${item.name} (${item.day ? `${money(item.day)}/day` : "pricing available on request"})`;
    })
    .filter(Boolean)
    .join(", ");
}

function formatMatchedOptions(ids) {
  const uniqueIds = [...new Set(ids)];

  return uniqueIds
    .map((id) => {
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

function categoryDisambiguationText(ids, verb = "mean") {
  const names = ids
    .map((id) => EQUIPMENT[id]?.name)
    .filter(Boolean)
    .join(", ");

  return `Which machine do you ${verb} — ${names}?`;
}

function schedulingText(item) {
  if (item?.keyword) {
    return `For availability or scheduling, call or text Dave at ${DAVE_PHONE}. You can also check the website at ${WEBSITE} and search for "${item.keyword}".`;
  }

  return `For availability or scheduling, call or text Dave at ${DAVE_PHONE}. You can also check the website at ${WEBSITE}.`;
}

function unknownItemFallback() {
  return `Sometimes my inventory database is incomplete, so you may need to check the website at ${WEBSITE} for that item.`;
}

function trailerWeightText(state) {
  const item = state.lastId ? EQUIPMENT[state.lastId] : null;

  if (item?.weight) {
    return `${item.name} weighs ${item.weight.toLocaleString()} lb. Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.`;
  }

  return "Clients can supply their own trailer if it meets the weight requirements for hauling the equipment. If you tell me which machine you mean, I can give you its weight.";
}

function isSameItems(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((id) => b.includes(id));
}

function getLastMulcherComboChoice(state) {
  if (state.lastMulcherComboChoice === "cat" || state.lastMulcherComboChoice === "jd") {
    return state.lastMulcherComboChoice;
  }

  if (state.lastQuote?.itemIds) {
    if (isSameItems(state.lastQuote.itemIds, MULCHER_COMBOS.cat)) return "cat";
    if (isSameItems(state.lastQuote.itemIds, MULCHER_COMBOS.jd)) return "jd";
  }

  if (state.lastQuotedItems?.length) {
    if (isSameItems(state.lastQuotedItems, MULCHER_COMBOS.cat)) return "cat";
    if (isSameItems(state.lastQuotedItems, MULCHER_COMBOS.jd)) return "jd";
  }

  return null;
}

function mentionsCatSide(text) {
  return (
    text === "cat" ||
    text.includes("the cat") ||
    containsAny(text, ["cat combo", "cat mulcher combo", "caterpillar", "cat 265", "hm316", "cat mulcher"])
  );
}

function mentionsJdSide(text) {
  return (
    text === "john deere" ||
    text === "jd" ||
    text.includes("the john deere") ||
    text.includes("the jd") ||
    containsAny(text, ["john deere combo", "john deere mulcher combo", "jd combo", "333p", "mh60d", "jd mulcher", "john deere mulcher"])
  );
}

function detectMulcherComboChoice(message, state) {
  const text = normalize(message);
  const lastCombo = getLastMulcherComboChoice(state);
  const comboish = containsAny(text, ["combo", "mulcher combo", "mulcher", "skid steer"]) || lastCombo !== null;

  if (!comboish && state.lastCategory !== "mulcher_combo") return null;
  if (mentionsCatSide(text)) return "cat";
  if (mentionsJdSide(text)) return "jd";

  if (
    lastCombo === "cat" &&
    containsAny(text, ["what about the jd", "what about jd", "what about john deere", "tell me about the jd", "tell me about john deere"])
  ) {
    return "jd";
  }

  if (
    lastCombo === "jd" &&
    containsAny(text, ["what about the cat", "what about cat", "tell me about the cat", "tell me about cat"])
  ) {
    return "cat";
  }

  return null;
}

function buildMulcherComboResponse(choice, days, deliveryFee = 0, variant = "quote") {
  const comboIds = MULCHER_COMBOS[choice];
  const quote = buildBundleQuote(comboIds, days, deliveryFee);

  if (choice === "cat") {
    if (variant === "details") {
      return {
        text: `${quote.text}\n\nThe CAT HM316 Forestry Mulcher can be rented by itself or paired with the CAT 265 only. The Boxer and CAT 239 cannot be used with either mulcher.`,
        quote
      };
    }

    return { text: quote.text, quote };
  }

  if (variant === "details") {
    return {
      text: `${quote.text}\n\nThe John Deere MH60D Forestry Mulcher can be rented by itself or paired with the John Deere 333P only. The Boxer and CAT 239 cannot be used with either mulcher.`,
      quote
    };
  }

  return { text: quote.text, quote };
}

function isDetailRequest(message) {
  const text = normalize(message);
  return containsAny(text, ["tell me about", "what about", "details", "info", "information", "more about"]);
}

function rebuildLastQuoteWithAddons(state, message) {
  if (!state.lastQuote?.itemIds?.length) return null;

  const requestedDays = parseDays(message) || state.lastQuote.days || 1;
  const delivery = deliveryInfo(message);
  const requestedDeliveryFee = delivery?.fee || state.lastQuote.deliveryFee || state.lastDeliveryFee || 0;
  const addDelivery = wantsDeliveryAddedToTotal(message) || Boolean(state.lastQuote.deliveryFee);
  const addTrailer = wantsTrailerAddedToTotal(message) || Boolean(state.lastQuote.trailerFee);

  let quote;

  if (state.lastQuote.itemIds.length >= 2) {
    quote = buildBundleQuote(state.lastQuote.itemIds, requestedDays, addDelivery ? requestedDeliveryFee : 0);
  } else {
    const singleId = state.lastQuote.itemIds[0];
    const singleItem = EQUIPMENT[singleId];
    if (!singleItem) return null;
    quote = multiDayQuote(singleItem, singleId, requestedDays, addDelivery ? requestedDeliveryFee : 0);
  }

  if (addTrailer) {
    quote = applyTrailerToQuote(quote, requestedDays).quote;
  }

  return {
    quote,
    requestedDeliveryFee,
    deliveryPlace: delivery?.placeLabel || state.lastDeliveryPlace
  };
}

function singleQuote(item, id) {
  const lines = [];

  if (id === ITEM_IDS.JLG_ET500J) {
    lines.push(`${item.name}. Please check the website at ${WEBSITE} for current pricing.`);
  } else if (id === ITEM_IDS.TELEHANDLER) {
    lines.push(`${item.name} is ${money(item.day)} a day and ${money(item.week)} for the week.`);
    lines.push(`Monthly pricing is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`);
  } else {
    if (item.day) lines.push(`${item.name} is ${money(item.day)} a day.`);
    if (item.week) lines.push(`${money(item.week)} for the week.`);
    if (item.month && item.category === "scissor_lift") lines.push(`${money(item.month)} for the month.`);
  }

  if (item.category === "scissor_lift") {
    lines.push("These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.");
  }

  if (item.protection) lines.push("Rental Protection Plan is $49.99 and is required on that machine.");
  if (id === ITEM_IDS.CAT_MULCHER) lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");
  if (id === ITEM_IDS.BOXER) lines.push("Bucket is included.");
  if (item.details) lines.push(item.details);

  return lines.join(" ");
}

function reply(message, state) {
  const text = normalize(message);
  const explicitFound = findEquipment(message);
  const matchedIds = findAllEquipment(message);
  const category = findCategory(message);

// SMART FILTERING + PRIORITIZED SORTING
if (
  matchedIds.length > 1 &&
  !containsAny(text, ["combo", "with skid steer", "with a skid steer", "package"])
) {

  const filtered = matchedIds.filter(id => {
    const name = EQUIPMENT[id]?.name?.toLowerCase() || "";

    if (text.includes("mini") && !name.includes("mini")) return false;
    if (text.includes("skid") && !name.includes("skid")) return false;
    if (text.includes("auger") && !name.includes("auger")) return false;

    return true;
  });

  const finalList = filtered.length > 0 ? filtered : matchedIds;

  finalList.sort((a, b) => {
    const aName = EQUIPMENT[a]?.name?.toLowerCase() || "";
    const bName = EQUIPMENT[b]?.name?.toLowerCase() || "";

    const score = (name) =>
      (text.includes("mini") && name.includes("mini") ? 2 : 0) +
      (text.includes("skid") && name.includes("skid") ? 2 : 0) +
      (text.includes("auger") && name.includes("auger") ? 2 : 0);

    return score(bName) - score(aName);
  });

  return preserveContext(state, {
    text: `We have these options:\n\n${formatMatchedOptions(finalList)}\n\nWhich one are you interested in?`,
    lastId: null,
    lastCategory: "multi_match",
    lastCategoryItems: finalList,
    lastQuotedItems: finalList
  });
}

  const finalList = filtered.length > 0 ? filtered : matchedIds;

  finalList.sort((a, b) => {
    const aName = EQUIPMENT[a]?.name?.toLowerCase() || "";
    const bName = EQUIPMENT[b]?.name?.toLowerCase() || "";

    const score = (name) =>
      (text.includes("mini") && name.includes("mini") ? 2 : 0) +
      (text.includes("skid") && name.includes("skid") ? 2 : 0) +
      (text.includes("auger") && name.includes("auger") ? 2 : 0);

    return score(bName) - score(aName);
  });

  return preserveContext(state, {
    text: `We have these options:\n\n${formatMatchedOptions(finalList)}\n\nWhich one are you interested in?`,
    lastId: null,
    lastCategory: "multi_match",
    lastCategoryItems: finalList,
    lastQuotedItems: finalList
  });
}
  const FinalList = filtered.length > 0 ? filtered : matchedIds;

  // Step 2: score + sort best matches to top
  FinalList.sort((a, b) => {
    const aName = EQUIPMENT[a].name.toLowerCase();
    const bName = EQUIPMENT[b].name.toLowerCase();

    const score = (name) =>
      (text.includes("mini") && name.includes("mini") ? 2 : 0) +
      (text.includes("skid") && name.includes("skid") ? 2 : 0) +
      (text.includes("auger") && name.includes("auger") ? 2 : 0);

    return score(bName) - score(aName);
  });

  return `We have these options:\n\n${formatMatchedOptions(FinalList)}\n\nWhich one are you interested in?`;
}

  // Step 1: filter based on keywords in user message
  const filtered = matchedIds.filter(id => {
    const name = EQUIPMENT[id].name.toLowerCase();

    if (text.includes("mini") && !name.includes("mini")) return false;
    if (text.includes("skid") && !name.includes("skid")) return false;
    if (text.includes("auger") && !name.includes("auger")) return false;

    return true;
  });

  const FinalList = filtered.length > 0 ? filtered : matchedIds;

  // Step 2: score + sort best matches to top
  FinalList.sort((a, b) => {
    const aName = EQUIPMENT[a].name.toLowerCase();
    const bName = EQUIPMENT[b].name.toLowerCase();

    const score = (name) =>
      (text.includes("mini") && name.includes("mini") ? 2 : 0) +
      (text.includes("skid") && name.includes("skid") ? 2 : 0) +
      (text.includes("auger") && name.includes("auger") ? 2 : 0);

    return score(bName) - score(aName);
  });

  return `We have these options:\n\n${formatMatchedOptions(FinalList)}\n\nWhich one are you interested in?`;
}
   return preserveContext(state, {
  text: `We have these options:\n\n${formatMatchedOptions(finalList)}\n\nWhich one are you interested in?`,
  lastId: null,
  lastCategory: "multi_match",
  lastCategoryItems: finalList,
  lastQuotedItems: finalList
});
  }

  const explicitIntentOverride = hasExplicitIntentOverride(message);
  const comboChoice = detectMulcherComboChoice(message, state);
  const useLastId =
    !explicitFound &&
    !explicitIntentOverride &&
    !comboChoice &&
    !isTrailerQuestion(message) &&
    isReferentialFollowup(message);

  const id = explicitFound ? explicitFound.id : useLastId ? state.lastId : null;
  const item = id ? EQUIPMENT[id] : null;
  const days = parseDays(message) || 1;
  const delivery = deliveryInfo(message);
  const deliveryFee = delivery?.fee || 0;
  const effectiveDeliveryFee = deliveryFee || state.lastDeliveryFee || 0;
  const wantsDeliveryTotal = wantsDeliveryAddedToTotal(message);
  const wantsTrailerTotal = wantsTrailerAddedToTotal(message);

  if (delivery && state.lastCategory === "delivery_followup") {
    return preserveContext(state, {
      text: `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`,
      lastCategory: null,
      lastCategoryItems: [],
      lastDeliveryFee: delivery.fee,
      lastDeliveryPlace: delivery.placeLabel
    });
  }

  if (state.lastQuote && !explicitFound && !comboChoice && isFinalTotalFollowup(message)) {
    const rebuilt = rebuildLastQuoteWithAddons(state, message);

    if (rebuilt) {
      return clearCategoryFields({
        text: rebuilt.quote.text,
        lastId: state.lastId,
        lastQuotedItems: rebuilt.quote.itemIds,
        lastQuote: rebuilt.quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: rebuilt.requestedDeliveryFee || state.lastDeliveryFee,
        lastDeliveryPlace: rebuilt.deliveryPlace
      });
    }
  }

  if (isMulcherQuestion(message)) {
    if (isMulcherComboQuestion(message)) {
      return preserveContext(state, {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P],
        lastQuotedItems: []
      });
    }

    if (isMulcherOnlyQuestion(message)) {
      return preserveContext(state, {
        text: `We have a CAT HM316 Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.CAT_MULCHER].day)}/day) and a John Deere MH60D Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.JD_MULCHER].day)}/day). The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.`,
        lastId: null,
        lastCategory: "mulcher",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.JD_MULCHER],
        lastQuotedItems: []
      });
    }

    return preserveContext(state, {
      text: "Do you need the mulcher and skid steer or just the mulcher?",
      lastId: null,
      lastCategory: "mulcher",
      lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.JD_MULCHER],
      lastQuotedItems: []
    });
  }

  if (state.lastCategory === "mulcher" && isMulcherComboQuestion(message)) {
    return preserveContext(state, {
      text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
      lastId: null,
      lastCategory: "mulcher_combo",
      lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P],
      lastQuotedItems: []
    });
  }

  if (state.lastCategory === "mulcher_combo" && text === "both") {
    return preserveContext(state, {
      text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
      lastId: null,
      lastCategory: "mulcher_combo",
      lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P]
    });
  }

  if (comboChoice) {
    const variant = isDetailRequest(message) ? "details" : "quote";
    let response = buildMulcherComboResponse(
      comboChoice,
      days,
      wantsDeliveryTotal || deliveryFee ? effectiveDeliveryFee : 0,
      variant
    );

    if (wantsTrailerTotal) response = applyTrailerToQuote(response.quote, days);

    const comboIds = MULCHER_COMBOS[comboChoice];
    const representativeId = comboChoice === "cat" ? ITEM_IDS.CAT_265 : ITEM_IDS.JD_333P;

    return clearCategoryFields({
      text: response.text,
      lastId: representativeId,
      lastQuotedItems: comboIds,
      lastQuote: response.quote,
      lastMulcherComboChoice: comboChoice,
      lastDeliveryFee: effectiveDeliveryFee,
      lastDeliveryPlace: delivery?.placeLabel || state.lastDeliveryPlace
    });
  }

  if (text === "cat" || text === "the cat") {
    return preserveContext(state, {
      text: "Which CAT machine are you referring to — CAT 265 skid steer, CAT HM316 mulcher, CAT 301.7 excavator, or CAT 307.5 excavator?",
      lastId: null,
      lastCategory: "cat_disambiguation",
      lastCategoryItems: [ITEM_IDS.CAT_265, ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_3017, ITEM_IDS.CAT_3075]
    });
  }

  if (isDeliveryQuestion(message) && !isPriceQuestion(message) && !wantsDeliveryTotal) {
    if (isDeliveryPriceQuestion(message)) {
      if (delivery) {
        return preserveContext(state, {
          text: `Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`,
          lastCategory: null,
          lastCategoryItems: [],
          lastDeliveryFee: delivery.fee,
          lastDeliveryPlace: delivery.placeLabel
        });
      }

      return preserveContext(state, {
        text: "What city or area are you in? Delivery pricing depends on location.",
        lastId: item ? id : state.lastId,
        lastCategory: "delivery_followup",
        lastCategoryItems: [],
        lastQuotedItems: item ? [id] : state.lastQuotedItems
      });
    }

    if (delivery) {
      return preserveContext(state, {
        text: `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`,
        lastCategory: null,
        lastCategoryItems: [],
        lastDeliveryFee: delivery.fee,
        lastDeliveryPlace: delivery.placeLabel
      });
    }

    return preserveContext(state, {
      text: `We deliver within about a ${DELIVERY_RADIUS_MILES}-mile radius. What city or area are you in? Delivery pricing depends on location.`,
      lastId: item ? id : state.lastId,
      lastCategory: "delivery_followup",
      lastCategoryItems: [],
      lastQuotedItems: item ? [id] : state.lastQuotedItems
    });
  }

  if (isTrailerQuestion(message)) {
    const requestedDays = parseDays(message) || state.lastQuote?.days || 1;

    if (state.lastQuote && wantsTrailerTotal) {
      const response = applyTrailerToQuote(state.lastQuote, requestedDays);
      return preserveContext(state, { text: response.text, lastQuote: response.quote });
    }

    if (isTrailerIncludedQuestion(message)) {
      return preserveContext(state, {
        text: `No, the trailer does not come with it automatically. ${trailerPolicyText(requestedDays)}`
      });
    }

    if (containsAny(text, ["weight requirements", "what trailer do i need", "what size trailer", "how heavy is it"])) {
      return preserveContext(state, { text: trailerWeightText(state) });
    }

    return preserveContext(state, { text: trailerPolicyText(requestedDays) });
  }

  if (matchedIds.length >= 2 && isPriceQuestion(message)) {
    let quote = buildBundleQuote(matchedIds, days, wantsDeliveryTotal || deliveryFee ? effectiveDeliveryFee : 0);
    if (wantsTrailerTotal) quote = applyTrailerToQuote(quote, days).quote;

    return clearCategoryFields({
      text: quote.text,
      lastId: matchedIds[0],
      lastQuotedItems: matchedIds,
      lastQuote: quote,
      lastMulcherComboChoice: state.lastMulcherComboChoice,
      lastDeliveryFee: effectiveDeliveryFee,
      lastDeliveryPlace: delivery?.placeLabel || state.lastDeliveryPlace
    });
  }

  if (
    state.lastQuote &&
    !explicitFound &&
    !category &&
    !explicitIntentOverride &&
    !comboChoice &&
    (isPriceQuestion(message) || parseDays(message) !== null || text === "a week" || text === "week")
  ) {
    const rebuilt = rebuildLastQuoteWithAddons(state, message);

    if (rebuilt) {
      return clearCategoryFields({
        text: rebuilt.quote.text,
        lastId: state.lastId,
        lastQuotedItems: rebuilt.quote.itemIds,
        lastQuote: rebuilt.quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: rebuilt.requestedDeliveryFee || state.lastDeliveryFee,
        lastDeliveryPlace: rebuilt.deliveryPlace
      });
    }
  }

  if (category === "scissor_lift" && !explicitFound) {
    return preserveContext(state, {
      text:
        `We have two slab scissor lifts available:\n\n` +
        `• Genie GS1930 – ${money(EQUIPMENT[ITEM_IDS.GS1930].day)}/day, ${money(EQUIPMENT[ITEM_IDS.GS1930].week)}/week, ${money(EQUIPMENT[ITEM_IDS.GS1930].month)}/month\n` +
        `• Genie GS3246 – ${money(EQUIPMENT[ITEM_IDS.GS3246].day)}/day, ${money(EQUIPMENT[ITEM_IDS.GS3246].week)}/week, ${money(EQUIPMENT[ITEM_IDS.GS3246].month)}/month\n\n` +
        `These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.`,
      lastId: null,
      lastCategory: "scissor_lift",
      lastCategoryItems: CATEGORY_ITEMS.scissor_lift
    });
  }

  if (category === "boom_lift" && !explicitFound) {
    return preserveContext(state, {
      text: `We have a Genie Z45 Articulating Boom Lift (${money(EQUIPMENT[ITEM_IDS.GENIE_Z45].day)}/day) and a JLG ET500J Towable 50' Boom Lift. For current ET500J pricing, please check the website at ${WEBSITE}. If you need a larger, taller, or specialty boom lift, we can arrange one. Please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastId: null,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift
    });
  }

  if (category === "excavator" && !explicitFound) {
    return preserveContext(state, {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.excavator)}.`,
      lastId: null,
      lastCategory: "excavator",
      lastCategoryItems: CATEGORY_ITEMS.excavator
    });
  }

  if (category === "skid_steer" && !explicitFound) {
    return preserveContext(state, {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.skid_steer)}.`,
      lastId: null,
      lastCategory: "skid_steer",
      lastCategoryItems: CATEGORY_ITEMS.skid_steer
    });
  }

  if (category === "telehandler" && !explicitFound) {
    return preserveContext(state, {
      text: `We have a JLG 6K Telehandler for ${money(EQUIPMENT[ITEM_IDS.TELEHANDLER].day)}/day and ${money(EQUIPMENT[ITEM_IDS.TELEHANDLER].week)}/week. Monthly pricing is quoted by Dave based on current market conditions.`,
      lastId: ITEM_IDS.TELEHANDLER,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [ITEM_IDS.TELEHANDLER],
      lastQuote: buildBundleQuote([ITEM_IDS.TELEHANDLER], 1, 0)
    });
  }

  if (category === "forklift" && !explicitFound) {
    return preserveContext(state, {
      text: "Yes—we have a standard forklift, a rough-terrain forklift, and a telehandler. Are you looking for a warehouse-style forklift, rough-ground forklift, or a lull?",
      lastId: null,
      lastCategory: "forklift",
      lastCategoryItems: [ITEM_IDS.FORKLIFT, ITEM_IDS.LIFT_KING, ITEM_IDS.TELEHANDLER]
    });
  }

  if (category === "pressure_washer" && !explicitFound) {
    return preserveContext(state, {
      text: `Yes, we have a pressure washer for ${money(EQUIPMENT[ITEM_IDS.PRESSURE_WASHER].day)} a day. We also have a surface cleaner for ${money(EQUIPMENT[ITEM_IDS.SURFACE_CLEANER].day)} a day for flatwork.`,
      lastId: ITEM_IDS.PRESSURE_WASHER,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [ITEM_IDS.PRESSURE_WASHER],
      lastQuote: buildBundleQuote([ITEM_IDS.PRESSURE_WASHER], 1, 0)
    });
  }

  if ((category === "boom_lift" || state.lastCategory === "boom_lift" || item?.category === "boom_lift") && arrangedBoomLiftIntent(message)) {
    return preserveContext(state, {
      text: `We can arrange larger or specialty boom lifts if needed. Specialty equipment is handled separately, so please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift
    });
  }

  if (bookingIntent(message) && !item && state.lastCategoryItems?.length > 1) {
    return preserveContext(state, {
      text: categoryDisambiguationText(state.lastCategoryItems, "want to schedule")
    });
  }

  if (item) {
    if (bookingIntent(message)) {
      return clearCategoryFields({
        text: schedulingText(item),
        lastId: id,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: state.lastDeliveryFee,
        lastDeliveryPlace: state.lastDeliveryPlace
      });
    }

    if (isMonthlyRequest(message) && id === ITEM_IDS.TELEHANDLER) {
      return clearCategoryFields({
        text: `Monthly pricing for ${item.name} is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`,
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: state.lastDeliveryFee,
        lastDeliveryPlace: state.lastDeliveryPlace
      });
    }

    if (isWeightQuestion(message)) {
      if (item.weight) {
        return clearCategoryFields({
          text: `${item.name} weighs ${item.weight.toLocaleString()} lb.`,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote,
          lastMulcherComboChoice: state.lastMulcherComboChoice,
          lastDeliveryFee: state.lastDeliveryFee,
          lastDeliveryPlace: state.lastDeliveryPlace
        });
      }

      return clearCategoryFields({
        text: item.details || singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: state.lastDeliveryFee,
        lastDeliveryPlace: state.lastDeliveryPlace
      });
    }

    if (isThumbQuestion(message)) {
      return clearCategoryFields({
        text: item.thumb || `I don’t have a thumb listed on the ${item.name}. ${item.details || ""}`.trim(),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: state.lastDeliveryFee,
        lastDeliveryPlace: state.lastDeliveryPlace
      });
    }

    if (isBucketOrCabQuestion(message)) {
      return clearCategoryFields({
        text: item.details || singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: state.lastDeliveryFee,
        lastDeliveryPlace: state.lastDeliveryPlace
      });
    }

    if (isPriceQuestion(message)) {
      if (days > 1) {
        let quote = multiDayQuote(item, id, days, wantsDeliveryTotal || deliveryFee ? effectiveDeliveryFee : 0);
        if (wantsTrailerTotal) quote = applyTrailerToQuote(quote, days).quote;

        return clearCategoryFields({
          text: quote.text,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: quote,
          lastMulcherComboChoice: state.lastMulcherComboChoice,
          lastDeliveryFee: effectiveDeliveryFee,
          lastDeliveryPlace: delivery?.placeLabel || state.lastDeliveryPlace
        });
      }

      let quote = buildBundleQuote([id], 1, wantsDeliveryTotal || deliveryFee ? effectiveDeliveryFee : 0);
      if (wantsTrailerTotal) quote = applyTrailerToQuote(quote, 1).quote;

      return clearCategoryFields({
        text: quote.text,
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice,
        lastDeliveryFee: effectiveDeliveryFee,
        lastDeliveryPlace: delivery?.placeLabel || state.lastDeliveryPlace
      });
    }

    return clearCategoryFields({
      text: singleQuote(item, id),
      lastId: id,
      lastQuotedItems: [id],
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice,
      lastDeliveryFee: state.lastDeliveryFee,
      lastDeliveryPlace: state.lastDeliveryPlace
    });
  }

  if (!explicitFound && state.lastCategoryItems?.length > 1 && !explicitIntentOverride && !comboChoice && isReferentialFollowup(message)) {
    return preserveContext(state, {
      text: categoryDisambiguationText(state.lastCategoryItems, bookingIntent(message) ? "want to schedule" : "mean")
    });
  }

  return preserveContext(state, { text: unknownItemFallback() });
}

function addCloseLine(text) {
  text = String(text || "");

  if (!text.trim()) {
    return "Sorry, I had trouble reading that request. Please try asking another way.";
  }

  if (!text.includes("Total:")) return text;
  if (text.includes("Want me to get this reserved")) return text;
  return `${text}\n\nWant me to get this reserved for you?`;
}

function splitMessage(text, maxLen = 1800) {
  text = String(text || "");

  if (!text.trim()) {
    text = "Sorry, I had trouble reading that request. Please try asking another way.";
  }

  if (text.length <= maxLen) return [text];

  const parts = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let slice = remaining.slice(0, maxLen);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    if (breakAt > 200) slice = slice.slice(0, breakAt);
    parts.push(slice);
    remaining = remaining.slice(slice.length).trimStart();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

async function sendMessengerText(recipientId, text) {
  const chunks = splitMessage(text);

  for (const chunk of chunks) {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: chunk }
      })
    });

    const bodyText = await response.text();
    if (!response.ok) throw new Error(`Facebook send failed: ${response.status} ${bodyText}`);
  }
}

app.get("/", (_req, res) => {
  res.status(200).send("Messenger webhook is running.");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "page") return res.sendStatus(404);

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.sender?.id) continue;
        const senderId = event.sender.id;

        if (event.message?.text) {
          const session = getSession(senderId);
          const result = reply(event.message.text, session);

          updateSession(senderId, {
            lastId: result?.lastId !== undefined ? result.lastId : session.lastId,
            lastCategory: result?.lastCategory !== undefined ? result.lastCategory : session.lastCategory,
            lastCategoryItems: result?.lastCategoryItems !== undefined ? result.lastCategoryItems : session.lastCategoryItems,
            lastQuotedItems: result?.lastQuotedItems !== undefined ? result.lastQuotedItems : session.lastQuotedItems,
            lastQuote: result?.lastQuote !== undefined ? result.lastQuote : session.lastQuote,
            lastMulcherComboChoice: result?.lastMulcherComboChoice !== undefined ? result.lastMulcherComboChoice : session.lastMulcherComboChoice,
            lastDeliveryFee: result?.lastDeliveryFee !== undefined ? result.lastDeliveryFee : session.lastDeliveryFee,
            lastDeliveryPlace: result?.lastDeliveryPlace !== undefined ? result.lastDeliveryPlace : session.lastDeliveryPlace
          });

          const responseText = typeof result === "string" ? result : result?.text;
          await sendMessengerText(senderId, addCloseLine(responseText));
        }
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Messenger webhook listening on port ${PORT}`);
});
