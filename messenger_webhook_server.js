import express from "express";
import dotenv from "dotenv";

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

const SALES_TAX = 0.07;
const PROTECTION_BASE = 49.99;
const DAVE_PHONE = "850-843-2245";
const WEBSITE = "www.bigbendrentals.net";
const DELIVERY_RADIUS_MILES = 75;

const EQUIPMENT = {
  "cat-3017": {
    name: "CAT 301.7 Mini Excavator",
    category: "excavator",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "CAT 301.7",
    aliases: ["301.7", "3017", "mini excavator", "mini ex", "cat 301.7", "cat301.7", "cat 3017", "cat3017", "cat 301"],
    details: "18-inch bucket with 12-inch optional bucket, hydraulic thumb, open cab.",
    thumb: "Yes, the CAT 301.7 has a hydraulic thumb.",
    weight: 4222
  },

  "jd-50p": {
    name: "John Deere 50P Excavator",
    category: "excavator",
    day: 495,
    protection: true,
    delivery: true,
    keyword: "John Deere 50P",
    aliases: ["50p", "50 p", "jd50p", "jd 50p", "john deere 50p", "deere 50p"],
    details: "36-inch bucket, enclosed cab.",
    thumb: "Yes, the John Deere 50P does have a thumb.",
    weight: 11349
  },

  "cat-3075": {
    name: "CAT 307.5 Excavator",
    category: "excavator",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "CAT 307.5",
    aliases: ["307.5", "3075", "307 5", "cat 307.5", "cat307.5", "cat 3075", "cat3075"],
    details: "24-inch bucket, hydraulic thumb, enclosed cab, 17,905 lb.",
    thumb: "Yes, the CAT 307.5 has a hydraulic thumb.",
    weight: 17905
  },

  boxer: {
    name: "Boxer Mini Skid Steer",
    category: "skid_steer",
    day: 330,
    protection: true,
    delivery: true,
    keyword: "Boxer Mini Skid Steer",
    aliases: ["boxer", "mini skid", "mini skid steer", "ride on skid", "ride-on skid", "ride on skid steer", "ride-on skid steer"],
    details: "Bucket is included."
  },

  "cat-239": {
    name: "CAT 239",
    category: "skid_steer",
    day: 440,
    protection: true,
    delivery: true,
    keyword: "CAT 239",
    aliases: ["239", "cat 239", "cat239"],
    details: "Open cab.",
    weight: 7430
  },

  "cat-265": {
    name: "CAT 265",
    category: "skid_steer",
    day: 550,
    protection: true,
    delivery: true,
    keyword: "CAT 265",
    aliases: ["265", "cat 265", "cat265"],
    details: "74 hp, 10,492 lb, closed cab with AC, high flow.",
    weight: 10492
  },

  "jd-333p": {
    name: "John Deere 333P",
    category: "skid_steer",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "John Deere 333P",
    aliases: ["333p", "333 p", "jd333p", "jd 333p", "john deere 333p", "deere 333p", "high horsepower skid steer"],
    details: "108.5 hp, 12,183 lb.",
    weight: 12183
  },

  telehandler: {
    name: "JLG 6K Telehandler",
    category: "material_handling",
    day: 723.8,
    week: 1556.5,
    month: 3650,
    protection: true,
    delivery: true,
    keyword: "telehandler",
    aliases: ["telehandler", "telehandlers", "lull", "lulls", "jlg 6k telehandler", "6k telehandler"],
    details: "6,000 lb capacity, 42 ft 4 in lift height."
  },

  forklift: {
    name: "Mitsubishi Forklift",
    category: "material_handling",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "forklift",
    aliases: ["mitsubishi forklift", "standard forklift", "warehouse forklift"],
    details: "3,150 lb capacity, 17 ft lift height."
  },

  "lift-king": {
    name: "Lift King 8K Forklift",
    category: "material_handling",
    day: 550,
    protection: true,
    delivery: true,
    keyword: "8k forklift",
    aliases: ["lift king", "rough terrain forklift", "rough ground forklift", "8k forklift"],
    details: "8,000 lb capacity, 14 ft lift height."
  },

  "material-lift": {
    name: "Sumner Contractor Lift",
    category: "material_handling",
    day: 110,
    aliases: ["contractor lift", "duct lift", "material lift"],
    details: "Manual lift, 16 ft max height, 650 lb capacity."
  },

  "genie-z45": {
    name: "Genie Z45 Articulating Boom Lift",
    category: "boom_lift",
    day: 471,
    week: 1884,
    protection: true,
    delivery: true,
    keyword: "Genie Z45 boom lift",
    aliases: ["genie z45", "z45", "z45 boom lift"],
    details: "Articulating boom lift."
  },

  "jlg-et500j": {
    name: "JLG ET500J Towable 50' Boom Lift",
    category: "boom_lift",
    protection: true,
    delivery: true,
    keyword: "JLG ET500J boom lift",
    aliases: ["jlg et500j", "et500j", "towable 50 boom lift", "towable 50-foot boom lift", "towable boom lift"],
    details: "Towable 50-foot boom lift. Please check the website for current pricing."
  },

  "genie-gs1930": {
    name: "Genie GS1930 Scissor Lift",
    category: "scissor_lift",
    day: 192,
    week: 550,
    month: 715,
    protection: true,
    delivery: true,
    keyword: "Genie GS1930 Scissor Lift",
    aliases: ["gs1930", "genie gs1930", "1930 scissor lift"],
    details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift."
  },

  "genie-gs3246": {
    name: "Genie GS3246 Scissor Lift",
    category: "scissor_lift",
    day: 313,
    week: 660,
    month: 1320,
    protection: true,
    delivery: true,
    keyword: "Genie GS3246 Scissor Lift",
    aliases: ["gs3246", "genie gs3246", "3246 scissor lift"],
    details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift."
  },

  "pressure-washer": {
    name: "Pressure Washer",
    category: "small_tool",
    day: 85,
    aliases: ["pressure washer", "pressure washers", "power washer", "power washers", "rb600", "rb 600"],
    details: "Pressure washer."
  },

  "surface-cleaner": {
    name: "Surface Cleaner",
    category: "small_tool",
    day: 38.5,
    aliases: ["surface cleaner", "sidewalk cleaner", "driveway cleaner"],
    details: "Flatwork surface cleaner."
  },

  snake: {
    name: "Ridgid K400 Drain Snake",
    category: "small_tool",
    day: 93.5,
    keyword: "Ridgid K400",
    aliases: ["drain snake", "drain snakes", "k400", "k-400", "ridgid k400", "rigid k400"],
    details: "Good for many standard drain jobs."
  },

  eel: {
    name: "Electric Eel",
    category: "small_tool",
    day: 137.5,
    keyword: "Electric Eel",
    aliases: ["electric eel", "commercial drain cleaner", "heavy drain cleaner"],
    details: "Better for heavier drain jobs."
  },

  "rotary-hammer-drill": {
    name: 'Makita 1-9/16" Rotary Hammer Drill',
    category: "small_tool",
    day: 71.5,
    keyword: "rotary hammer drill",
    aliases: ["hammer drill", "hammer drills", "rotary hammer", "rotary hammer drill", "rotary hammer drills", "makita hammer drill", "makita rotary hammer", "sds max drill"],
    details: "Takes SDS Max bits. Some bits are included."
  },

  "stump-grinder": {
    name: "Rayco RG37 Stump Grinder",
    category: "small_tool",
    day: 357.5,
    protection: true,
    delivery: true,
    keyword: "stump grinder",
    aliases: ["stump grinder", "rayco rg37", "rg37"],
    details: "Rental Protection Plan is required on that machine."
  },

  grapple: {
    name: "Grapple",
    category: "attachment",
    day: 110,
    aliases: ["grapple", "root grapple", "brush grapple", "tree grapple"],
    details: "Attachment can be rented separately."
  },

  "auger-skid": {
    name: "Skid Steer Auger",
    category: "attachment",
    day: 225,
    aliases: ["skid steer auger", "auger attachment", "auger"],
    details: "Bits rented separately. Attachment can be rented separately."
  },

  breaker: {
    name: "Skid Steer Breaker",
    category: "attachment",
    day: 350,
    aliases: ["skid steer breaker", "skid steer demolition hammer", "breaker attachment", "breaker"],
    details: "Attachment can be rented separately."
  },

  "power-rake": {
    name: "Power Rake",
    category: "attachment",
    day: 225,
    aliases: ["power rake"],
    details: "Attachment can be rented separately."
  },

  brushcat: {
    name: "Brushcat 60",
    category: "attachment",
    day: 275,
    aliases: ["brushcat", "brushcat 60", "skid steer brush cutter"],
    details: "Attachment can be rented separately."
  },

  "trash-pump": {
    name: "Trash Pump",
    category: "small_tool",
    day: 88,
    aliases: ["trash pump", "water pump", "drain pool", "pump pool", "pump out a pool"],
    details: "2-inch semi-trash pump."
  },

  "sump-pump": {
    name: "Sump Pump",
    category: "small_tool",
    day: 93.5,
    aliases: ["sump pump", "submersible sump pump"],
    details: "Submersible sump pump."
  },

  "gas-compressor": {
    name: "Gas Air Compressor",
    category: "small_tool",
    day: 71.5,
    aliases: ["gas air compressor"],
    details: "Gas-powered air compressor."
  },

  pancake: {
    name: "Pancake Compressor",
    category: "small_tool",
    day: 35,
    aliases: ["pancake compressor", "portable compressor"],
    details: "Portable pancake compressor."
  },

  splitter: {
    name: "Log Splitter",
    category: "small_tool",
    day: 99,
    aliases: ["log splitter", "split wood", "split logs", "firewood"],
    details: "Log splitter."
  },

  "concrete-saw": {
    name: "Concrete Saw",
    category: "small_tool",
    day: 150,
    aliases: ["concrete saw", "cut off saw", "cutoff saw", "stihl saw"],
    details: "Blade is sold separately."
  },

  screed: {
    name: "Power Screed",
    category: "small_tool",
    day: 137.5,
    aliases: ["power screed", "screed", "vibrating screed"],
    details: "Screed board rented separately."
  },

  trowel: {
    name: "Power Trowel",
    category: "small_tool",
    day: 135,
    aliases: ["power trowel"],
    details: "Power trowel."
  },

  vibrator: {
    name: "Concrete Vibrator",
    category: "small_tool",
    day: 49,
    aliases: ["concrete vibrator", "cement vibrator", "pencil vibrator"],
    details: "Concrete vibrator."
  },

  "bull-float": {
    name: "Bull Float",
    category: "small_tool",
    day: 35,
    aliases: ["bull float", "concrete float"],
    details: "Bull float."
  },

  "cat-hm316-mulcher": {
    name: "CAT HM316 Forestry Mulcher",
    category: "attachment",
    day: 610,
    keyword: "CAT HM316 Forestry Mulcher",
    aliases: ["cat hm316", "hm316", "hm316 mulcher", "cat hm 316", "cat mulcher", "cat forestry mulcher"],
    details:
      "Uses carbide teeth that do not need sharpening. High Flow XPS required. 62-inch working width, 74-inch overall width, 58-inch overall height, 53-inch length, 2,959 lb. Axial piston dual-speed motor, polychain belt drive, 34 fixed teeth, max 8-inch cutting diameter, max 4.1-inch cutting depth. Can be rented by itself or paired with the CAT 265 only."
  },

  "jd-mh60d-mulcher": {
    name: "John Deere MH60D Forestry Mulcher",
    category: "attachment",
    day: 610,
    keyword: "John Deere MH60D Forestry Mulcher",
    aliases: ["mh60d", "mh60d mulcher", "john deere mh60d", "jd mh60d", "john deere mulcher", "jd mulcher", "john deere forestry mulcher"],
    details:
      "Removes up to 8-inch trees and 12-inch stumps. 30 double-carbide-tipped teeth. Two-speed hydraulic system. 60-inch cutting width, 74-inch overall width, 56-inch height, 55-inch length, 2,730 lb. Can be rented by itself or paired with the John Deere 333P only."
  }
};

const CATEGORY_ALIASES = {
  skid_steer: [
    "skid steer",
    "skid steers",
    "skid steer4s",
    "track loader",
    "track loaders",
    "compact track loader",
    "compact track loaders"
  ],
  excavator: ["excavator", "excavators", "mini excavator", "mini excavators", "trackhoe", "trackhoes"],
  telehandler: ["telehandler", "telehandlers", "lull", "lulls"],
  forklift: ["forklift", "forklifts", "rough terrain forklift", "rough ground forklift", "warehouse forklift"],
  pressure_washer: ["pressure washer", "pressure washers", "power washer", "power washers"],
  boom_lift: ["boom lift", "boom lifts", "man lift", "man lifts", "articulating boom", "towable boom"],
  scissor_lift: ["scissor lift", "scissor lifts"]
};

const CATEGORY_ITEMS = {
  skid_steer: ["boxer", "cat-239", "cat-265", "jd-333p"],
  excavator: ["cat-3017", "jd-50p", "cat-3075"],
  boom_lift: ["genie-z45", "jlg-et500j"],
  scissor_lift: ["genie-gs1930", "genie-gs3246"]
};

const sessions = new Map();

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function normalize(text) {
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

function containsAny(text, list) {
  return list.some((s) => text.includes(s));
}

function aliasVariants(alias) {
  const n = normalize(alias);
  const compact = n.replace(/[\s.-]/g, "");
  const spaced = compact
    .replace(/([a-z]+)(\d+)/g, "$1 $2")
    .replace(/(\d+)([a-z]+)/g, "$1 $2")
    .trim();

  return [...new Set([n, compact, spaced])];
}

function protectionTotal(days = 1) {
  if (days <= 1) return PROTECTION_BASE;
  return PROTECTION_BASE * (1 + 0.05 * (days - 1));
}

function getWeeklyRate(item) {
  if (item.week) return item.week;
  return (item.day || 0) * 4;
}

function parseDays(text) {
  const t = normalize(text);

  const numeric = t.match(/\b(\d+)\s*day\b/);
  if (numeric) return Number(numeric[1]);

  if (t.includes("one day") || t.includes("a day")) return 1;
  if (t.includes("two days")) return 2;
  if (t.includes("three days")) return 3;
  if (t.includes("four days")) return 4;
  if (t.includes("five days")) return 5;
  if (t.includes("six days")) return 6;
  if (t.includes("seven days")) return 7;
  if (t.includes("a week") || t.includes("one week") || t === "week" || t === "a week?") return 7;

  return null;
}

function deliveryInfo(text) {
  const t = normalize(text);

  if (t.includes("perry")) {
    return { fee: 200, area: "Perry" };
  }

  if (t.includes("steinhatchee") || t.includes("dekle") || t.includes("lamont")) {
    return { fee: 300, area: "that area" };
  }

  return null;
}

function isDeliveryQuestion(text) {
  const t = normalize(text);
  return containsAny(t, ["delivery", "deliver"]);
}

function isDeliveryPriceQuestion(text) {
  const t = normalize(text);
  return [
    "how much is delivery",
    "how much delivery",
    "delivery cost",
    "what is delivery",
    "what is the delivery",
    "what does delivery cost",
    "how much to deliver",
    "delivery price",
    "how much is it to deliver",
    "what is the delivery charge",
    "delivery charge"
  ].some((k) => t.includes(k));
}

function isMonthlyRequest(text) {
  const t = normalize(text);
  return t.includes("month") || t.includes("monthly");
}

function isPriceQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "how much",
    "what does it cost",
    "whats it cost",
    "what's it cost",
    "what is the cost",
    "cost",
    "price",
    "pricing",
    "quote",
    "day rate",
    "daily rate",
    "rental rate",
    "how about for",
    "total"
  ]) || parseDays(t) !== null || isMonthlyRequest(t);
}

function isWeightQuestion(text) {
  const t = normalize(text);
  return containsAny(t, ["how heavy", "how much does it weigh", "how much it weighs", "what does it weigh", "weight", "weigh"]);
}

function isThumbQuestion(text) {
  const t = normalize(text);
  return t.includes("thumb");
}

function isBucketOrCabQuestion(text) {
  const t = normalize(text);
  return t.includes("bucket") || t.includes("cab");
}

function bookingIntent(text) {
  const t = normalize(text);
  return containsAny(t, [
    "reserve",
    "availability",
    "available",
    "tomorrow",
    "today",
    "this afternoon",
    "this morning",
    "next week",
    "book",
    "hold it",
    "scheduled",
    "schedule",
    "pick up",
    "pickup",
    "pick it up",
    "pick this up"
  ]);
}

function isReferentialFollowup(text) {
  const t = normalize(text);

  if (t === "both") return true;
  if (parseDays(t) !== null) return true;

  return containsAny(t, [
    "it",
    "that one",
    "that machine",
    "how much",
    "what does it cost",
    "what's it cost",
    "what is the cost",
    "cost",
    "price",
    "pricing",
    "quote",
    "total",
    "a week",
    "week",
    "how heavy",
    "weight",
    "weigh",
    "thumb",
    "bucket",
    "cab",
    "delivery",
    "deliver",
    "reserve",
    "availability",
    "available",
    "schedule",
    "book",
    "just the mulcher",
    "mulcher and skid steer",
    "with a skid steer",
    "with skid steer",
    "just the attachment",
    "combo",
    "both"
  ]);
}

function arrangedBoomLiftIntent(text) {
  const t = normalize(text);
  return containsAny(t, [
    "larger",
    "bigger",
    "taller",
    "higher",
    "different one",
    "different ones",
    "different boom",
    "specialty boom",
    "specialty equipment",
    "larger boom lift",
    "taller boom lift"
  ]);
}

function isMulcherQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "mulcher",
    "mulchers",
    "forestry mulcher",
    "forestry mulchers",
    "mulcher combo",
    "mulcher combos",
    "forestry mulcher combo",
    "forestry mulcher combos",
    "cat mulcher",
    "jd mulcher",
    "john deere mulcher",
    "hm316",
    "mh60d"
  ]);
}

function isMulcherComboQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "mulcher combo",
    "mulcher combos",
    "forestry mulcher combo",
    "forestry mulcher combos",
    "mulcher and skid steer",
    "with a skid steer",
    "with skid steer",
    "with the skid steer",
    "combo"
  ]) || t === "both";
}

function isMulcherOnlyQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "just the mulcher",
    "mulcher only",
    "just mulcher",
    "just the attachment",
    "attachment only",
    "just the head"
  ]);
}

function getSession(psid) {
  if (!sessions.has(psid)) {
    sessions.set(psid, {
      lastId: null,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [],
      lastQuote: null,
      updatedAt: Date.now()
    });
  }
  return sessions.get(psid);
}

function updateSession(psid, updates) {
  const existing = getSession(psid);
  sessions.set(psid, {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  });
}

function clearCategoryState(statePatch = {}) {
  return {
    ...statePatch,
    lastCategory: null,
    lastCategoryItems: []
  };
}

function aliasScore(text, alias) {
  const t = normalize(text);
  const compactText = t.replace(/[\s.-]/g, "");
  const variants = aliasVariants(alias);

  let best = 0;

  for (const variant of variants) {
    if (t === variant) best = Math.max(best, 100);
    if (t.includes(variant)) best = Math.max(best, 80);
    if (compactText.includes(variant.replace(/[\s.-]/g, ""))) best = Math.max(best, 70);
  }

  return best;
}

function findEquipment(text) {
  const t = normalize(text);
  const matches = [];

  for (const [id, item] of Object.entries(EQUIPMENT)) {
    let best = 0;
    for (const alias of item.aliases || []) {
      best = Math.max(best, aliasScore(t, alias));
    }
    if (best > 0) {
      matches.push({ id, item, score: best });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return matches[0] || null;
}

function findAllEquipment(text) {
  const t = normalize(text);
  const out = [];

  for (const [id, item] of Object.entries(EQUIPMENT)) {
    let best = 0;
    for (const alias of item.aliases || []) {
      best = Math.max(best, aliasScore(t, alias));
    }
    if (best > 0) out.push(id);
  }

  return [...new Set(out)];
}

function findCategory(text) {
  const t = normalize(text);

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => t.includes(normalize(alias)))) {
      return category;
    }
  }

  return null;
}

function formatCategoryQuote(ids) {
  return ids
    .map((id) => {
      const item = EQUIPMENT[id];
      return `${item.name} (${money(item.day)}/day)`;
    })
    .join(", ");
}

function categoryDisambiguationText(ids, verb = "mean") {
  const names = ids.map((id) => EQUIPMENT[id].name).join(", ");
  return `Which machine do you ${verb} — ${names}?`;
}

function isSpecialMonthlyItem(item, id) {
  if (!item) return false;
  if (id === "telehandler") return true;
  return false;
}

function singleQuote(item, id) {
  const parts = [];

  if (id === "jlg-et500j") {
    parts.push(`${item.name}. Please check the website at ${WEBSITE} for current pricing.`);
  } else {
    if (item.day) parts.push(`${item.name} is ${money(item.day)} a day.`);
    if (item.week) parts.push(`${money(item.week)} for the week.`);
    if (item.month && item.category !== "scissor_lift" && id !== "telehandler") {
      parts.push(`${money(item.month)} for the month.`);
    }
  }

  if (id === "telehandler") {
    parts.push(`${money(item.day)} a day and ${money(item.week)} for the week.`);
    parts.push("Monthly pricing is quoted by Dave based on current market conditions.");
  }

  if (item.category === "scissor_lift") {
    parts.push(`${money(item.week)} for the week.`);
    parts.push(`${money(item.month)} for the month.`);
    parts.push("These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.");
  }

  if (item.protection) {
    parts.push(`Rental Protection Plan is ${money(protectionTotal(1))} and is required on that machine.`);
  }

  if (id === "boxer") {
    parts.push("Bucket is included.");
  }

  if (item.details && !parts.includes(item.details)) {
    parts.push(item.details);
  }

  if (id === "cat-hm316-mulcher") {
    parts.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");
  }

  return parts.join(" ");
}

function multiDayQuote(item, id, days, deliveryFee = 0) {
  let rental = 0;
  let billedAsWeekly = false;

  if (days >= 4) {
    rental = getWeeklyRate(item);
    billedAsWeekly = true;
  } else {
    rental = (item.day || 0) * days;
  }

  const protection = item.protection ? protectionTotal(days) : 0;
  const subtotal = rental + protection + deliveryFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;

  const lines = billedAsWeekly
    ? [`${item.name} weekly rate:`, `Rental: ${money(rental)}`]
    : [`${item.name} for ${days} day${days > 1 ? "s" : ""}:`, `Rental: ${money(rental)}`];

  if (item.category === "scissor_lift") {
    lines.push(`Weekly: ${money(item.week)}`);
    lines.push(`Monthly: ${money(item.month)}`);
    lines.push("These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.");
  }

  if (item.protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Sales tax (7%): ${money(tax)}`);
  lines.push(`Total: ${money(total)}`);

  if (id === "cat-hm316-mulcher") {
    lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");
  }

  return {
    text: lines.join("\n"),
    subtotal,
    tax,
    total,
    rental,
    protection,
    days,
    deliveryFee,
    itemIds: [id]
  };
}

function buildBundleQuote(itemIds, days = 1, deliveryFee = 0) {
  const items = itemIds.map((id) => ({ id, ...EQUIPMENT[id] })).filter(Boolean);
  if (!items.length) return null;

  let rental = 0;
  let protection = 0;
  let billedAsWeekly = false;

  for (const item of items) {
    if (days >= 4) {
      rental += getWeeklyRate(item);
      billedAsWeekly = true;
    } else {
      rental += (item.day || 0) * days;
    }

    if (item.protection) {
      protection += protectionTotal(days);
    }
  }

  const subtotal = rental + protection + deliveryFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;

  const header = billedAsWeekly
    ? `${items.map((item) => item.name).join(" + ")} weekly rate:`
    : `${items.map((item) => item.name).join(" + ")} for ${days} day${days > 1 ? "s" : ""}:`;

  const lines = [header];

  for (const item of items) {
    const itemRental = days >= 4 ? getWeeklyRate(item) : (item.day || 0) * days;
    lines.push(`${item.name}: ${money(itemRental)}`);
  }

  if (protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Sales tax (7%): ${money(tax)}`);
  lines.push(`Total: ${money(total)}`);

  if (itemIds.includes("cat-hm316-mulcher")) {
    lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");
  }

  return {
    text: lines.join("\n"),
    subtotal,
    tax,
    total,
    rental,
    protection,
    days,
    deliveryFee,
    itemIds
  };
}

function unknownItemFallback() {
  return `Sometimes my inventory database is incomplete, so you may need to check the website at ${WEBSITE} for that item.`;
}

function schedulingText(item = null) {
  if (item?.keyword) {
    return `For availability or scheduling, call or text Dave at ${DAVE_PHONE}. You can also check availability on the website at ${WEBSITE} and search for "${item.keyword}".`;
  }

  return `For availability or scheduling, call or text Dave at ${DAVE_PHONE}. You can also check availability on the website at ${WEBSITE}.`;
}

function reply(message, state) {
  const text = normalize(message);
  const explicitFound = findEquipment(message);
  const matchedIds = [...new Set(findAllEquipment(message))];
  const category = findCategory(message);
  const useLastId = !explicitFound && isReferentialFollowup(message);
  const id = explicitFound ? explicitFound.id : (useLastId ? state.lastId : null);
  const item = id ? EQUIPMENT[id] : null;
  const days = parseDays(message) || 1;
  const delivery = deliveryInfo(message);
  const deliveryFee = delivery?.fee || 0;

  // Mulcher flow always takes priority.
  if (isMulcherQuestion(message)) {
    if (isMulcherComboQuestion(message)) {
      return {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: ["cat-hm316-mulcher", "cat-265", "jd-mh60d-mulcher", "jd-333p"],
        lastQuotedItems: [],
        lastQuote: state.lastQuote
      };
    }

    if (isMulcherOnlyQuestion(message)) {
      return {
        text: `We have a CAT HM316 Forestry Mulcher (${money(EQUIPMENT["cat-hm316-mulcher"].day)}/day) and a John Deere MH60D Forestry Mulcher (${money(EQUIPMENT["jd-mh60d-mulcher"].day)}/day). The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.`,
        lastId: null,
        lastCategory: "mulcher",
        lastCategoryItems: ["cat-hm316-mulcher", "jd-mh60d-mulcher"],
        lastQuotedItems: [],
        lastQuote: state.lastQuote
      };
    }

    return {
      text: "Do you need the mulcher and skid steer or just the mulcher?",
      lastId: null,
      lastCategory: "mulcher",
      lastCategoryItems: ["cat-hm316-mulcher", "jd-mh60d-mulcher"],
      lastQuotedItems: [],
      lastQuote: state.lastQuote
    };
  }

  // Continue mulcher prompt state.
  if (state.lastCategory === "mulcher") {
    if (isMulcherOnlyQuestion(message)) {
      return {
        text: `We have a CAT HM316 Forestry Mulcher (${money(EQUIPMENT["cat-hm316-mulcher"].day)}/day) and a John Deere MH60D Forestry Mulcher (${money(EQUIPMENT["jd-mh60d-mulcher"].day)}/day). The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.`,
        lastId: null,
        lastCategory: "mulcher",
        lastCategoryItems: ["cat-hm316-mulcher", "jd-mh60d-mulcher"],
        lastQuotedItems: [],
        lastQuote: state.lastQuote
      };
    }

    if (isMulcherComboQuestion(message)) {
      return {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: ["cat-hm316-mulcher", "cat-265", "jd-mh60d-mulcher", "jd-333p"],
        lastQuotedItems: [],
        lastQuote: state.lastQuote
      };
    }
  }

  // Continue mulcher combo selection state.
  if (state.lastCategory === "mulcher_combo") {
    if (containsAny(text, ["cat", "cat 265", "hm316", "cat mulcher"])) {
      const quote = buildBundleQuote(["cat-hm316-mulcher", "cat-265"], days, deliveryFee);
      return {
        ...clearCategoryState({
          text: quote.text,
          lastId: "cat-265",
          lastQuotedItems: ["cat-hm316-mulcher", "cat-265"],
          lastQuote: quote
        })
      };
    }

    if (containsAny(text, ["john deere", "jd", "333p", "mh60d", "jd mulcher"])) {
      const quote = buildBundleQuote(["jd-mh60d-mulcher", "jd-333p"], days, deliveryFee);
      return {
        ...clearCategoryState({
          text: quote.text,
          lastId: "jd-333p",
          lastQuotedItems: ["jd-mh60d-mulcher", "jd-333p"],
          lastQuote: quote
        })
      };
    }

    if (text === "both") {
      return {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: ["cat-hm316-mulcher", "cat-265", "jd-mh60d-mulcher", "jd-333p"],
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote
      };
    }

    return {
      text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
      lastId: null,
      lastCategory: "mulcher_combo",
      lastCategoryItems: ["cat-hm316-mulcher", "cat-265", "jd-mh60d-mulcher", "jd-333p"],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  // Specialty / arranged boom lift request.
  if ((category === "boom_lift" || item?.category === "boom_lift" || state.lastCategory === "boom_lift") && arrangedBoomLiftIntent(message)) {
    return {
      text: `We can arrange larger or specialty boom lifts if needed. Specialty equipment is handled separately, so please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastId: state.lastId,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  // Delivery pricing logic must not answer vague "yes, we deliver" to price questions.
  if (isDeliveryQuestion(message)) {
    if (isDeliveryPriceQuestion(message)) {
      if (delivery) {
        return {
          text: `Delivery for ${delivery.area === "Perry" ? "Perry" : "that area"} is ${money(delivery.fee)}.`,
          lastId: state.lastId,
          lastCategory: state.lastCategory,
          lastCategoryItems: state.lastCategoryItems,
          lastQuotedItems: state.lastQuotedItems,
          lastQuote: state.lastQuote
        };
      }

      return {
        text: "What city or area are you in? Delivery pricing depends on location.",
        lastId: state.lastId,
        lastCategory: state.lastCategory,
        lastCategoryItems: state.lastCategoryItems,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote
      };
    }

    if (delivery) {
      return {
        text: `Yes, we can deliver there. Delivery for ${delivery.area === "Perry" ? "Perry" : "that area"} is ${money(delivery.fee)}.`,
        lastId: state.lastId,
        lastCategory: state.lastCategory,
        lastCategoryItems: state.lastCategoryItems,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote
      };
    }

    return {
      text: `Yes, we deliver within about a ${DELIVERY_RADIUS_MILES}-mile radius. What city or area are you in? Delivery pricing depends on location.`,
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  // Follow-up quotes should stay locked to the last quote.
  if (
    state.lastQuote &&
    (
      parseDays(message) !== null ||
      isPriceQuestion(message) ||
      containsAny(text, ["and 1 day", "and one day", "and 2 days", "and two days", "and 3 days", "and three days", "and 4 days", "and four days", "and 5 days", "and five days", "and 6 days", "and six days", "and 7 days", "and seven days", "a week", "week"])
    ) &&
    !explicitFound &&
    !category
  ) {
    const requestedDays = parseDays(message) || state.lastQuote.days || 1;
    const requestedDeliveryFee = deliveryFee || state.lastQuote.deliveryFee || 0;

    if (state.lastQuote.itemIds?.length >= 2) {
      const quote = buildBundleQuote(state.lastQuote.itemIds, requestedDays, requestedDeliveryFee);
      return {
        text: quote.text,
        lastId: state.lastId,
        lastCategory: null,
        lastCategoryItems: [],
        lastQuotedItems: state.lastQuote.itemIds,
        lastQuote: quote
      };
    }

    if (state.lastQuote.itemIds?.length === 1) {
      const singleId = state.lastQuote.itemIds[0];
      const singleItem = EQUIPMENT[singleId];

      if (singleItem) {
        if (isMonthlyRequest(message) && isSpecialMonthlyItem(singleItem, singleId)) {
          return {
            ...clearCategoryState({
              text: `Monthly pricing for ${singleItem.name} is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`,
              lastId: singleId,
              lastQuotedItems: [singleId],
              lastQuote: state.lastQuote
            })
          };
        }

        const quote = multiDayQuote(singleItem, singleId, requestedDays, requestedDeliveryFee);
        return {
          ...clearCategoryState({
            text: quote.text,
            lastId: singleId,
            lastQuotedItems: [singleId],
            lastQuote: quote
          })
        };
      }
    }
  }

  // If user explicitly mentions multiple machines and asks price, quote bundle.
  if (matchedIds.length >= 2 && isPriceQuestion(message)) {
    const quote = buildBundleQuote(matchedIds, days, deliveryFee);
    return {
      ...clearCategoryState({
        text: quote.text,
        lastId: matchedIds[0],
        lastQuotedItems: matchedIds,
        lastQuote: quote
      })
    };
  }

  // Category-level booking disambiguation.
  if (bookingIntent(message) && state.lastCategoryItems?.length > 1 && !item) {
    return {
      text: categoryDisambiguationText(state.lastCategoryItems, "want to schedule"),
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  // Category routes.
  if (category === "scissor_lift" && !explicitFound) {
    return {
      text:
        `We have two slab scissor lifts available:\n\n` +
        `• Genie GS1930 – ${money(EQUIPMENT["genie-gs1930"].day)}/day, ${money(EQUIPMENT["genie-gs1930"].week)}/week, ${money(EQUIPMENT["genie-gs1930"].month)}/month\n` +
        `• Genie GS3246 – ${money(EQUIPMENT["genie-gs3246"].day)}/day, ${money(EQUIPMENT["genie-gs3246"].week)}/week, ${money(EQUIPMENT["genie-gs3246"].month)}/month\n\n` +
        `These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.`,
      lastId: null,
      lastCategory: "scissor_lift",
      lastCategoryItems: CATEGORY_ITEMS.scissor_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  if (category === "boom_lift" && !explicitFound) {
    return {
      text: `We have a Genie Z45 Articulating Boom Lift (${money(EQUIPMENT["genie-z45"].day)}/day) and a JLG ET500J Towable 50' Boom Lift. For current ET500J pricing, please check the website at ${WEBSITE}. If you need a larger, taller, or specialty boom lift, we can arrange one. Please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastId: null,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  if (category === "excavator" && !explicitFound) {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.excavator)}.`,
      lastId: null,
      lastCategory: "excavator",
      lastCategoryItems: CATEGORY_ITEMS.excavator,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  if (category === "skid_steer" && !explicitFound) {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.skid_steer)}.`,
      lastId: null,
      lastCategory: "skid_steer",
      lastCategoryItems: CATEGORY_ITEMS.skid_steer,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  if (category === "telehandler" && !explicitFound) {
    return {
      text: `We have a JLG 6K Telehandler for ${money(EQUIPMENT.telehandler.day)}/day and ${money(EQUIPMENT.telehandler.week)}/week. Monthly pricing is quoted by Dave based on current market conditions.`,
      lastId: "telehandler",
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: ["telehandler"],
      lastQuote: buildBundleQuote(["telehandler"], 1, 0)
    };
  }

  if (category === "forklift" && !explicitFound) {
    return {
      text: "Yes—we have a standard forklift, a rough-terrain forklift, and a telehandler. Are you looking for a warehouse-style forklift, rough-ground forklift, or a lull?",
      lastId: null,
      lastCategory: "forklift",
      lastCategoryItems: ["forklift", "lift-king", "telehandler"],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  if (category === "pressure_washer" && !explicitFound) {
    return {
      text: `Yes, we have a pressure washer for ${money(EQUIPMENT["pressure-washer"].day)} a day. We also have a surface cleaner for ${money(EQUIPMENT["surface-cleaner"].day)} a day for flatwork.`,
      lastId: "pressure-washer",
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: ["pressure-washer"],
      lastQuote: buildBundleQuote(["pressure-washer"], 1, 0)
    };
  }

  // Explicit item handling.
  if (item) {
    if (bookingIntent(message)) {
      return {
        ...clearCategoryState({
          text: schedulingText(item),
          lastId: id,
          lastQuotedItems: state.lastQuotedItems,
          lastQuote: state.lastQuote
        })
      };
    }

    if (isMonthlyRequest(message) && isSpecialMonthlyItem(item, id)) {
      return {
        ...clearCategoryState({
          text: `Monthly pricing for ${item.name} is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote
        })
      };
    }

    if (isWeightQuestion(message)) {
      if (item.weight) {
        return {
          ...clearCategoryState({
            text: `${item.name} weighs ${item.weight.toLocaleString()} lb.`,
            lastId: id,
            lastQuotedItems: [id],
            lastQuote: state.lastQuote
          })
        };
      }

      return {
        ...clearCategoryState({
          text: item.details || singleQuote(item, id),
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote
        })
      };
    }

    if (isThumbQuestion(message)) {
      return {
        ...clearCategoryState({
          text: item.thumb || `I don’t have a thumb listed on the ${item.name}. ${item.details || ""}`.trim(),
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote
        })
      };
    }

    if (isBucketOrCabQuestion(message)) {
      return {
        ...clearCategoryState({
          text: item.details || singleQuote(item, id),
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote
        })
      };
    }

    if (isPriceQuestion(message)) {
      if (days > 1) {
        const quote = multiDayQuote(item, id, days, deliveryFee);
        return {
          ...clearCategoryState({
            text: quote.text,
            lastId: id,
            lastQuotedItems: [id],
            lastQuote: quote
          })
        };
      }

      const textOut = singleQuote(item, id);
      const quote = buildBundleQuote([id], 1, deliveryFee);
      return {
        ...clearCategoryState({
          text: textOut,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: quote
        })
      };
    }

    return {
      ...clearCategoryState({
        text: singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote
      })
    };
  }

  // Referential follow-up after category listing.
  if (!explicitFound && state.lastCategoryItems?.length > 1 && isReferentialFollowup(message)) {
    return {
      text: categoryDisambiguationText(
        state.lastCategoryItems,
        bookingIntent(message) ? "want to schedule" : "mean"
      ),
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote
    };
  }

  // Unknown fallback must not reset context.
  return {
    text: unknownItemFallback(),
    lastId: state.lastId,
    lastCategory: state.lastCategory,
    lastCategoryItems: state.lastCategoryItems,
    lastQuotedItems: state.lastQuotedItems,
    lastQuote: state.lastQuote
  };
}

function splitMessage(text, maxLen = 1800) {
  if (text.length <= maxLen) return [text];

  const parts = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let slice = remaining.slice(0, maxLen);
    const breakAt = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
    if (breakAt > 200) {
      slice = slice.slice(0, breakAt);
    }
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

    if (!response.ok) {
      throw new Error(`Facebook send failed: ${response.status} ${bodyText}`);
    }
  }
}

app.get("/", (_req, res) => {
  res.status(200).send("Messenger webhook is running.");
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

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "page") {
      return res.sendStatus(404);
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.sender?.id) continue;

        const senderId = event.sender.id;

        if (event.message?.text) {
          const session = getSession(senderId);
          const result = reply(event.message.text, session);

          updateSession(senderId, {
            lastId: result.lastId !== undefined ? result.lastId : session.lastId,
            lastCategory: result.lastCategory !== undefined ? result.lastCategory : session.lastCategory,
            lastCategoryItems: result.lastCategoryItems !== undefined ? result.lastCategoryItems : session.lastCategoryItems,
            lastQuotedItems: result.lastQuotedItems !== undefined ? result.lastQuotedItems : session.lastQuotedItems,
            lastQuote: result.lastQuote !== undefined ? result.lastQuote : session.lastQuote
          });

          await sendMessengerText(senderId, result.text);
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
