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
const RENTAL_PROTECTION_PLAN_BASE = 49.99;
const DAVE_PHONE = "850-843-2245";
const WEBSITE = "www.bigbendrentals.net";
const DELIVERY_RADIUS_MILES = 75;

const ITEM_IDS = {
  CAT_3017: "cat-3017",
  JD_50P: "jd-50p",
  CAT_3075: "cat-3075",

  BOXER: "boxer",
  CAT_239: "cat-239",
  CAT_265: "cat-265",
  JD_333P: "jd-333p",

  TELEHANDLER: "telehandler",
  FORKLIFT: "forklift",
  LIFT_KING: "lift-king",
  MATERIAL_LIFT: "material-lift",

  GENIE_Z45: "genie-z45",
  JLG_ET500J: "jlg-et500j",

  GS1930: "genie-gs1930",
  GS3246: "genie-gs3246",

  PRESSURE_WASHER: "pressure-washer",
  SURFACE_CLEANER: "surface-cleaner",
  SNAKE: "snake",
  EEL: "eel",
  ROTARY_HAMMER: "rotary-hammer-drill",
  STUMP_GRINDER: "stump-grinder",
  TRASH_PUMP: "trash-pump",
  SUMP_PUMP: "sump-pump",
  GAS_COMPRESSOR: "gas-compressor",
  PANCAKE: "pancake",
  SPLITTER: "splitter",

  CAT_MULCHER: "cat-hm316-mulcher",
  JD_MULCHER: "jd-mh60d-mulcher",
  AUGER: "auger-skid",
  BREAKER: "breaker",
  POWER_RAKE: "power-rake",
  BRUSHCAT: "brushcat",
  GRAPPLE: "grapple",

  CONCRETE_SAW: "concrete-saw",
  SCREED: "screed",
  TROWEL: "trowel",
  VIBRATOR: "vibrator",
  BULL_FLOAT: "bull-float"
};

const MULCHER_COMBOS = {
  cat: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265],
  jd: [ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P]
};

const EQUIPMENT = {
  [ITEM_IDS.CAT_3017]: {
    name: "CAT 301.7 Mini Excavator",
    category: "excavator",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "CAT 301.7",
    aliases: [
      "301.7",
      "3017",
      "cat 301.7",
      "cat301.7",
      "cat 3017",
      "cat3017",
      "cat 301",
      "mini excavator",
      "mini excavators",
      "mini ex",
      "small excavator",
      "small digger"
    ],
    details: "18-inch bucket with 12-inch optional bucket, hydraulic thumb, open cab.",
    thumb: "Yes, the CAT 301.7 has a hydraulic thumb.",
    weight: 4222
  },

  [ITEM_IDS.JD_50P]: {
    name: "John Deere 50P Excavator",
    category: "excavator",
    day: 495,
    protection: true,
    delivery: true,
    keyword: "John Deere 50P",
    aliases: [
      "50p",
      "50 p",
      "jd50p",
      "jd 50p",
      "john deere 50p",
      "deere 50p",
      "mid size excavator",
      "larger mini excavator"
    ],
    details: "36-inch bucket, enclosed cab.",
    thumb: "Yes, the John Deere 50P does have a thumb.",
    weight: 11349
  },

  [ITEM_IDS.CAT_3075]: {
    name: "CAT 307.5 Excavator",
    category: "excavator",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "CAT 307.5",
    aliases: [
      "307.5",
      "3075",
      "307 5",
      "cat 307.5",
      "cat307.5",
      "cat 3075",
      "cat3075",
      "bigger excavator",
      "full size excavator"
    ],
    details: "24-inch bucket, hydraulic thumb, enclosed cab, 17,905 lb.",
    thumb: "Yes, the CAT 307.5 has a hydraulic thumb.",
    weight: 17905
  },

  [ITEM_IDS.BOXER]: {
    name: "Boxer Mini Skid Steer",
    category: "skid_steer",
    day: 330,
    protection: true,
    delivery: true,
    keyword: "Boxer Mini Skid Steer",
    aliases: [
      "boxer",
      "mini skid",
      "mini skid steer",
      "ride on skid",
      "ride-on skid",
      "ride on skid steer",
      "ride-on skid steer",
      "walk behind skid steer",
      "stand on skid steer",
      "stand-on skid steer"
    ],
    details: "Bucket is included."
  },

  [ITEM_IDS.CAT_239]: {
    name: "CAT 239",
    category: "skid_steer",
    day: 440,
    protection: true,
    delivery: true,
    keyword: "CAT 239",
    aliases: [
      "239",
      "cat 239",
      "cat239",
      "small cat skid steer",
      "smaller skid steer"
    ],
    details: "Open cab.",
    weight: 7430
  },

  [ITEM_IDS.CAT_265]: {
    name: "CAT 265",
    category: "skid_steer",
    day: 550,
    protection: true,
    delivery: true,
    keyword: "CAT 265",
    aliases: [
      "265",
      "cat 265",
      "cat265",
      "high flow cat skid steer",
      "cat high flow skid steer",
      "high flow skid steer"
    ],
    details: "74 hp, 10,492 lb, closed cab with AC, high flow.",
    weight: 10492
  },

  [ITEM_IDS.JD_333P]: {
    name: "John Deere 333P",
    category: "skid_steer",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "John Deere 333P",
    aliases: [
      "333p",
      "333 p",
      "jd333p",
      "jd 333p",
      "john deere 333p",
      "deere 333p",
      "deere skid steer",
      "john deere skid steer",
      "large john deere skid steer"
    ],
    details: "108.5 hp, 12,183 lb.",
    weight: 12183
  },

  [ITEM_IDS.TELEHANDLER]: {
    name: "JLG 6K Telehandler",
    category: "material_handling",
    day: 723.8,
    week: 1556.5,
    month: 3650,
    protection: true,
    delivery: true,
    keyword: "telehandler",
    aliases: [
      "telehandler",
      "telehandlers",
      "lull",
      "lulls",
      "reach forklift",
      "reach fork lift",
      "jlg 6k telehandler",
      "6k telehandler"
    ],
    details: "6,000 lb capacity, 42 ft 4 in lift height."
  },

  [ITEM_IDS.FORKLIFT]: {
    name: "Mitsubishi Forklift",
    category: "material_handling",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "forklift",
    aliases: [
      "forklift",
      "forklifts",
      "mitsubishi forklift",
      "warehouse forklift",
      "standard forklift"
    ],
    details: "3,150 lb capacity, 17 ft lift height."
  },

  [ITEM_IDS.LIFT_KING]: {
    name: "Lift King 8K Forklift",
    category: "material_handling",
    day: 550,
    protection: true,
    delivery: true,
    keyword: "8k forklift",
    aliases: [
      "lift king",
      "rough terrain forklift",
      "rough ground forklift",
      "8k forklift",
      "off road forklift",
      "outdoor forklift"
    ],
    details: "8,000 lb capacity, 14 ft lift height."
  },

  [ITEM_IDS.MATERIAL_LIFT]: {
    name: "Sumner Contractor Lift",
    category: "material_handling",
    day: 110,
    aliases: ["contractor lift", "duct lift", "material lift", "sheetrock lift"],
    details: "Manual lift, 16 ft max height, 650 lb capacity."
  },

  [ITEM_IDS.GENIE_Z45]: {
    name: "Genie Z45 Articulating Boom Lift",
    category: "boom_lift",
    day: 471,
    week: 1884,
    protection: true,
    delivery: true,
    keyword: "Genie Z45 boom lift",
    aliases: [
      "genie z45",
      "z45",
      "boom lift",
      "boom lifts",
      "man lift",
      "man lifts",
      "articulating boom",
      "articulating boom lift",
      "lift to work in the air"
    ],
    details: "Articulating boom lift."
  },

  [ITEM_IDS.JLG_ET500J]: {
    name: "JLG ET500J Towable 50' Boom Lift",
    category: "boom_lift",
    protection: true,
    delivery: true,
    keyword: "JLG ET500J boom lift",
    aliases: [
      "jlg et500j",
      "et500j",
      "towable boom",
      "towable boom lift",
      "towable 50 boom lift",
      "towable man lift",
      "tow behind boom",
      "tow-behind boom",
      "towable lift"
    ],
    details: "Towable 50-foot boom lift. Please check the website for current pricing."
  },

  [ITEM_IDS.GS1930]: {
    name: "Genie GS1930 Scissor Lift",
    category: "scissor_lift",
    day: 192,
    week: 550,
    month: 715,
    protection: true,
    delivery: true,
    keyword: "Genie GS1930 Scissor Lift",
    aliases: [
      "gs1930",
      "genie gs1930",
      "1930 scissor lift",
      "small scissor lift",
      "slab scissor lift",
      "flat surface scissor lift"
    ],
    details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift."
  },

  [ITEM_IDS.GS3246]: {
    name: "Genie GS3246 Scissor Lift",
    category: "scissor_lift",
    day: 313,
    week: 660,
    month: 1320,
    protection: true,
    delivery: true,
    keyword: "Genie GS3246 Scissor Lift",
    aliases: [
      "gs3246",
      "genie gs3246",
      "3246 scissor lift",
      "larger slab scissor lift",
      "bigger scissor lift"
    ],
    details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift."
  },

  [ITEM_IDS.PRESSURE_WASHER]: {
    name: "Pressure Washer",
    category: "small_tool",
    day: 85,
    aliases: ["pressure washer", "pressure washers", "power washer", "power washers", "rb600", "rb 600"],
    details: "Pressure washer."
  },

  [ITEM_IDS.SURFACE_CLEANER]: {
    name: "Surface Cleaner",
    category: "small_tool",
    day: 38.5,
    aliases: ["surface cleaner", "driveway cleaner", "sidewalk cleaner", "flatwork cleaner"],
    details: "Flatwork surface cleaner."
  },

  [ITEM_IDS.SNAKE]: {
    name: "Ridgid K400 Drain Snake",
    category: "small_tool",
    day: 93.5,
    keyword: "Ridgid K400",
    aliases: [
      "drain snake",
      "drain snakes",
      "snake machine",
      "k400",
      "k-400",
      "ridgid k400",
      "rigid k400",
      "small drain cleaner"
    ],
    details: "Good for many standard drain jobs."
  },

  [ITEM_IDS.EEL]: {
    name: "Electric Eel",
    category: "small_tool",
    day: 137.5,
    keyword: "Electric Eel",
    aliases: [
      "electric eel",
      "commercial drain cleaner",
      "heavy drain cleaner",
      "large drain snake",
      "big drain cleaner"
    ],
    details: "Better for heavier drain jobs."
  },

  [ITEM_IDS.ROTARY_HAMMER]: {
    name: 'Makita 1-9/16" Rotary Hammer Drill',
    category: "small_tool",
    day: 71.5,
    keyword: "rotary hammer drill",
    aliases: [
      "hammer drill",
      "hammer drills",
      "rotary hammer",
      "rotary hammer drill",
      "rotary hammer drills",
      "makita hammer drill",
      "makita rotary hammer",
      "sds max drill",
      "concrete hammer drill"
    ],
    details: "Takes SDS Max bits. Some bits are included."
  },

  [ITEM_IDS.STUMP_GRINDER]: {
    name: "Rayco RG37 Stump Grinder",
    category: "small_tool",
    day: 357.5,
    protection: true,
    delivery: true,
    keyword: "stump grinder",
    aliases: ["stump grinder", "rayco rg37", "rg37", "stump machine", "grind a stump"],
    details: "Rental Protection Plan is required on that machine."
  },

  [ITEM_IDS.TRASH_PUMP]: {
    name: "Trash Pump",
    category: "small_tool",
    day: 88,
    aliases: ["trash pump", "water pump", "pump out water", "pump a pond", "drain pool", "pump pool"],
    details: "2-inch semi-trash pump."
  },

  [ITEM_IDS.SUMP_PUMP]: {
    name: "Sump Pump",
    category: "small_tool",
    day: 93.5,
    aliases: ["sump pump", "submersible sump pump", "submersible pump"],
    details: "Submersible sump pump."
  },

  [ITEM_IDS.GAS_COMPRESSOR]: {
    name: "Gas Air Compressor",
    category: "small_tool",
    day: 71.5,
    aliases: ["gas air compressor", "gas compressor", "towable compressor", "air compressor"],
    details: "Gas-powered air compressor."
  },

  [ITEM_IDS.PANCAKE]: {
    name: "Pancake Compressor",
    category: "small_tool",
    day: 35,
    aliases: ["pancake compressor", "portable compressor", "small compressor"],
    details: "Portable pancake compressor."
  },

  [ITEM_IDS.SPLITTER]: {
    name: "Log Splitter",
    category: "small_tool",
    day: 99,
    aliases: ["log splitter", "split wood", "split logs", "firewood splitter", "wood splitter"],
    details: "Log splitter."
  },

  [ITEM_IDS.CAT_MULCHER]: {
    name: "CAT HM316 Forestry Mulcher",
    category: "attachment",
    day: 610,
    protection: true,
    keyword: "CAT HM316 Forestry Mulcher",
    aliases: ["cat mulcher", "cat hm316", "hm316", "hm316 mulcher", "cat hm 316", "cat forestry mulcher"],
    details:
      "Uses carbide teeth that do not need sharpening. High Flow XPS required. 62-inch working width, 74-inch overall width, 58-inch overall height, 53-inch length, 2,959 lb. Axial piston dual-speed motor, polychain belt drive, 34 fixed teeth, max 8-inch cutting diameter, max 4.1-inch cutting depth. Can be rented by itself or paired with the CAT 265 only."
  },

  [ITEM_IDS.JD_MULCHER]: {
    name: "John Deere MH60D Forestry Mulcher",
    category: "attachment",
    day: 610,
    protection: true,
    keyword: "John Deere MH60D Forestry Mulcher",
    aliases: [
      "john deere mulcher",
      "jd mulcher",
      "mh60d",
      "mh60d mulcher",
      "john deere mh60d",
      "jd mh60d",
      "john deere forestry mulcher"
    ],
    details:
      "Removes up to 8-inch trees and 12-inch stumps. 30 double-carbide-tipped teeth. Two-speed hydraulic system. 60-inch cutting width, 74-inch overall width, 56-inch height, 55-inch length, 2,730 lb. Can be rented by itself or paired with the John Deere 333P only."
  },

  [ITEM_IDS.AUGER]: {
    name: "Skid Steer Auger",
    category: "attachment",
    day: 225,
    aliases: ["skid steer auger", "auger attachment", "auger", "post hole auger", "post hole digger"],
    details: "Bits rented separately. Attachment can be rented separately."
  },

  [ITEM_IDS.BREAKER]: {
    name: "Skid Steer Breaker",
    category: "attachment",
    day: 350,
    aliases: ["skid steer breaker", "breaker attachment", "breaker", "skid steer hammer", "demolition hammer attachment"],
    details: "Attachment can be rented separately."
  },

  [ITEM_IDS.POWER_RAKE]: {
    name: "Power Rake",
    category: "attachment",
    day: 225,
    aliases: ["power rake", "soil conditioner", "soil prep attachment"],
    details: "Attachment can be rented separately."
  },

  [ITEM_IDS.BRUSHCAT]: {
    name: "Brushcat 60",
    category: "attachment",
    day: 275,
    aliases: ["brushcat", "brushcat 60", "skid steer brush cutter", "brush cutter attachment", "bush hog attachment"],
    details: "Attachment can be rented separately."
  },

  [ITEM_IDS.GRAPPLE]: {
    name: "Grapple",
    category: "attachment",
    day: 110,
    aliases: ["grapple", "root grapple", "brush grapple", "tree grapple"],
    details: "Attachment can be rented separately."
  },

  [ITEM_IDS.CONCRETE_SAW]: {
    name: "Concrete Saw",
    category: "small_tool",
    day: 150,
    aliases: ["concrete saw", "cut off saw", "cutoff saw", "stihl saw", "demo saw"],
    details: "Blade is sold separately."
  },

  [ITEM_IDS.SCREED]: {
    name: "Power Screed",
    category: "small_tool",
    day: 137.5,
    aliases: ["power screed", "screed", "vibrating screed", "concrete screed"],
    details: "Screed board rented separately."
  },

  [ITEM_IDS.TROWEL]: {
    name: "Power Trowel",
    category: "small_tool",
    day: 135,
    aliases: ["power trowel", "walk behind trowel", "concrete trowel"],
    details: "Power trowel."
  },

  [ITEM_IDS.VIBRATOR]: {
    name: "Concrete Vibrator",
    category: "small_tool",
    day: 49,
    aliases: ["concrete vibrator", "cement vibrator", "pencil vibrator"],
    details: "Concrete vibrator."
  },

  [ITEM_IDS.BULL_FLOAT]: {
    name: "Bull Float",
    category: "small_tool",
    day: 35,
    aliases: ["bull float", "concrete float"],
    details: "Bull float."
  }
};

const CATEGORY_ALIASES = {
  excavator: ["excavator", "excavators", "mini excavator", "mini excavators", "trackhoe", "trackhoes", "digger", "digger machine"],
  skid_steer: [
    "skid steer",
    "skid steers",
    "skid steer4s",
    "track loader",
    "track loaders",
    "compact track loader",
    "compact track loaders",
    "ctl",
    "ride on skid steer",
    "mini skid steer"
  ],
  boom_lift: ["boom lift", "boom lifts", "man lift", "man lifts", "articulating boom", "towable boom", "towable man lift"],
  scissor_lift: [
    "scissor lift",
    "scissor lifts",
    "slab scissor lift",
    "slab scissor lifts",
    "flat scissor lift",
    "flat surface scissor lift"
  ],
  telehandler: ["telehandler", "telehandlers", "lull", "lulls", "reach forklift"],
  forklift: ["forklift", "forklifts", "warehouse forklift", "rough terrain forklift", "rough ground forklift"],
  pressure_washer: ["pressure washer", "pressure washers", "power washer", "power washers"]
};

const CATEGORY_ITEMS = {
  excavator: [ITEM_IDS.CAT_3017, ITEM_IDS.JD_50P, ITEM_IDS.CAT_3075],
  skid_steer: [ITEM_IDS.BOXER, ITEM_IDS.CAT_239, ITEM_IDS.CAT_265, ITEM_IDS.JD_333P],
  boom_lift: [ITEM_IDS.GENIE_Z45, ITEM_IDS.JLG_ET500J],
  scissor_lift: [ITEM_IDS.GS1930, ITEM_IDS.GS3246]
};

const sessions = new Map();

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
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

function compact(text) {
  return normalize(text).replace(/[\s.-]/g, "");
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(phrase));
}

function aliasVariants(alias) {
  const n = normalize(alias);
  const c = compact(alias);
  const spaced = c
    .replace(/([a-z]+)(\d+)/g, "$1 $2")
    .replace(/(\d+)([a-z]+)/g, "$1 $2")
    .trim();

  return [...new Set([n, c, spaced])];
}

function getSession(psid) {
  if (!sessions.has(psid)) {
    sessions.set(psid, {
      lastId: null,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [],
      lastQuote: null,
      lastMulcherComboChoice: null,
      updatedAt: Date.now()
    });
  }
  return sessions.get(psid);
}

function updateSession(psid, updates) {
  const current = getSession(psid);
  sessions.set(psid, {
    ...current,
    ...updates,
    updatedAt: Date.now()
  });
}

function protectionTotal(days = 1) {
  if (days <= 1) return RENTAL_PROTECTION_PLAN_BASE;
  return RENTAL_PROTECTION_PLAN_BASE * (1 + 0.05 * (days - 1));
}

function getWeeklyRate(item) {
  if (item.week) return item.week;
  return (item.day || 0) * 4;
}

function parseDays(text) {
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

function isMonthlyRequest(text) {
  const t = normalize(text);
  return t.includes("month") || t.includes("monthly");
}

function isPriceQuestion(text) {
  const t = normalize(text);
  return (
    containsAny(t, [
      "how much",
      "what does it cost",
      "whats it cost",
      "what's it cost",
      "what is the cost",
      "price",
      "pricing",
      "quote",
      "cost",
      "day rate",
      "daily rate",
      "rental rate",
      "a week",
      "week",
      "weekly",
      "monthly",
      "month",
      "and 1 day",
      "and one day",
      "and 2 days",
      "and two days",
      "and 3 days",
      "and three days",
      "and 4 days",
      "and four days",
      "and 5 days",
      "and five days",
      "and 6 days",
      "and six days",
      "and 7 days",
      "and seven days"
    ]) || parseDays(t) !== null
  );
}

function isWeightQuestion(text) {
  const t = normalize(text);
  return containsAny(t, ["how heavy", "weight", "weigh", "what does it weigh", "how much does it weigh", "how much it weighs"]);
}

function isThumbQuestion(text) {
  return normalize(text).includes("thumb");
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
    "today",
    "tomorrow",
    "this morning",
    "this afternoon",
    "next week",
    "book",
    "hold it",
    "schedule",
    "scheduled",
    "pickup",
    "pick up",
    "pick it up"
  ]);
}

function isDeliveryQuestion(text) {
  const t = normalize(text);
  return t.includes("delivery") || t.includes("deliver");
}
function isTrailerQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "trailer",
    "trailers",
    "haul it on",
    "haul it",
    "hauling trailer",
    "equipment trailer",
    "car hauler",
    "gooseneck",
    "dump trailer"
  ]);
}
function isDeliveryPriceQuestion(text) {
  const t = normalize(text);
  return containsAny(t, [
    "how much is delivery",
    "how much delivery",
    "delivery cost",
    "delivery price",
    "what is delivery",
    "what does delivery cost",
    "what is the delivery charge",
    "delivery charge",
    "how much to deliver"
  ]);
}

function deliveryInfo(text) {
  const t = normalize(text);

  if (t.includes("perry")) {
    return { fee: 200, placeLabel: "Perry" };
  }

  if (t.includes("steinhatchee") || t.includes("dekle") || t.includes("lamont")) {
    return { fee: 300, placeLabel: "that area" };
  }

  return null;
}

function arrangedBoomLiftIntent(text) {
  const t = normalize(text);
  return containsAny(t, [
    "larger",
    "larger boom",
    "larger boom lift",
    "taller",
    "taller boom",
    "taller boom lift",
    "bigger",
    "specialty boom",
    "specialty equipment",
    "different boom",
    "higher reach"
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
    "cat mulcher",
    "jd mulcher",
    "john deere mulcher",
    "hm316",
    "mh60d"
  ]);
}

function isMulcherComboQuestion(text) {
  const t = normalize(text);
  return (
    containsAny(t, [
      "mulcher combo",
      "mulcher combos",
      "forestry mulcher combo",
      "mulcher and skid steer",
      "with a skid steer",
      "with skid steer",
      "combo"
    ]) || t === "both"
  );
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

function isReferentialFollowup(text) {
  const t = normalize(text);

  if (parseDays(t) !== null) return true;
  if (t === "both") return true;

  return containsAny(t, [
    "it",
    "that one",
    "that machine",
    "how much",
    "price",
    "pricing",
    "cost",
    "quote",
    "week",
    "weekly",
    "monthly",
    "month",
    "weight",
    "weigh",
    "thumb",
    "bucket",
    "cab",
    "delivery",
    "deliver",
    "reserve",
    "available",
    "availability",
    "schedule",
    "book"
  ]);
}

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

function findEquipment(text) {
  const candidates = [];

  for (const [id, item] of Object.entries(EQUIPMENT)) {
    let score = 0;

    for (const alias of item.aliases || []) {
      score = Math.max(score, scoreAliasMatch(text, alias));
    }

    if (score > 0) {
      candidates.push({ id, item, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

function findAllEquipment(text) {
  const found = [];

  for (const [id, item] of Object.entries(EQUIPMENT)) {
    let score = 0;

    for (const alias of item.aliases || []) {
      score = Math.max(score, scoreAliasMatch(text, alias));
    }

    if (score > 0) found.push(id);
  }

  return [...new Set(found)];
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
  return ids.map((id) => `${EQUIPMENT[id].name} (${money(EQUIPMENT[id].day)}/day)`).join(", ");
}

function categoryDisambiguationText(ids, verb = "mean") {
  const names = ids.map((id) => EQUIPMENT[id].name).join(", ");
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
    if (item.month && item.category === "scissor_lift") {
      lines.push(`${money(item.month)} for the month.`);
    }
  }

  if (item.category === "scissor_lift") {
    lines.push("These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.");
  }

  if (item.protection) {
    lines.push(`Rental Protection Plan is ${money(protectionTotal(1))} and is required on that machine.`);
  }

  if (id === ITEM_IDS.CAT_MULCHER) {
    lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");
  }

  if (id === ITEM_IDS.BOXER) {
    lines.push("Bucket is included.");
  }

  if (item.details) {
    lines.push(item.details);
  }

  return lines.join(" ");
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

  if (protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Sales tax (7%): ${money(tax)}`);
  lines.push(`Total: ${money(total)}`);

  if (id === ITEM_IDS.CAT_MULCHER) {
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

  const lines = billedAsWeekly
    ? [`${items.map((i) => i.name).join(" + ")} weekly rate:`]
    : [`${items.map((i) => i.name).join(" + ")} for ${days} day${days > 1 ? "s" : ""}:`];

  for (const item of items) {
    const itemRental = days >= 4 ? getWeeklyRate(item) : (item.day || 0) * days;
    lines.push(`${item.name}: ${money(itemRental)}`);
  }

  if (protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Sales tax (7%): ${money(tax)}`);
  lines.push(`Total: ${money(total)}`);

  if (itemIds.includes(ITEM_IDS.CAT_MULCHER)) {
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

function clearCategoryFields(patch = {}) {
  return {
    ...patch,
    lastCategory: null,
    lastCategoryItems: []
  };
}

function hasExplicitIntentOverride(text) {
  const t = normalize(text);

  return containsAny(t, [
    "cat",
    "the cat",
    "cat combo",
    "caterpillar",
    "cat 265",
    "hm316",
    "cat mulcher",
    "john deere",
    "the john deere",
    "jd",
    "the jd",
    "jd combo",
    "john deere combo",
    "john deere mulcher combo",
    "333p",
    "mh60d",
    "jd mulcher",
    "john deere mulcher",
    "boxer",
    "cat 239",
    "telehandler",
    "lull",
    "forklift",
    "boom lift",
    "man lift",
    "scissor lift",
    "excavator",
    "mini excavator",
    "stump grinder",
    "drain snake",
    "electric eel",
    "pressure washer",
    "surface cleaner",
    "auger",
    "breaker",
    "grapple",
    "brushcat",
    "power rake"
  ]);
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

function detectMulcherComboChoice(text, state) {
  const t = normalize(text);
  const lastCombo = getLastMulcherComboChoice(state);
  const comboish = containsAny(t, ["combo", "mulcher combo", "mulcher", "skid steer"]) || lastCombo !== null;

  if (!comboish && state.lastCategory !== "mulcher_combo") {
    return null;
  }

  if (mentionsCatSide(t)) return "cat";
  if (mentionsJdSide(t)) return "jd";

  if (lastCombo === "cat" && containsAny(t, ["what about the jd", "what about jd", "what about john deere", "tell me about the jd", "tell me about john deere"])) {
    return "jd";
  }

  if (lastCombo === "jd" && containsAny(t, ["what about the cat", "what about cat", "tell me about the cat", "tell me about cat"])) {
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
        text:
          `${quote.text}\n\n` +
          "The CAT HM316 Forestry Mulcher can be rented by itself or paired with the CAT 265 only. " +
          "The Boxer and CAT 239 cannot be used with either mulcher.",
        quote
      };
    }

    return { text: quote.text, quote };
  }

  if (variant === "details") {
    return {
      text:
        `${quote.text}\n\n` +
        "The John Deere MH60D Forestry Mulcher can be rented by itself or paired with the John Deere 333P only. " +
        "The Boxer and CAT 239 cannot be used with either mulcher.",
      quote
    };
  }

  return { text: quote.text, quote };
}

function isDetailRequest(text) {
  const t = normalize(text);
  return containsAny(t, ["tell me about", "what about", "details", "info", "information", "more about"]);
}

function reply(message, state) {
  const text = normalize(message);
  const explicitFound = findEquipment(message);
  const matchedIds = findAllEquipment(message);
  const category = findCategory(message);
  const explicitIntentOverride = hasExplicitIntentOverride(message);
  const comboChoice = detectMulcherComboChoice(message, state);
  const useLastId =
  !explicitFound &&
  !explicitIntentOverride &&
  !comboChoice &&
  !isTrailerQuestion(message) &&
  isReferentialFollowup(message);  const id = explicitFound ? explicitFound.id : useLastId ? state.lastId : null;
  const item = id ? EQUIPMENT[id] : null;
  const days = parseDays(message) || 1;
  const delivery = deliveryInfo(message);
  const deliveryFee = delivery?.fee || 0;

  // Mulcher entry flow.
  if (isMulcherQuestion(message)) {
    if (isMulcherComboQuestion(message)) {
      return {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P],
        lastQuotedItems: [],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }

    if (isMulcherOnlyQuestion(message)) {
      return {
        text: `We have a CAT HM316 Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.CAT_MULCHER].day)}/day) and a John Deere MH60D Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.JD_MULCHER].day)}/day). The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.`,
        lastId: null,
        lastCategory: "mulcher",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.JD_MULCHER],
        lastQuotedItems: [],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }

    return {
      text: "Do you need the mulcher and skid steer or just the mulcher?",
      lastId: null,
      lastCategory: "mulcher",
      lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.JD_MULCHER],
      lastQuotedItems: [],
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (state.lastCategory === "mulcher") {
    if (isMulcherOnlyQuestion(message)) {
      return {
        text: `We have a CAT HM316 Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.CAT_MULCHER].day)}/day) and a John Deere MH60D Forestry Mulcher (${money(EQUIPMENT[ITEM_IDS.JD_MULCHER].day)}/day). The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.`,
        lastId: null,
        lastCategory: "mulcher",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.JD_MULCHER],
        lastQuotedItems: [],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }

    if (isMulcherComboQuestion(message)) {
      return {
        text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
        lastId: null,
        lastCategory: "mulcher_combo",
        lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P],
        lastQuotedItems: [],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }
  }

  if (state.lastCategory === "mulcher_combo" && text === "both") {
    return {
      text: "Which combo do you need — CAT HM316 + CAT 265 or John Deere MH60D + John Deere 333P? The Boxer and CAT 239 cannot be used with either mulcher.",
      lastId: null,
      lastCategory: "mulcher_combo",
      lastCategoryItems: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265, ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // Explicit CAT/JD mulcher combo choice should override sticky lastQuote logic.
  if (comboChoice) {
    const variant = isDetailRequest(message) ? "details" : "quote";
    const response = buildMulcherComboResponse(comboChoice, days, deliveryFee, variant);
    const comboIds = MULCHER_COMBOS[comboChoice];
    const representativeId = comboChoice === "cat" ? ITEM_IDS.CAT_265 : ITEM_IDS.JD_333P;

    return clearCategoryFields({
      text: response.text,
      lastId: representativeId,
      lastQuotedItems: comboIds,
      lastQuote: response.quote,
      lastMulcherComboChoice: comboChoice
    });
  }

  // CAT disambiguation outside mulcher combo flow.
  if (text === "cat" || text === "the cat") {
    return {
      text: "Which CAT machine are you referring to — CAT 265 skid steer, CAT HM316 mulcher, CAT 301.7 excavator, or CAT 307.5 excavator?",
      lastId: null,
      lastCategory: "cat_disambiguation",
      lastCategoryItems: [ITEM_IDS.CAT_265, ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_3017, ITEM_IDS.CAT_3075],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (state.lastCategory === "cat_disambiguation") {
    if (containsAny(text, ["265", "cat 265", "skid steer"])) {
      const selected = ITEM_IDS.CAT_265;
      const quote = buildBundleQuote([selected], 1, 0);
      return clearCategoryFields({
        text: singleQuote(EQUIPMENT[selected], selected),
        lastId: selected,
        lastQuotedItems: [selected],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (containsAny(text, ["hm316", "mulcher", "cat mulcher"])) {
      const selected = ITEM_IDS.CAT_MULCHER;
      const quote = buildBundleQuote([selected], 1, 0);
      return clearCategoryFields({
        text: singleQuote(EQUIPMENT[selected], selected),
        lastId: selected,
        lastQuotedItems: [selected],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (containsAny(text, ["301.7", "3017", "cat 301", "small excavator"])) {
      const selected = ITEM_IDS.CAT_3017;
      const quote = buildBundleQuote([selected], 1, 0);
      return clearCategoryFields({
        text: singleQuote(EQUIPMENT[selected], selected),
        lastId: selected,
        lastQuotedItems: [selected],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (containsAny(text, ["307.5", "3075", "cat 307", "bigger excavator"])) {
      const selected = ITEM_IDS.CAT_3075;
      const quote = buildBundleQuote([selected], 1, 0);
      return clearCategoryFields({
        text: singleQuote(EQUIPMENT[selected], selected),
        lastId: selected,
        lastQuotedItems: [selected],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    return {
      text: "Which CAT machine are you referring to — CAT 265 skid steer, CAT HM316 mulcher, CAT 301.7 excavator, or CAT 307.5 excavator?",
      lastId: null,
      lastCategory: "cat_disambiguation",
      lastCategoryItems: [ITEM_IDS.CAT_265, ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_3017, ITEM_IDS.CAT_3075],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // Delivery logic.
  if (isDeliveryQuestion(message)) {
    if (isDeliveryPriceQuestion(message)) {
      if (delivery) {
        return {
          text: `Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`,
          lastId: state.lastId,
          lastCategory: state.lastCategory,
          lastCategoryItems: state.lastCategoryItems,
          lastQuotedItems: state.lastQuotedItems,
          lastQuote: state.lastQuote,
          lastMulcherComboChoice: state.lastMulcherComboChoice
        };
      }

      return {
        text: "What city or area are you in? Delivery pricing depends on location.",
        lastId: state.lastId,
        lastCategory: state.lastCategory,
        lastCategoryItems: state.lastCategoryItems,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }

    if (delivery) {
      return {
        text: `Yes, we can deliver there. Delivery for ${delivery.placeLabel} is ${money(delivery.fee)}.`,
        lastId: state.lastId,
        lastCategory: state.lastCategory,
        lastCategoryItems: state.lastCategoryItems,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      };
    }

    return {
      text: `We deliver within about a ${DELIVERY_RADIUS_MILES}-mile radius. What city or area are you in? Delivery pricing depends on location.`,
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // Trailer questions should not inherit the last quoted machine.
  if (isTrailerQuestion(message)) {
    return {
      text: `Sometimes my inventory database is incomplete, so you may need to check the website at ${WEBSITE} for that item.`,
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }
    const quote = buildBundleQuote(matchedIds, days, deliveryFee);
    return clearCategoryFields({
      text: quote.text,
      lastId: matchedIds[0],
      lastQuotedItems: matchedIds,
      lastQuote: quote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    });
  }

  // Follow-up quote stays attached to last quote only if no explicit override.
  if (
    state.lastQuote &&
    !explicitFound &&
    !category &&
    !explicitIntentOverride &&
    !comboChoice &&
    (isPriceQuestion(message) || parseDays(message) !== null || text === "a week" || text === "week")
  ) {
    const requestedDays = parseDays(message) || state.lastQuote.days || 1;
    const requestedDeliveryFee = deliveryFee || state.lastQuote.deliveryFee || 0;

    if (state.lastQuote.itemIds?.length >= 2) {
      const quote = buildBundleQuote(state.lastQuote.itemIds, requestedDays, requestedDeliveryFee);
      return clearCategoryFields({
        text: quote.text,
        lastId: state.lastId,
        lastQuotedItems: state.lastQuote.itemIds,
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (state.lastQuote.itemIds?.length === 1) {
      const singleId = state.lastQuote.itemIds[0];
      const singleItem = EQUIPMENT[singleId];

      if (singleItem) {
        if (isMonthlyRequest(message) && singleId === ITEM_IDS.TELEHANDLER) {
          return clearCategoryFields({
            text: `Monthly pricing for ${singleItem.name} is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`,
            lastId: singleId,
            lastQuotedItems: [singleId],
            lastQuote: state.lastQuote,
            lastMulcherComboChoice: state.lastMulcherComboChoice
          });
        }

        const quote = multiDayQuote(singleItem, singleId, requestedDays, requestedDeliveryFee);
        return clearCategoryFields({
          text: quote.text,
          lastId: singleId,
          lastQuotedItems: [singleId],
          lastQuote: quote,
          lastMulcherComboChoice: state.lastMulcherComboChoice
        });
      }
    }
  }

  // Category-level flows.
  if (category === "scissor_lift" && !explicitFound) {
    return {
      text:
        `We have two slab scissor lifts available:\n\n` +
        `• Genie GS1930 – ${money(EQUIPMENT[ITEM_IDS.GS1930].day)}/day, ${money(EQUIPMENT[ITEM_IDS.GS1930].week)}/week, ${money(EQUIPMENT[ITEM_IDS.GS1930].month)}/month\n` +
        `• Genie GS3246 – ${money(EQUIPMENT[ITEM_IDS.GS3246].day)}/day, ${money(EQUIPMENT[ITEM_IDS.GS3246].week)}/week, ${money(EQUIPMENT[ITEM_IDS.GS3246].month)}/month\n\n` +
        `These are slab scissor lifts, not rough-terrain scissor lifts. Rough-terrain scissor lifts must be special ordered.`,
      lastId: null,
      lastCategory: "scissor_lift",
      lastCategoryItems: CATEGORY_ITEMS.scissor_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "boom_lift" && !explicitFound) {
    return {
      text: `We have a Genie Z45 Articulating Boom Lift (${money(EQUIPMENT[ITEM_IDS.GENIE_Z45].day)}/day) and a JLG ET500J Towable 50' Boom Lift. For current ET500J pricing, please check the website at ${WEBSITE}. If you need a larger, taller, or specialty boom lift, we can arrange one. Please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastId: null,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "excavator" && !explicitFound) {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.excavator)}.`,
      lastId: null,
      lastCategory: "excavator",
      lastCategoryItems: CATEGORY_ITEMS.excavator,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "skid_steer" && !explicitFound) {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.skid_steer)}.`,
      lastId: null,
      lastCategory: "skid_steer",
      lastCategoryItems: CATEGORY_ITEMS.skid_steer,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "telehandler" && !explicitFound) {
    return {
      text: `We have a JLG 6K Telehandler for ${money(EQUIPMENT[ITEM_IDS.TELEHANDLER].day)}/day and ${money(EQUIPMENT[ITEM_IDS.TELEHANDLER].week)}/week. Monthly pricing is quoted by Dave based on current market conditions.`,
      lastId: ITEM_IDS.TELEHANDLER,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [ITEM_IDS.TELEHANDLER],
      lastQuote: buildBundleQuote([ITEM_IDS.TELEHANDLER], 1, 0),
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "forklift" && !explicitFound) {
    return {
      text: "Yes—we have a standard forklift, a rough-terrain forklift, and a telehandler. Are you looking for a warehouse-style forklift, rough-ground forklift, or a lull?",
      lastId: null,
      lastCategory: "forklift",
      lastCategoryItems: [ITEM_IDS.FORKLIFT, ITEM_IDS.LIFT_KING, ITEM_IDS.TELEHANDLER],
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (category === "pressure_washer" && !explicitFound) {
    return {
      text: `Yes, we have a pressure washer for ${money(EQUIPMENT[ITEM_IDS.PRESSURE_WASHER].day)} a day. We also have a surface cleaner for ${money(EQUIPMENT[ITEM_IDS.SURFACE_CLEANER].day)} a day for flatwork.`,
      lastId: ITEM_IDS.PRESSURE_WASHER,
      lastCategory: null,
      lastCategoryItems: [],
      lastQuotedItems: [ITEM_IDS.PRESSURE_WASHER],
      lastQuote: buildBundleQuote([ITEM_IDS.PRESSURE_WASHER], 1, 0),
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  if (
    (category === "boom_lift" || state.lastCategory === "boom_lift" || item?.category === "boom_lift") &&
    arrangedBoomLiftIntent(message)
  ) {
    return {
      text: `We can arrange larger or specialty boom lifts if needed. Specialty equipment is handled separately, so please schedule online at ${WEBSITE} or call/text Dave at ${DAVE_PHONE}.`,
      lastId: state.lastId,
      lastCategory: "boom_lift",
      lastCategoryItems: CATEGORY_ITEMS.boom_lift,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // If user tries to schedule after a category list, force clarification.
  if (bookingIntent(message) && !item && state.lastCategoryItems?.length > 1) {
    return {
      text: categoryDisambiguationText(state.lastCategoryItems, "want to schedule"),
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // Explicit item logic.
  if (item) {
    if (bookingIntent(message)) {
      return clearCategoryFields({
        text: schedulingText(item),
        lastId: id,
        lastQuotedItems: state.lastQuotedItems,
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (isMonthlyRequest(message) && id === ITEM_IDS.TELEHANDLER) {
      return clearCategoryFields({
        text: `Monthly pricing for ${item.name} is quoted by Dave based on current market conditions. Please call or text Dave at ${DAVE_PHONE}.`,
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (isWeightQuestion(message)) {
      if (item.weight) {
        return clearCategoryFields({
          text: `${item.name} weighs ${item.weight.toLocaleString()} lb.`,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: state.lastQuote,
          lastMulcherComboChoice: state.lastMulcherComboChoice
        });
      }

      return clearCategoryFields({
        text: item.details || singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (isThumbQuestion(message)) {
      return clearCategoryFields({
        text: item.thumb || `I don’t have a thumb listed on the ${item.name}. ${item.details || ""}`.trim(),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (isBucketOrCabQuestion(message)) {
      return clearCategoryFields({
        text: item.details || singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: state.lastQuote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    if (isPriceQuestion(message)) {
      if (days > 1) {
        const quote = multiDayQuote(item, id, days, deliveryFee);
        return clearCategoryFields({
          text: quote.text,
          lastId: id,
          lastQuotedItems: [id],
          lastQuote: quote,
          lastMulcherComboChoice: state.lastMulcherComboChoice
        });
      }

      const quote = buildBundleQuote([id], 1, deliveryFee);
      return clearCategoryFields({
        text: singleQuote(item, id),
        lastId: id,
        lastQuotedItems: [id],
        lastQuote: quote,
        lastMulcherComboChoice: state.lastMulcherComboChoice
      });
    }

    return clearCategoryFields({
      text: singleQuote(item, id),
      lastId: id,
      lastQuotedItems: [id],
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    });
  }

  // Referential follow-up after category listing.
  if (!explicitFound && state.lastCategoryItems?.length > 1 && !explicitIntentOverride && !comboChoice && isReferentialFollowup(message)) {
    return {
      text: categoryDisambiguationText(
        state.lastCategoryItems,
        bookingIntent(message) ? "want to schedule" : "mean"
      ),
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastCategoryItems: state.lastCategoryItems,
      lastQuotedItems: state.lastQuotedItems,
      lastQuote: state.lastQuote,
      lastMulcherComboChoice: state.lastMulcherComboChoice
    };
  }

  // Final fallback does not clear context.
  return {
    text: unknownItemFallback(),
    lastId: state.lastId,
    lastCategory: state.lastCategory,
    lastCategoryItems: state.lastCategoryItems,
    lastQuotedItems: state.lastQuotedItems,
    lastQuote: state.lastQuote,
    lastMulcherComboChoice: state.lastMulcherComboChoice
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
            lastQuote: result.lastQuote !== undefined ? result.lastQuote : session.lastQuote,
            lastMulcherComboChoice:
              result.lastMulcherComboChoice !== undefined
                ? result.lastMulcherComboChoice
                : session.lastMulcherComboChoice
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
