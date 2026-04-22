import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";

if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
  console.error("Missing META_VERIFY_TOKEN or META_PAGE_ACCESS_TOKEN in environment variables.");
  process.exit(1);
}

const SALES_TAX = 0.07;
const PROTECTION_BASE = 49.99;
const DAVE_PHONE = "850-843-2248";
const WEBSITE = "www.bigbendrentals.net";

const EQUIPMENT = {
  "cat-3017": {
    name: "CAT 301.7 Mini Excavator",
    category: "excavator",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "CAT 301.7",
    aliases: ["301.7", "mini excavator", "cat 301.7", "cat 301"],
    details: "18-inch bucket with 12-inch optional bucket, hydraulic thumb, open cab.",
    thumb: "Yes, the CAT 301.7 has a hydraulic thumb."
  },
  "jd-50p": {
    name: "John Deere 50P Excavator",
    category: "excavator",
    day: 495,
    protection: true,
    delivery: true,
    keyword: "John Deere 50P",
    aliases: ["50p", "jd 50p", "john deere 50p"],
    details: "36-inch bucket, enclosed cab.",
    thumb: "I don’t have a thumb listed on the John Deere 50P. It does have a 36-inch bucket and enclosed cab."
  },
  "cat-3075": {
    name: "CAT 307.5 Excavator",
    category: "excavator",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "CAT 307.5",
    aliases: ["307.5", "cat 307.5"],
    details: "24-inch bucket, hydraulic thumb, enclosed cab, 17,905 lb.",
    thumb: "Yes, the CAT 307.5 has a hydraulic thumb."
  },
  boxer: {
    name: "Boxer Mini Skid Steer",
    category: "skid_steer",
    day: 330,
    protection: true,
    delivery: true,
    keyword: "mini skid steer",
    aliases: ["boxer", "mini skid", "ride on skid", "ride-on skid", "mini skid steer"],
    details: "Bucket included."
  },
  "cat-239": {
    name: "CAT 239",
    category: "skid_steer",
    day: 440,
    protection: true,
    delivery: true,
    keyword: "CAT 239",
    aliases: ["239", "cat 239"],
    details: "Open cab."
  },
  "cat-265": {
    name: "CAT 265",
    category: "skid_steer",
    day: 550,
    protection: true,
    delivery: true,
    keyword: "CAT 265",
    aliases: ["265", "cat 265"],
    details: "74 hp, 10,492 lb, closed cab with AC, high flow."
  },
  "jd-333p": {
    name: "John Deere 333P",
    category: "skid_steer",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "John Deere 333P",
    aliases: ["333p", "jd 333p", "john deere 333p", "100 hp", "108 hp", "high horsepower skid steer"],
    details: "108.5 hp, 12,183 lb."
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
    aliases: ["telehandler", "lull", "jlg 6k telehandler", "6k telehandler"],
    details: "6,000 lb capacity, 42 ft 4 in lift height."
  },
  forklift: {
    name: "Mitsubishi Forklift",
    category: "material_handling",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "forklift",
    aliases: ["forklift", "mitsubishi forklift", "standard forklift"],
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
    keyword: "material lift",
    aliases: ["contractor lift", "duct lift", "material lift"],
    details: "Manual lift, 16 ft max height, 650 lb capacity."
  },
  "pressure-washer": {
    name: "Stihl RB600",
    category: "small_tool",
    day: 85,
    keyword: "pressure washer",
    aliases: ["pressure washer", "power washer", "rb600", "rb 600"]
  },
  "surface-cleaner": {
    name: "Surface Cleaner",
    category: "small_tool",
    day: 38.5,
    keyword: "surface cleaner",
    aliases: ["surface cleaner", "sidewalk cleaner", "driveway cleaner"]
  },
  snake: {
    name: "Ridgid K400",
    category: "small_tool",
    day: 93.5,
    keyword: "drain snake",
    aliases: ["drain snake", "k400", "k-400", "ridgid k400"]
  },
  eel: {
    name: "Electric Eel",
    category: "small_tool",
    day: 137.5,
    keyword: "electric eel",
    aliases: ["electric eel", "commercial drain cleaner", "heavy drain cleaner"]
  },
  splitter: {
    name: "Log Splitter",
    category: "small_tool",
    day: 99,
    keyword: "log splitter",
    aliases: ["log splitter", "split wood", "split logs", "firewood"]
  },
  "trash-pump": {
    name: "Trash Pump",
    category: "small_tool",
    day: 88,
    keyword: "trash pump",
    aliases: ["trash pump", "water pump", "drain a pool", "pump pool", "pump out a pool"],
    details: "2-inch semi-trash pump."
  },
  "sump-pump": {
    name: "Sump Pump",
    category: "small_tool",
    day: 93.5,
    keyword: "sump pump",
    aliases: ["sump pump", "submersible sump pump"]
  },
  "gas-compressor": {
    name: "Gas Air Compressor",
    category: "small_tool",
    day: 71.5,
    keyword: "gas air compressor",
    aliases: ["gas air compressor"]
  },
  pancake: {
    name: "Pancake Compressor",
    category: "small_tool",
    day: 35,
    keyword: "pancake compressor",
    aliases: ["pancake compressor", "portable compressor"]
  },
  "stump-grinder": {
    name: "Rayco RG37",
    category: "small_tool",
    day: 357.5,
    protection: true,
    delivery: true,
    keyword: "stump grinder",
    aliases: ["stump grinder", "rayco rg37"]
  },
  "auger-skid": {
    name: "Skid Steer Auger",
    category: "attachment",
    day: 225,
    keyword: "auger",
    aliases: ["skid steer auger", "auger attachment"],
    details: "Bits rented separately. Attachment can be rented separately."
  },
  breaker: {
    name: "Skid Steer Breaker",
    category: "attachment",
    day: 350,
    keyword: "skid steer breaker",
    aliases: ["skid steer breaker", "skid steer demolition hammer", "breaker attachment"],
    details: "Attachment can be rented separately."
  },
  mulcher: {
    name: "Forestry Mulcher",
    category: "attachment",
    day: 610,
    keyword: "mulcher",
    aliases: ["mulcher", "forestry mulcher"],
    details: "Attachment can be rented separately."
  },
  "power-rake": {
    name: "Power Rake",
    category: "attachment",
    day: 225,
    keyword: "power rake",
    aliases: ["power rake"],
    details: "Attachment can be rented separately."
  },
  brushcat: {
    name: "Brushcat 60",
    category: "attachment",
    day: 275,
    keyword: "Brushcat 60",
    aliases: ["brushcat", "brushcat 60", "skid steer brush cutter"],
    details: "Attachment can be rented separately."
  },
  broom: {
    name: "Hydraulic Broom",
    category: "attachment",
    day: 110,
    keyword: "hydraulic broom",
    aliases: ["hydraulic broom", "broom attachment", "sweeper"],
    details: "Attachment can be rented separately."
  },
  "concrete-saw": {
    name: "Concrete Saw",
    category: "small_tool",
    day: 150,
    keyword: "concrete saw",
    aliases: ["concrete saw", "cut off saw", "cutoff saw", "stihl saw"],
    details: "Diamond blade is 155 and sold separately."
  },
  screed: {
    name: "Power Screed",
    category: "small_tool",
    day: 137.5,
    keyword: "power screed",
    aliases: ["power screed", "screed", "vibrating screed"],
    details: "Screed board rented separately."
  },
  trowel: {
    name: "Power Trowel",
    category: "small_tool",
    day: 135,
    keyword: "power trowel",
    aliases: ["power trowel"]
  },
  vibrator: {
    name: "Concrete Vibrator",
    category: "small_tool",
    day: 49,
    keyword: "concrete vibrator",
    aliases: ["concrete vibrator", "cement vibrator", "pencil vibrator"]
  },
  "bull-float": {
    name: "Bull Float",
    category: "small_tool",
    day: 35,
    keyword: "bull float",
    aliases: ["bull float", "concrete float"]
  }
};

const sessions = new Map();

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function protectionTotal(days = 1) {
  if (days <= 1) return PROTECTION_BASE;
  return PROTECTION_BASE * (1 + 0.05 * (days - 1));
}

function normalize(text) {
  return String(text || "").toLowerCase();
}

function findEquipment(text) {
  const t = normalize(text);
  return Object.entries(EQUIPMENT).find(([, item]) => item.aliases.some((alias) => t.includes(alias)));
}

function parseDays(text) {
  const t = normalize(text);
  const match = t.match(/\b(\d+)\s*day/);
  if (match) return Number(match[1]);
  if (t.includes("two days")) return 2;
  if (t.includes("three days")) return 3;
  if (t.includes("four days")) return 4;
  if (t.includes("one day") || t.includes("a day")) return 1;
  return null;
}

function bookingIntent(text) {
  const t = normalize(text);
  return ["reserve", "availability", "available", "tomorrow", "next week", "book", "hold it"].some((k) => t.includes(k));
}

function deliveryInfo(text) {
  const t = normalize(text);
  if (t.includes("steinhatchee") || t.includes("dekle") || t.includes("lamont")) {
    return { fee: 300, msg: "That falls within our 11–75 mile delivery range." };
  }
  if (t.includes("perry")) {
    return { fee: 200, msg: "That falls within our local delivery range." };
  }
  return null;
}

function isPriceQuestion(text) {
  const t = normalize(text);
  return ["how much", "price", "cost", "total"].some((k) => t.includes(k));
}

function singleQuote(item, id) {
  const parts = [];
  if (item.day) parts.push(`${item.name} is ${money(item.day)} a day.`);
  if (item.week) parts.push(`${money(item.week)} for the week.`);
  if (item.month) parts.push(`${money(item.month)} for the month.`);
  if (item.protection) parts.push(`Rental protection is ${money(protectionTotal(1))} and is required on that machine.`);
  if (id === "boxer") parts.push("Bucket is included.");
  if (item.details) parts.push(item.details);
  return parts.join(" ");
}

function multiDayQuote(item, days, deliveryFee = 0) {
  const rental = item.day * days;
  const protection = item.protection ? protectionTotal(days) : 0;
  const subtotal = rental + protection + deliveryFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;
  const lines = [`${item.name} for ${days} days:`, `Rental: ${money(rental)}`];
  if (protection) lines.push(`Protection: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`);
  lines.push(`Sales tax (7%): ${money(tax)}`);
  lines.push(`Total: ${money(total)}`);
  return lines.join("\n");
}

function reply(message, state) {
  const text = normalize(message);
  const found = findEquipment(message);
  const id = found ? found[0] : state.lastId;
  const item = id ? EQUIPMENT[id] : null;
  const days = parseDays(message);

  if (["cat-239", "cat-265", "jd-333p", "boxer"].includes(state.lastId)) {
    if (text.includes("dig holes") || text.includes("post holes") || text.includes("fence posts")) {
      return {
        text: `For that, I’d usually pair the machine with an auger. We have a skid steer auger for ${money(EQUIPMENT["auger-skid"].day)} a day, and if you want the smaller setup, the Boxer mini skid with the auger can be a good fit too.`,
        lastId: "auger-skid"
      };
    }
    if (text.includes("clear land") || text.includes("brush") || text.includes("thick brush") || text.includes("overgrowth")) {
      return {
        text: `For land clearing, I’d usually point you toward a mulcher at ${money(EQUIPMENT.mulcher.day)} a day or a Brushcat 60 at ${money(EQUIPMENT.brushcat.day)} a day depending on how aggressive the material is.`,
        lastId: "mulcher"
      };
    }
    if (text.includes("grade") || text.includes("level") || text.includes("smooth out") || text.includes("prep yard") || text.includes("prep soil")) {
      return {
        text: `For grading or leveling, the power rake at ${money(EQUIPMENT["power-rake"].day)} a day is usually a strong fit.`,
        lastId: "power-rake"
      };
    }
    if (text.includes("break concrete") || text.includes("demo") || text.includes("demolition") || text.includes("break up concrete")) {
      return {
        text: `For demolition work, I’d usually pair it with the skid steer breaker at ${money(EQUIPMENT.breaker.day)} a day.`,
        lastId: "breaker"
      };
    }
    if (text.includes("sweep") || text.includes("clean pavement") || text.includes("clean lot") || text.includes("sweep dirt")) {
      return {
        text: `For sweeping or cleanup, the hydraulic broom is ${money(EQUIPMENT.broom.day)} a day.`,
        lastId: "broom"
      };
    }
  }

  if (state.lastId === "pressure-washer" && (text.includes("driveway") || text.includes("sidewalk") || text.includes("concrete"))) {
    return {
      text: `For flat concrete like that, I’d definitely add the surface cleaner for ${money(EQUIPMENT["surface-cleaner"].day)} a day.`,
      lastId: "surface-cleaner"
    };
  }

  if (["snake", "eel"].includes(state.lastId)) {
    if (text.includes("commercial") || text.includes("restaurant") || text.includes("main line") || text.includes("heavy clog")) {
      return {
        text: `That sounds more like Electric Eel territory. It’s ${money(EQUIPMENT.eel.day)} a day.`,
        lastId: "eel"
      };
    }
    if (text.includes("house") || text.includes("bathroom") || text.includes("sink") || text.includes("small line")) {
      return {
        text: `For that kind of drain issue, the Ridgid K400 is usually the better fit. It’s ${money(EQUIPMENT.snake.day)} a day.`,
        lastId: "snake"
      };
    }
  }

  if (bookingIntent(message)) {
    const keyword = item?.keyword || "equipment";
    return {
      text: `For scheduling or availability, you’ll need to contact Dave at ${DAVE_PHONE}—text is preferred, but you can call as well. You can also check options by searching "${keyword}" on our website at ${WEBSITE}.`,
      lastId: id
    };
  }

  if (text.includes("deliver") || text.includes("delivery")) {
    const info = deliveryInfo(message);
    if (info) return { text: `Yes, we can deliver there. ${info.msg}`, lastId: id };
    return { text: "Yes, we deliver within 75 miles.", lastId: id };
  }

  if (text.includes("100 hp") || text.includes("high horsepower")) {
    return {
      text: `Yes, the John Deere 333P fits that. It’s ${money(EQUIPMENT["jd-333p"].day)} a day and it’s 108.5 horsepower and 12,183 lb.`,
      lastId: "jd-333p"
    };
  }

  if (text.includes("do you have a forklift") || text === "forklift") {
    return {
      text: "Yes—we have a standard forklift, a rough-terrain forklift, and a telehandler. Are you looking for a warehouse-style forklift, rough-ground forklift, or a lull?",
      lastId: null
    };
  }

  if (text.includes("i need a skid steer") || text === "skid steer") {
    return {
      text: `We have a Boxer mini skid steer at ${money(EQUIPMENT.boxer.day)} a day, a CAT 239 at ${money(EQUIPMENT["cat-239"].day)} a day, a CAT 265 at ${money(EQUIPMENT["cat-265"].day)} a day, and a John Deere 333P at ${money(EQUIPMENT["jd-333p"].day)} a day. What are you trying to do with it? We also have attachments like an auger, breaker, mulcher, brushcat, and power rake.`,
      lastId: "cat-239"
    };
  }

  if (text.includes("something smaller") || text.includes("anything smaller") || text === "smaller") {
    if (state.lastId === "jd-333p") return { text: `Something smaller would be the CAT 265 at ${money(EQUIPMENT["cat-265"].day)} a day, the CAT 239 at ${money(EQUIPMENT["cat-239"].day)} a day, or the Boxer at ${money(EQUIPMENT.boxer.day)} a day.`, lastId: "cat-265" };
    if (state.lastId === "cat-265") return { text: `Something smaller would be the CAT 239 at ${money(EQUIPMENT["cat-239"].day)} a day or the Boxer at ${money(EQUIPMENT.boxer.day)} a day.`, lastId: "cat-239" };
    if (state.lastId === "cat-239") return { text: `Something smaller would be the Boxer mini skid steer at ${money(EQUIPMENT.boxer.day)} a day.`, lastId: "boxer" };
    if (state.lastId === "cat-3075") return { text: `Something smaller would be the John Deere 50P at ${money(EQUIPMENT["jd-50p"].day)} a day or the CAT 301.7 at ${money(EQUIPMENT["cat-3017"].day)} a day.`, lastId: "jd-50p" };
    return { text: "Do you want something smaller in the skid steer line or the excavator line?", lastId: state.lastId };
  }

  if (text.includes("something bigger") || text.includes("anything bigger") || text === "bigger") {
    if (state.lastId === "boxer") return { text: `Something bigger would be the CAT 239 at ${money(EQUIPMENT["cat-239"].day)} a day, the CAT 265 at ${money(EQUIPMENT["cat-265"].day)} a day, or the John Deere 333P at ${money(EQUIPMENT["jd-333p"].day)} a day.`, lastId: "cat-239" };
    if (state.lastId === "cat-239") return { text: `Something bigger would be the CAT 265 at ${money(EQUIPMENT["cat-265"].day)} a day or the John Deere 333P at ${money(EQUIPMENT["jd-333p"].day)} a day.`, lastId: "cat-265" };
    if (state.lastId === "cat-3017") return { text: `Something bigger would be the John Deere 50P at ${money(EQUIPMENT["jd-50p"].day)} a day or the CAT 307.5 at ${money(EQUIPMENT["cat-3075"].day)} a day.`, lastId: "jd-50p" };
    return { text: "Do you want something bigger in the skid steer line or the excavator line?", lastId: state.lastId };
  }

  if (text.includes("pressure washer") || text.includes("power washer") || text.includes("clean driveway") || text.includes("clean sidewalk")) {
    return {
      text: `Yes, we have a pressure washer for ${money(EQUIPMENT["pressure-washer"].day)} a day. We also have a surface cleaner for ${money(EQUIPMENT["surface-cleaner"].day)} a day for flatwork.`,
      lastId: "pressure-washer"
    };
  }

  if (text.includes("drain") || text.includes("clogged")) {
    return {
      text: `We have a Ridgid K400 for ${money(EQUIPMENT.snake.day)} a day and an Electric Eel for ${money(EQUIPMENT.eel.day)} a day for heavier jobs.`,
      lastId: "snake"
    };
  }

  if (text.includes("drain a pool") || text.includes("pump pool") || text.includes("pump out a pool") || text.includes("pool")) {
    return {
      text: `For pumping out a pool, the trash pump is usually the better option. It’s ${money(EQUIPMENT["trash-pump"].day)} a day. We also have a sump pump for ${money(EQUIPMENT["sump-pump"].day)} a day.`,
      lastId: "trash-pump"
    };
  }

  if (text.includes("what do i need to pour concrete") || text.includes("pour concrete")) {
    return {
      text: `For pouring concrete, the usual setup is a power trowel for ${money(EQUIPMENT.trowel.day)} a day, a power screed for ${money(EQUIPMENT.screed.day)} a day, a concrete vibrator for ${money(EQUIPMENT.vibrator.day)} a day, and a bull float for ${money(EQUIPMENT["bull-float"].day)} a day. If you need to cut after, we also have a concrete saw for ${money(EQUIPMENT["concrete-saw"].day)} a day.`,
      lastId: null
    };
  }

  if (text.includes("digging a pool") || text.includes("dig a pool") || text.includes("pool hole")) {
    return {
      text: `If you’re digging the pool itself, I’d usually start you toward an excavator. We have a CAT 301.7 at ${money(EQUIPMENT["cat-3017"].day)} a day, a John Deere 50P at ${money(EQUIPMENT["jd-50p"].day)} a day, and a CAT 307.5 at ${money(EQUIPMENT["cat-3075"].day)} a day. If the hole is already dug and you need to move material down inside it, the Boxer mini skid at ${money(EQUIPMENT.boxer.day)} a day can make sense too.`,
      lastId: "cat-3017"
    };
  }

  if (text.includes("excavator")) {
    return {
      text: `We have a CAT 301.7 (${money(EQUIPMENT["cat-3017"].day)}/day), JD 50P (${money(EQUIPMENT["jd-50p"].day)}/day), and CAT 307.5 (${money(EQUIPMENT["cat-3075"].day)}/day).`,
      lastId: "cat-3017"
    };
  }

  if (text.includes("telehandler") || text.includes("lull")) {
    return {
      text: `We have a 6K telehandler for ${money(EQUIPMENT.telehandler.day)}/day, ${money(EQUIPMENT.telehandler.week)}/week, or ${money(EQUIPMENT.telehandler.month)}/month. It’s rated at 42 ft 4 in lift height.`,
      lastId: "telehandler"
    };
  }

  if (text.includes("mini skid") || text.includes("ride on skid") || text.includes("ride-on skid")) {
    return {
      text: `Yes, we have a Boxer mini skid steer for ${money(EQUIPMENT.boxer.day)} a day. Bucket is included. We also have attachments like an auger, breaker, mulcher, brushcat, and power rake depending on what you’re trying to do.`,
      lastId: "boxer"
    };
  }

  if (text.includes("stump grinder")) {
    return { text: `Yes, we have a stump grinder for ${money(EQUIPMENT["stump-grinder"].day)} a day.`, lastId: "stump-grinder" };
  }

  if (text.includes("auger")) {
    return { text: `We have a skid steer auger for ${money(EQUIPMENT["auger-skid"].day)} a day. ${EQUIPMENT["auger-skid"].details}`, lastId: "auger-skid" };
  }

  if (text.includes("breaker")) {
    return { text: `We have a skid steer breaker for ${money(EQUIPMENT.breaker.day)} a day. ${EQUIPMENT.breaker.details}`, lastId: "breaker" };
  }

  if (text.includes("mulcher")) {
    return { text: `We have a forestry mulcher for ${money(EQUIPMENT.mulcher.day)} a day. ${EQUIPMENT.mulcher.details}`, lastId: "mulcher" };
  }

  if (text.includes("power rake")) {
    return { text: `We have a power rake for ${money(EQUIPMENT["power-rake"].day)} a day. ${EQUIPMENT["power-rake"].details}`, lastId: "power-rake" };
  }

  if (text.includes("brushcat")) {
    return { text: `We have a Brushcat 60 for ${money(EQUIPMENT.brushcat.day)} a day. ${EQUIPMENT.brushcat.details}`, lastId: "brushcat" };
  }

  if (found && item) {
    if (text.includes("thumb")) {
      if (item.thumb) {
        return { text: item.thumb, lastId: id };
      }
      return { text: `I don’t have a thumb listed on the ${item.name}. ${item.details || ""}`.trim(), lastId: id };
    }

    if (text.includes("bucket")) {
      return { text: item.details || singleQuote(item, id), lastId: id };
    }

    if (text.includes("cab")) {
      return { text: item.details || singleQuote(item, id), lastId: id };
    }

    if (days && days > 1 && item.day) {
      const del = item.delivery ? (deliveryInfo(message)?.fee || 0) : 0;
      return { text: multiDayQuote(item, days, del), lastId: id };
    }

    if (isPriceQuestion(message)) {
      return { text: singleQuote(item, id), lastId: id };
    }

    return { text: singleQuote(item, id), lastId: id };
  }

  return { text: "Tell me what equipment you need and I’ll price it out.", lastId: id };
}

function getSession(psid) {
  if (!sessions.has(psid)) {
    sessions.set(psid, { lastId: null, updatedAt: Date.now() });
  }
  return sessions.get(psid);
}

function updateSession(psid, updates) {
  const session = getSession(psid);
  sessions.set(psid, { ...session, ...updates, updatedAt: Date.now() });
}

function splitMessage(text, maxLen = 1800) {
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
          updateSession(senderId, { lastId: result.lastId || session.lastId });
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
  console.log(`Production Messenger webhook listening on port ${PORT}`);
});
