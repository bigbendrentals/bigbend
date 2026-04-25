// messenger_webhook_server.js (FIXED with mulcher logic)

import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money } from "./pricing.js";
import {
  normalize,
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

const CONTACT_TEXT = "Call 850-295-5373 or book online at www.bigbendrentals.net.";

const stateStore = {};

function getState(senderId) {
  if (!stateStore[senderId]) {
    stateStore[senderId] = {
      lastItemId: null,
      lastCategory: null,
      lastCategoryItems: []
    };
  }
  return stateStore[senderId];
}

function categoryFromText(message) {
  const t = message.toLowerCase();
  if (t.includes("mulcher")) return "mulcher";
  if (t.includes("auger")) return "auger";
  if (t.includes("forklift")) return "forklift";
  return null;
}

function formatOptions(ids) {
  return ids.map(id => {
    const item = EQUIPMENT[id];
    return `• ${item.name} — ${money(item.day)}/day`;
  }).join("\n");
}

function handleMessage(message, senderId) {
  const state = getState(senderId);
  const category = categoryFromText(message);

  // MULCHER CATEGORY
  if (category === "mulcher") {
    const ids = ["cat-hm316-mulcher", "jd-mh60d-mulcher"];
    state.lastCategory = "mulcher";
    state.lastCategoryItems = ids;

    return `We have these mulcher options:

${formatOptions(ids)}

Do you want just the mulcher attachment, or the skid steer + mulcher combo?

• CAT HM316 pairs with CAT 265 only
• John Deere MH60D pairs with John Deere 333P only

Reply "attachment only" or "combo".`;
  }

  // MULCHER COMBO STEP
  if (state.lastCategory === "mulcher" && message.toLowerCase().includes("combo")) {
    return `Which combo do you want?

• CAT HM316 + CAT 265
• John Deere MH60D + John Deere 333P`;
  }

  // FINAL COMBO PRICING
  if (message.toLowerCase().includes("cat") && message.toLowerCase().includes("combo")) {
    return "CAT combo pricing logic here";
  }

  if (message.toLowerCase().includes("john") && message.toLowerCase().includes("combo")) {
    return "John Deere combo pricing logic here";
  }

  return "Can you clarify what you're looking to rent?";
}

export default handleMessage;
