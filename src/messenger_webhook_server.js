// messenger_webhook_server.js (patched mulcher detection)

// Add these edits into your existing file

function categoryFromText(message) {
  const t = message.toLowerCase();

  if (/\bmulchers?\b/.test(t) || t.includes("forestry mulcher")) return "mulcher";

  return null;
}

function normalizeCategory(category) {
  const c = String(category || "").toLowerCase();

  if (c.includes("mulcher")) return "mulcher";

  return c;
}

// inside categoryIds()
if (key === "mulcher") return h.includes("mulcher");
