import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { INVENTORY, WEBSITE, PHONE } from './inventory.js';

const require = createRequire(import.meta.url);
let express;
try {
  express = require('express');
} catch (err) {
  express = null;
}

const app = express
  ? express()
  : {
      use() {},
      get() {},
      post() {},
      listen() {},
    };
if (express) {
  app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
}

function normalize(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9+.#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function money(value) {
  if (value === null || value === undefined) return null;
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function hasPhrase(text, phrase) {
  const nText = ` ${normalize(text).replace(/[-]+/g, ' ')} `;
  const nPhrase = normalize(phrase).replace(/[-\s]+/g, ' ');
  return Boolean(nPhrase && nText.includes(` ${nPhrase} `));
}

function compactModelTokens(text) {
  return normalize(text).replace(/[-\s]+/g, '');
}

function matchingAliases(text, item) {
  const nText = normalize(text);
  const compact = compactModelTokens(text);
  const found = [];
  for (const alias of item.aliases || []) {
    const nAlias = normalize(alias);
    if (!nAlias) continue;
    const aliasCompact = nAlias.replace(/[-\s]+/g, '');
    if (hasPhrase(nText, nAlias)) found.push(nAlias);
    else if (aliasCompact.length >= 6 && compact.includes(aliasCompact)) found.push(nAlias);
  }
  return found;
}

function inventoryAliasMatch(text, item) {
  return matchingAliases(text, item).length > 0;
}

function findInventoryItem(text) {
  const matches = INVENTORY
    .map((item) => ({ item, aliases: matchingAliases(text, item) }))
    .filter((m) => m.aliases.length > 0);

  matches.sort((a, b) => {
    const aBest = Math.max(...a.aliases.map((x) => x.length));
    const bBest = Math.max(...b.aliases.map((x) => x.length));
    if (bBest !== aBest) return bBest - aBest;
    return String(a.item.name).localeCompare(String(b.item.name));
  });

  return matches[0] ? matches[0].item : null;
}

// Conservative classification model:
// We do NOT try to name every possible small tool. There are too many.
// Instead, brokered-machine handling is allowed only when the customer uses
// high-confidence heavy-equipment language. Unknown requests default to the
// website/small-tool fallback instead of being guessed or brokered.
const SMALL_TOOL_HINT_KEYWORDS = [
  'screw gun', 'screwgun', 'impact driver', 'impact wrench', 'drill', 'hammer drill',
  'rotary hammer', 'driver', 'nailer', 'nail gun', 'stapler', 'sawzall', 'reciprocating saw',
  'circular saw', 'miter saw', 'chop saw', 'table saw', 'tile saw', 'chainsaw', 'chain saw',
  'angle grinder', 'bench grinder', 'sander', 'belt sander', 'orbital sander', 'wrench',
  'socket', 'ratchet', 'compressor', 'air compressor', 'fan', 'blower fan', 'shop vac',
  'vacuum', 'ladder', 'hand tool', 'small tool', 'pump sprayer', 'paint sprayer', 'snake',
  'drain snake', 'handheld', 'hand held'
];

// Keep this list intentionally narrow. These are the terms that are safe to treat
// as larger equipment / brokerable-machine requests when they are not already in inventory.
const HIGH_CONFIDENCE_BROKERABLE_MACHINE_KEYWORDS = [
  'wheel loader', 'front end loader', 'front-end loader', 'dozer', 'bulldozer',
  'excavator', 'trackhoe', 'backhoe', 'telehandler', 'reach forklift', 'rough terrain forklift',
  'boom lift', 'scissor lift', 'manlift', 'man lift', 'roller', 'compactor roller',
  'soil compactor', 'motor grader', 'grader', 'tractor', 'forestry mulcher',
  'compact track loader', 'track loader', 'ctl', 'skid steer', 'skidsteer',
  'articulating loader', 'articulated loader', 'towable lift'
];

const MACHINE_CONTEXT_WORDS = [
  'skid steer', 'skidsteer', 'excavator', 'trackhoe', 'loader', 'tractor', 'telehandler',
  'forklift', 'backhoe', 'dozer', 'machine', 'attachment', 'hydraulic', 'high flow', 'high-flow',
  'standard flow', 'standard-flow', 'quick attach', 'quick-attach'
];

const LOADER_WORDS = ['loader', 'wheel loader', 'front end loader', 'front-end loader'];

function hasMachineContext(text) {
  const nText = normalize(text);
  return MACHINE_CONTEXT_WORDS.some((kw) => hasPhrase(nText, kw));
}

function hasSmallToolKeyword(text) {
  const nText = normalize(text);
  return SMALL_TOOL_HINT_KEYWORDS.some((kw) => hasPhrase(nText, kw));
}

function isBrokerableMachineRequest(text) {
  const nText = normalize(text);
  return HIGH_CONFIDENCE_BROKERABLE_MACHINE_KEYWORDS.some((kw) => hasPhrase(nText, kw));
}

function isUnknownSmallTool(text) {
  const nText = normalize(text);
  return hasSmallToolKeyword(nText) && !hasMachineContext(nText) && !findInventoryItem(nText);
}

function shouldUseSmallToolWebsiteFallback(text) {
  const nText = normalize(text);
  // This is the conservative default. If we don't have an inventory match and
  // the customer has not clearly asked for larger equipment, do not guess and
  // do not broker it. Send them to the website/phone confirmation path.
  return !findInventoryItem(nText) && !isBrokerableMachineRequest(nText) && !isLoaderRequest(nText);
}

function isLoaderRequest(text) {
  const nText = normalize(text);
  return LOADER_WORDS.some((kw) => hasPhrase(nText, kw));
}

function isBroadPostPounderRequest(text) {
  const nText = normalize(text);
  const asksPostPounder = hasPhrase(nText, 'post pounder') || hasPhrase(nText, 'post driver') || hasPhrase(nText, 'fence post pounder') || hasPhrase(nText, 'fence post driver');
  return asksPostPounder && !hasPhrase(nText, 'skid steer') && !hasPhrase(nText, 'skidsteer') && !hasPhrase(nText, 'excavator') && !hasPhrase(nText, 'handheld') && !hasPhrase(nText, 'hand held') && !hasPhrase(nText, '2 cycle') && !hasPhrase(nText, '2-cycle');
}

function formatInventoryReply(item) {
  if (item.brokered) {
    return `${item.name}\n\nWe broker this item. Call ${PHONE} or see it here: ${item.productUrl || `https://${WEBSITE}`}.`;
  }
  const parts = [];
  if (item.daily !== null && item.daily !== undefined) parts.push(`${money(item.daily)}/day`);
  if (item.weekly !== null && item.weekly !== undefined) parts.push(`${money(item.weekly)}/week`);
  const priceLine = parts.length ? ` is ${parts.join(', ')}.` : '.';
  return `${item.name}${priceLine} ${item.description || ''}\n\nCall ${PHONE} or book online at ${WEBSITE}.`;
}

function formatPostPounderOptionsReply() {
  const skid = INVENTORY.find((item) => item.id === 'fence_post_pounder_skid_steer_excavator');
  const handheld = INVENTORY.find((item) => item.id === 'handheld_fence_post_driver');
  return `We have two fence post pounder/post driver options:\n\n1. ${skid.name}: ${money(skid.daily)}/day, ${money(skid.weekly)}/week. ${skid.description}\n\n2. ${handheld.name}: ${money(handheld.daily)}/day, ${money(handheld.weekly)}/week. ${handheld.description}\n\nCall ${PHONE} or book online at ${WEBSITE}.`;
}

function universalUnknownItemReply() {
  return `I don’t show that exact item in my quick inventory. We carry many smaller tools and can also help with larger equipment requests, so please check ${WEBSITE} or call ${PHONE} and we can confirm. For larger machines we don’t stock directly, we may be able to help broker the rental.`;
}

function smallToolFallbackReply() {
  return universalUnknownItemReply();
}

function brokeredMachineReply() {
  return universalUnknownItemReply();
}

function loaderReply() {
  return `I don’t show that exact loader in my quick inventory. For loaders, we rent skid steers/compact track loaders and can also broker larger dedicated loaders.\n\nSkid steer options include CAT 239, CAT 265, John Deere 333P, and Boxer mini skid steer.\n\nPlease check ${WEBSITE} or call ${PHONE} and we can confirm. For a larger dedicated loader, call with the machine size and job details, and we can confirm brokered options.`;
}

function buildReply(message) {
  const text = normalize(message);

  if (isBroadPostPounderRequest(text)) return formatPostPounderOptionsReply();

  const exact = findInventoryItem(text);
  if (exact) return formatInventoryReply(exact);

  // Conservative guardrail: unknown small tools, unknown handheld tools,
  // ambiguous requests, and unknown brokerable-machine requests all get the
  // same universal fallback. This avoids relying on a perfect small-tool vs.
  // machine classifier while still mentioning that larger machines may be brokered.
  if (isLoaderRequest(text)) return loaderReply();
  if (isUnknownSmallTool(text) || shouldUseSmallToolWebsiteFallback(text)) return universalUnknownItemReply();
  if (isBrokerableMachineRequest(text)) return brokeredMachineReply();

  return universalUnknownItemReply();
}

function getPageAccessToken() {
  return (
    process.env.PAGE_ACCESS_TOKEN ||
    process.env.FB_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.MESSENGER_PAGE_ACCESS_TOKEN ||
    process.env.PAGE_TOKEN ||
    ''
  );
}

async function sendMessengerText(senderId, text) {
  const token = getPageAccessToken();
  if (!token) {
    console.log('Messenger page token missing. Checked PAGE_ACCESS_TOKEN, FB_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ACCESS_TOKEN, MESSENGER_PAGE_ACCESS_TOKEN, and PAGE_TOKEN; reply would be:', text);
    return;
  }
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(token)}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: senderId }, message: { text } })
  });
}

app.get('/', (req, res) => res.status(200).send('Big Bend Messenger bot is running.'));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'page') return;
    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender && event.sender.id;
        const messageText = event.message && event.message.text;
        if (!senderId || !messageText) continue;
        await sendMessengerText(senderId, buildReply(messageText));
      }
    }
  } catch (err) {
    console.error('Webhook handling error:', err);
  }
});

app.post('/test-reply', (req, res) => {
  res.json({ reply: buildReply(req.body && req.body.message) });
});

const port = process.env.PORT || 3000;
const currentFile = fileURLToPath(import.meta.url);
const executedFile = process.argv[1] || '';

if (!executedFile || currentFile === executedFile) {
  app.listen(port, () => console.log(`Big Bend Messenger bot listening on ${port}`));
}

export {
  app,
  buildReply,
  normalize,
  findInventoryItem,
  isUnknownSmallTool,
  isBrokerableMachineRequest,
  isLoaderRequest,
  hasMachineContext,
  hasSmallToolKeyword,
  shouldUseSmallToolWebsiteFallback,
  universalUnknownItemReply
};
