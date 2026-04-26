
// PATCHED ONLY: isHoursQuestion updated

function isHoursQuestion(message) {
  const t = normalize(message);

  const strongSignals =
    t.includes("hours") ||
    t.includes("open") ||
    t.includes("close") ||
    t.includes("closed") ||
    t.includes("what time") ||
    t.includes("when are you open") ||
    t.includes("business hours");

  const mentionsWeekendOnly =
    t.includes("weekend") &&
    !t.includes("are you open") &&
    !t.includes("open on") &&
    !t.includes("hours") &&
    !t.includes("closed");

  if (mentionsWeekendOnly) return false;

  return strongSignals;
}
