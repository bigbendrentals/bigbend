import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = "v22.0";

if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const SALES_TAX = 0.07;
const PROTECTION = 49.99;
const DAVE = "850-843-2248";

const EQUIPMENT = {
  "cat-3017": { name: "CAT 301.7", day: 385, weight: 4222, thumb: true, category: "excavator" },
  "jd-50p": { name: "John Deere 50P", day: 495, weight: 11349, thumb: true, category: "excavator" },
  "cat-3075": { name: "CAT 307.5", day: 660, weight: 17905, thumb: true, category: "excavator" },

  "cat-239": { name: "CAT 239", day: 440, weight: 7430, category: "skid" },
  "cat-265": { name: "CAT 265", day: 550, weight: 10492, category: "skid" },
  "jd-333p": { name: "John Deere 333P", day: 660, weight: 12183, category: "skid" },
  boxer: { name: "Boxer Mini Skid Steer", day: 330, category: "skid" },

  grapple: { name: "Grapple", day: 110, category: "attachment" }
};

const CATEGORY = {
  skid: ["boxer", "cat-239", "cat-265", "jd-333p"],
  excavator: ["cat-3017", "jd-50p", "cat-3075"]
};

const sessions = new Map();

const normalize = (t) =>
  t.toLowerCase().replace(/4/g, "a").replace(/[^a-z0-9 ]/g, "").trim();

const money = (n) => `$${n.toFixed(2)}`;

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, { lastCategory: null, lastItems: [], lastItem: null });
  }
  return sessions.get(id);
}

function findCategory(text) {
  if (text.includes("skid")) return "skid";
  if (text.includes("excavator")) return "excavator";
  return null;
}

function findItem(text) {
  return Object.entries(EQUIPMENT).find(([k, v]) =>
    text.includes(k.replace("-", "")) ||
    text.includes(v.name.toLowerCase())
  );
}

function buildCategoryList(cat) {
  return CATEGORY[cat]
    .map(id => `${EQUIPMENT[id].name} (${money(EQUIPMENT[id].day)}/day)`)
    .join(", ");
}

function reply(text, state) {
  text = normalize(text);

  const itemMatch = findItem(text);
  const category = findCategory(text) || state.lastCategory;
  const items = state.lastItems || [];

  // CATEGORY REQUEST
  if (category && !itemMatch) {
    const list = CATEGORY[category];
    return {
      text: `We have ${buildCategoryList(category)}.`,
      lastCategory: category,
      lastItems: list,
      lastItem: null
    };
  }

  // MULTI FOLLOW-UP (THIS FIXES YOUR ISSUE)
  if (
    items.length > 1 &&
    (text.includes("that machine") ||
     text.includes("it") ||
     text.includes("schedule") ||
     text.includes("weight") ||
     text.includes("heavy"))
  ) {
    const names = items.map(i => EQUIPMENT[i].name).join(", ");

    if (text.includes("schedule")) {
      return { text: `Which machine do you want to schedule — ${names}?` };
    }

    return { text: `Which machine do you mean — ${names}?` };
  }

  // SINGLE ITEM MATCH
  if (itemMatch) {
    const [id, item] = itemMatch;

    if (text.includes("weight") || text.includes("heavy")) {
      return {
        text: `${item.name} weighs ${item.weight?.toLocaleString()} lbs.`,
        lastItem: id
      };
    }

    if (text.includes("thumb") && item.thumb !== undefined) {
      return {
        text: item.thumb
          ? `Yes, the ${item.name} has a thumb.`
          : `No, the ${item.name} does not have a thumb.`,
        lastItem: id
      };
    }

    if (text.includes("schedule") || text.includes("available")) {
      return {
        text: `To schedule that, contact Dave at ${DAVE} (text preferred).`,
        lastItem: id
      };
    }

    return {
      text: `${item.name} is ${money(item.day)} a day. Rental protection is ${money(PROTECTION)} and required.`,
      lastItem: id
    };
  }

  // BUNDLE
  if (text.includes("and")) {
    if (text.includes("333") && text.includes("grapple")) {
      const total = 660 + 110 + PROTECTION;
      const tax = total * SALES_TAX;
      return {
        text:
          `John Deere 333P + Grapple:\n` +
          `Rental: ${money(770)}\n` +
          `Protection: ${money(PROTECTION)}\n` +
          `Tax: ${money(tax)}\n` +
          `Total: ${money(total + tax)}`
      };
    }
  }

  return { text: "Tell me what equipment you need and I’ll price it out." };
}

async function send(psid, text) {
  await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAGE_ACCESS_TOKEN}`
    },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text }
    })
  });
}

app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  for (const entry of req.body.entry || []) {
    for (const msg of entry.messaging || []) {
      if (msg.message?.text) {
        const psid = msg.sender.id;
        const session = getSession(psid);

        const result = reply(msg.message.text, session);

        sessions.set(psid, {
          ...session,
          lastCategory: result.lastCategory ?? session.lastCategory,
          lastItems: result.lastItems ?? session.lastItems,
          lastItem: result.lastItem ?? session.lastItem
        });

        await send(psid, result.text);
      }
    }
  }
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
