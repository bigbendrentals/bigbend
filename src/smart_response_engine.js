// Deprecated: logic has been consolidated into intent.js and messenger_webhook_server.js.
// Keep this file only so old imports do not break during deployment.
export function resolveSmartSelection() { return { selectedId: null, source: null }; }
export function shouldShowMultiMatchOptions(_message, selectedId, matchedIds) { return !selectedId && Array.isArray(matchedIds) && matchedIds.length > 1; }
