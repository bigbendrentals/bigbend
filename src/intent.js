import { EQUIPMENT, CATEGORY_ALIASES } from "./inventory.js";

const STOP_WORDS = new Set(["the", "and", "for", "how", "much", "what", "about", "with", "you", "have", "rent", "rental", "more", "info", "details", "this", "that", "one", "do", "does", "can", "it", "is", "are", "price", "cost", "quote", "total", "need", "want", "please", "me", "my", "a", "an", "to", "of", "on", "in"]);

export function normalize(text) {
  let t = String(text || "").toLowerCase();
  t = t.replace(/[’']/g, "");
  t = t.replace(/skid steer4s/g, "skid steers");
  t = t.replace(/(\d+)[^\da-z]+(\d+[a-z]?)/g, "$1$2");
  t = t.replace(/cat\s*(\d+)\s*(\d+)/g, "cat $1$2");
  t = t.replace(/jd\s*(\d+)\s*([a-z])/g, "jd $1$2");
  t = t.replace(/john\s+deere\s*(\d+)\s*([a-z])/g, "john deere $1$2");
  t = t.replace(/[^a-z0-9\s.'-]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export function compact(text) { return normalize(text).replace(/[\s.-]/g, ""); }
export function containsAny(text, phrases) { const t = normalize(text); return phrases.some((phrase) => t.includes(normalize(phrase))); }

export function parseDays(text) {
  const t = normalize(text);
  const numeric = t.match(/\b(\d+)\s*day/);
  if (numeric) return Number(numeric[1]);
  if (t.includes("one day") || t === "1 day" || t === "a day") return 1;
  if (t.includes("two days") || t === "2 days") return 2;
  if (t.includes("three days") || t === "3 days") return 3;
  if (t.includes("four days") || t === "4 days") return 4;
  if (t.includes("five days") || t === "5 days") return 5;
  if (t.includes("six days") || t === "6 days") return 6;
  if (t.includes("seven days") || t === "7 days") return 7;
  if (t.includes("a week") || t.includes("one week") || t === "week" || t === "weekly") return 7;
  return null;
}

export function isMonthlyRequest(text) { const t = normalize(text); return t.includes("month") || t.includes("monthly"); }
export function isPriceQuestion(text) { return containsAny(text, ["how much", "what does it cost", "whats it cost", "what's it cost", "what is the cost", "what is the total", "what's the total", "total", "price", "pricing", "quote", "cost", "day rate", "daily rate", "rental rate", "a week", "week", "weekly", "monthly", "month"]) || parseDays(text) !== null; }
export function isWeightQuestion(text) { return containsAny(text, ["how heavy", "weight", "weigh", "what does it weigh", "how much does it weigh"]); }
export function isThumbQuestion(text) { return normalize(text).includes("thumb"); }
export function isBucketOrCabQuestion(text) { const t = normalize(text); return t.includes("bucket") || t.includes("cab"); }
export function bookingIntent(text) { return containsAny(text, ["reserve", "availability", "available", "today", "tomorrow", "this morning", "this afternoon", "next week", "book", "hold it", "schedule", "scheduled", "pickup", "pick up", "pick it up"]); }
export function isDeliveryQuestion(text) { const t = normalize(text); return t.includes("delivery") || t.includes("deliver"); }
export function isTrailerQuestion(text) { return containsAny(text, ["trailer", "trailers", "haul it on", "haul it", "hauling trailer", "equipment trailer", "car hauler", "gooseneck", "dump trailer", "supply a trailer", "provide a trailer", "rent a trailer", "trailer for it", "trailer from you"]); }
export function wantsTrailerAddedToTotal(text) { return containsAny(text, ["total with the trailer", "total with trailer", "with the trailer", "with trailer", "including a trailer", "including trailer", "include a trailer", "include trailer", "include the trailer", "add the trailer", "add trailer", "plus a trailer", "plus trailer", "and a trailer", "and trailer"]); }
export function wantsDeliveryAddedToTotal(text) { return containsAny(text, ["with delivery", "including delivery", "include delivery", "include the delivery", "delivery included", "and delivery", "plus delivery"]); }
export function deliveryInfo(text) { const t = normalize(text); if (t.includes("perry")) return { fee: 200, placeLabel: "Perry" }; if (t.includes("steinhatchee") || t.includes("dekle") || t.includes("lamont")) return { fee: 300, placeLabel: "that area" }; return null; }

export function meaningfulWords(message) {
  return normalize(message).split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function aliasVariants(alias) {
  const n = normalize(alias);
  const c = compact(alias);
  const spaced = c.replace(/([a-z]+)(\d+)/g, "$1 $2").replace(/(\d+)([a-z]+)/g, "$1 $2").trim();
  return [...new Set([n, c, spaced])];
}

function scoreAliasMatch(text, alias) {
  const nText = normalize(text);
  const cText = compact(text);
  const variants = aliasVariants(alias);
  let best = 0;
  for (const variant of variants) {
    const vc = variant.replace(/[\s.-]/g, "");
    if (nText === variant) best = Math.max(best, 100);
    if (nText.includes(variant)) best = Math.max(best, 80);
    if (cText.includes(vc)) best = Math.max(best, 70);
  }
  return best;
}

export function scoreItem(id, text) {
  const item = EQUIPMENT[id];
  if (!item) return 0;
  const t = normalize(text);
  const c = compact(text);
  const haystack = normalize(`${item.name || ""} ${(item.aliases || []).join(" ")} ${item.keyword || ""} ${item.details || ""} ${item.category || ""}`);
  const hc = haystack.replace(/[\s.-]/g, "");
  let score = 0;
  for (const alias of item.aliases || []) score = Math.max(score, scoreAliasMatch(text, alias));
  if (t.includes("stihl") && hc.includes("bt131")) score += 1000;
  if (c.includes("bt131") && hc.includes("bt131")) score += 1000;
  if (t.includes("blue diamond") && haystack.includes("blue diamond")) score += 800;
  if (t.includes("lift king") && haystack.includes("lift king")) score += 800;
  if ((t.includes("8k") || t.includes("8000")) && haystack.includes("lift king")) score += 500;
  if (c.includes("gs1930") && hc.includes("gs1930")) score += 800;
  if (c.includes("gs3246") && hc.includes("gs3246")) score += 800;
  if (c.includes("et500") && hc.includes("et500")) score += 800;
  for (const word of meaningfulWords(text)) if (haystack.includes(word)) score += 8;
  return score;
}

export function findEquipment(text) {
  const candidates = Object.keys(EQUIPMENT)
    .map((id) => ({ id, item: EQUIPMENT[id], score: scoreItem(id, text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

export function findAllEquipment(text) {
  return Object.keys(EQUIPMENT)
    .map((id) => ({ id, score: scoreItem(id, text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}

export function findCategory(text) {
  const t = normalize(text);
  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => t.includes(normalize(alias)))) return category;
  }
  return null;
}

export function isBroadCategoryRequest(text) {
  const t = normalize(text);
  return containsAny(t, ["do you have", "do u have", "do you rent", "do u rent", "what do you have", "what all do you have", "available", "options", "show me", "list"]) || /\b(augers|boom lifts|scissor lifts|excavators|skid steers|trailers|forklifts|fork lifts|compactors|mowers|trenchers|brush cutters|bush hogs|drain snakes|drain cleaners|pressure washers|compressors|pumps)\b/.test(t);
}

export function isMoreInfoQuestion(text) {
  return containsAny(text, ["more about", "more info", "tell me more", "details", "info about", "information", "what is it", "what does it do", "handheld", "hand held", "is this", "does it", "do it", "can it"]);
}

export function isPronounFollowup(text) {
  const t = normalize(text);
  return containsAny(t, ["about it", "more about it", "tell me more about it", "is this", "is it", "does it", "can it"]) || t === "more info" || t === "details";
}
