import { EQUIPMENT } from "./inventory.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "how", "much", "price", "cost", "total", "about", "what",
  "with", "that", "this", "one", "want", "need", "rent", "rental", "have",
  "available", "option", "options", "do", "you", "u", "does", "did", "can",
  "could", "would", "please", "me", "my", "your", "a", "an", "to", "of", "on",
  "in", "it", "is", "are", "be", "get", "give", "show", "tell"
]);

const BROAD_AVAILABILITY_PHRASES = [
  "do you have",
  "do u have",
  "you have",
  "do you carry",
  "do u carry",
  "carry",
  "available",
  "options",
  "what do you have",
  "what all do you have",
  "rent",
  "rental"
];

const COMBO_WORDS = ["combo", "package", "with skid steer", "with a skid steer"];

const CONTEXT_REFERENCE_WORDS = [
  "the",
  "that",
  "this",
  "one",
  "other",
  "another",
  "cheaper",
  "smaller",
  "bigger",
  "larger",
  "small",
  "big",
  "mini",
  "stihl",
  "cat",
  "john",
  "deere",
  "jd",
  "blue",
  "diamond"
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, phrases) {
  const t = normalizeText(text);
  return phrases.some((phrase) => t.includes(normalizeText(phrase)));
}

export function meaningfulWords(message) {
  return normalizeText(message)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

function itemHaystack(id) {
  const item = EQUIPMENT[id];
  if (!item) return "";
  return `${item.name || ""} ${(item.aliases || []).join(" ")} ${item.details || ""} ${item.category || ""}`.toLowerCase();
}

function scoreItemAgainstMessage(id, message) {
  const text = normalizeText(message);
  const words = meaningfulWords(message);
  const haystack = itemHaystack(id);
  const item = EQUIPMENT[id];

  if (!item || !haystack) return 0;

  let score = 0;

  for (const word of words) {
    if (haystack.includes(word)) score += 3;
  }

  if (text.includes("mini") && haystack.includes("mini")) score += 5;
  if (text.includes("skid") && haystack.includes("skid")) score += 3;
  if (text.includes("auger") && haystack.includes("auger")) score += 5;
  if (text.includes("stihl") && haystack.includes("stihl")) score += 8;
  if (text.includes("blue diamond") && haystack.includes("blue diamond")) score += 8;
  if (text.includes("cat") && (haystack.includes("cat") || haystack.includes("caterpillar"))) score += 5;
  if ((text.includes("john deere") || text === "jd" || text.includes(" jd ")) && (haystack.includes("john deere") || haystack.includes("jd"))) score += 5;

  if ((text.includes("bush hog") || text.includes("brush hog")) &&
      (haystack.includes("bush hog") || haystack.includes("brush hog") || haystack.includes("brush cutter"))) {
    score += 8;
  }

  if (text.includes("compactor") && haystack.includes("compactor")) score += 5;
  if (text.includes("pressure washer") && haystack.includes("pressure washer")) score += 8;
  if (text.includes("surface cleaner") && haystack.includes("surface cleaner")) score += 8;

  return score;
}

export function isBroadAvailabilityQuestion(message) {
  const text = normalizeText(message);
  if (containsAny(text, BROAD_AVAILABILITY_PHRASES)) return true;

  // Plural category words usually mean "show me options"
  return /\b(augers|compactors|mowers|excavators|skid steers|lifts|trailers|generators|saws|pumps)\b/.test(text);
}

export function isComboLike(message) {
  return containsAny(message, COMBO_WORDS);
}

export function shouldAutoSelect(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (isBroadAvailabilityQuestion(text)) return false;
  if (text.split(/\s+/).length <= 1) return false;
  return true;
}

export function resolveFromLastOptions(message, state) {
  const optionIds = state?.lastCategoryItems || state?.lastQuotedItems || [];
  if (!Array.isArray(optionIds) || optionIds.length === 0) return null;

  const text = normalizeText(message);
  const words = meaningfulWords(message);
  if (!text || words.length === 0) return null;

  // Only use context-first matching when the customer sounds like they are picking from the list
  // or when the current words overlap with the listed options.
  const soundsReferential =
    containsAny(text, CONTEXT_REFERENCE_WORDS) ||
    words.length <= 3 ||
    text.includes("how about") ||
    text.includes("what about");

  if (!soundsReferential) return null;

  const scored = optionIds
    .map((id) => ({ id, score: scoreItemAgainstMessage(id, message) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;

  // Require a clear winner if multiple options are close.
  if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score < 8) {
    return null;
  }

  return scored[0].id;
}

export function getRelevantMultiMatches(message, matchedIds) {
  const text = normalizeText(message);
  const ids = [...new Set(matchedIds || [])];

  const filtered = ids.filter((id) => {
    const haystack = itemHaystack(id);

    if (text.includes("mini") && !haystack.includes("mini")) return false;
    if (text.includes("skid") && !haystack.includes("skid")) return false;
    if (text.includes("auger") && !haystack.includes("auger")) return false;

    if ((text.includes("bush hog") || text.includes("brush hog")) &&
        !(haystack.includes("bush hog") || haystack.includes("brush hog") || haystack.includes("brush cutter"))) {
      return false;
    }

    if (text.includes("compactor") && !haystack.includes("compactor")) return false;
    if (text.includes("pressure washer") && !haystack.includes("pressure washer")) return false;

    return true;
  });

  const finalList = filtered.length ? filtered : ids;

  finalList.sort((a, b) => scoreItemAgainstMessage(b, message) - scoreItemAgainstMessage(a, message));

  return finalList;
}

export function resolveSmartSelection(message, state, explicitFound, matchedIds) {
  const contextualMatch = resolveFromLastOptions(message, state);
  if (contextualMatch) {
    return {
      selectedId: contextualMatch,
      source: "context"
    };
  }

  if (matchedIds?.length === 1) {
    return {
      selectedId: matchedIds[0],
      source: "single_match"
    };
  }

  if (explicitFound?.id && shouldAutoSelect(message)) {
    return {
      selectedId: explicitFound.id,
      source: "explicit"
    };
  }

  if (matchedIds?.length > 1 && shouldAutoSelect(message)) {
    const scored = matchedIds
      .map((id) => ({ id, score: scoreItemAgainstMessage(id, message) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length && (scored.length === 1 || scored[0].score > scored[1].score)) {
      return {
        selectedId: scored[0].id,
        source: "scored"
      };
    }
  }

  return {
    selectedId: null,
    source: null
  };
}

export function shouldShowMultiMatchOptions(message, selectedId, matchedIds) {
  if (selectedId) return false;
  if (!matchedIds || matchedIds.length <= 1) return false;
  if (isComboLike(message)) return false;
  return true;
}
