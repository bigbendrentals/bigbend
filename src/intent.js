import { EQUIPMENT, CATEGORY_ALIASES } from "./inventory.js";

export function normalize(text) {
  let t = String(text || "").toLowerCase();
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
export function containsAny(text, phrases) { return phrases.some((phrase) => text.includes(phrase)); }

function aliasVariants(alias) {
  const n = normalize(alias);
  const c = compact(alias);
  const spaced = c.replace(/([a-z]+)(\d+)/g, "$1 $2").replace(/(\d+)([a-z]+)/g, "$1 $2").trim();
  return [...new Set([n, c, spaced])];
}

export function isFinalTotalFollowup(text) {
  const t = normalize(text);

  return containsAny(t, [
    "total",
    "final price",
    "final cost",
    "grand total",
    "all in",
    "all-in",
    "out the door",
    "out-the-door",
    "otd",
    "with tax",
    "including tax",
    "include tax",
    "after tax"
  ]);
}

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
export function isPriceQuestion(text) {
  const t = normalize(text);
  return containsAny(t, ["how much","what does it cost","whats it cost","what's it cost","what is the cost","what is the total","what's the total","total","price","pricing","quote","cost","day rate","daily rate","rental rate","a week","week","weekly","monthly","month","and 1 day","and one day","and 2 days","and two days","and 3 days","and three days","and 4 days","and four days","and 5 days","and five days","and 6 days","and six days","and 7 days","and seven days"]) || parseDays(t) !== null;
}
export function isWeightQuestion(text) { const t = normalize(text); return containsAny(t, ["how heavy","weight","weigh","what does it weigh","how much does it weigh","how much it weighs"]); }
export function isThumbQuestion(text) { return normalize(text).includes("thumb"); }
export function isBucketOrCabQuestion(text) { const t = normalize(text); return t.includes("bucket") || t.includes("cab"); }
export function bookingIntent(text) { const t = normalize(text); return containsAny(t, ["reserve","availability","available","today","tomorrow","this morning","this afternoon","next week","book","hold it","schedule","scheduled","pickup","pick up","pick it up"]); }
export function isDeliveryQuestion(text) { const t = normalize(text); return t.includes("delivery") || t.includes("deliver"); }
export function isTrailerQuestion(text) { const t = normalize(text); return containsAny(t, ["trailer","trailers","haul it on","haul it","hauling trailer","equipment trailer","car hauler","gooseneck","dump trailer","supply a trailer","provide a trailer","rent a trailer","trailer for it","trailer from you"]); }
export function isDeliveryPriceQuestion(text) { const t = normalize(text); return containsAny(t, ["how much is delivery","how much delivery","delivery cost","delivery price","what is delivery","what does delivery cost","what is the delivery charge","delivery charge","how much to deliver"]); }
export function isTrailerIncludedQuestion(text) { const t = normalize(text); return containsAny(t, ["does a trailer come with it","does trailer come with it","come with a trailer","comes with a trailer","does it come with a trailer","included trailer","trailer included"]); }
export function wantsTrailerAddedToTotal(text) { const t = normalize(text); return containsAny(t, ["total with the trailer","total with trailer","with the trailer","with trailer","including a trailer","including trailer","include a trailer","include trailer","include the trailer","add the trailer","add trailer","plus a trailer","plus trailer","and a trailer","and trailer"]); }
export function wantsDeliveryAddedToTotal(text) { const t = normalize(text); return containsAny(t, ["with delivery","including delivery","include delivery","include the delivery","delivery included","and delivery","plus delivery"]); }
export function deliveryInfo(text) { const t = normalize(text); if (t.includes("perry")) return { fee: 200, placeLabel: "Perry" }; if (t.includes("steinhatchee") || t.includes("dekle") || t.includes("lamont")) return { fee: 300, placeLabel: "that area" }; return null; }
export function arrangedBoomLiftIntent(text) { const t = normalize(text); return containsAny(t, ["larger","larger boom","larger boom lift","taller","taller boom","taller boom lift","bigger","specialty boom","specialty equipment","different boom","higher reach"]); }
export function isMulcherQuestion(text) { const t = normalize(text); return containsAny(t, ["mulcher","mulchers","forestry mulcher","forestry mulchers","mulcher combo","mulcher combos","cat mulcher","jd mulcher","john deere mulcher","hm316","mh60d"]); }
export function isMulcherComboQuestion(text) { const t = normalize(text); return containsAny(t, ["mulcher combo","mulcher combos","forestry mulcher combo","mulcher and skid steer","with a skid steer","with skid steer","combo"]) || t === "both"; }
export function isMulcherOnlyQuestion(text) { const t = normalize(text); return containsAny(t, ["just the mulcher","mulcher only","just mulcher","just the attachment","attachment only","just the head"]); }
export function isReferentialFollowup(text) { const t = normalize(text); if (parseDays(t) !== null || t === "both") return true; return containsAny(t, ["it","that one","that machine","how much","price","pricing","cost","quote","week","weekly","monthly","month","weight","weigh","thumb","bucket","cab","delivery","deliver","reserve","available","availability","schedule","book"]); }

function scoreAliasMatch(text, alias) {
  const nText = normalize(text);
  const cText = compact(text);
  const variants = aliasVariants(alias);
  let best = 0;
  for (const variant of variants) {
    if (nText === variant) best = Math.max(best, 100);
    if (nText.includes(variant)) best = Math.max(best, 80);
    if (cText.includes(variant.replace(/[\s.-]/g, ""))) best = Math.max(best, 70);
  }
  return best;
}
export function findEquipment(text) { const candidates = []; for (const [id, item] of Object.entries(EQUIPMENT)) { let score = 0; for (const alias of item.aliases || []) score = Math.max(score, scoreAliasMatch(text, alias)); if (score > 0) candidates.push({ id, item, score }); } candidates.sort((a, b) => b.score - a.score); return candidates[0] || null; }
export function findAllEquipment(text) { const found = []; for (const [id, item] of Object.entries(EQUIPMENT)) { let score = 0; for (const alias of item.aliases || []) score = Math.max(score, scoreAliasMatch(text, alias)); if (score > 0) found.push(id); } return [...new Set(found)]; }
export function findCategory(text) { const t = normalize(text); for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) { if (aliases.some((alias) => t.includes(normalize(alias)))) return category; } return null; }
export function hasExplicitIntentOverride(text) { const t = normalize(text); return containsAny(t, ["cat","the cat","cat combo","caterpillar","cat 265","hm316","cat mulcher","john deere","the john deere","jd","the jd","jd combo","john deere combo","john deere mulcher combo","333p","mh60d","jd mulcher","john deere mulcher","boxer","cat 239","telehandler","lull","forklift","boom lift","man lift","scissor lift","excavator","mini excavator","stump grinder","drain snake","electric eel","pressure washer","surface cleaner","auger","breaker","grapple","brushcat","power rake","trailer","trailers","gooseneck","dump trailer"]); }
