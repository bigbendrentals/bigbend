import { EQUIPMENT, ITEM_IDS } from "./inventory.js";

export const SALES_TAX = 0.07;
export const RENTAL_PROTECTION_PLAN_BASE = 49.99;
export const TRAILER_SURCHARGE_FIRST_DAY = 49.99;
export const TRAILER_SURCHARGE_ADDITIONAL_DAY = 15;

export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function protectionTotal(days = 1) {
  if (days <= 1) return RENTAL_PROTECTION_PLAN_BASE;
  return RENTAL_PROTECTION_PLAN_BASE * (1 + 0.05 * (days - 1));
}

export function getWeeklyRate(item) {
  if (item.week) return item.week;
  return (item.day || 0) * 4;
}

export function trailerSurcharge(days = 1) {
  if (days <= 1) return TRAILER_SURCHARGE_FIRST_DAY;
  return TRAILER_SURCHARGE_FIRST_DAY + ((days - 1) * TRAILER_SURCHARGE_ADDITIONAL_DAY);
}

export function trailerSurchargeText(days = 1) {
  if (days <= 1) return `We can supply a trailer for a ${money(TRAILER_SURCHARGE_FIRST_DAY)} surcharge for the first day.`;
  return `We can supply a trailer for a ${money(TRAILER_SURCHARGE_FIRST_DAY)} surcharge for the first day and ${money(TRAILER_SURCHARGE_ADDITIONAL_DAY)} for each additional day. For ${days} days, the trailer surcharge would be ${money(trailerSurcharge(days))}.`;
}

export function trailerPolicyText(days = 1) {
  return `${trailerSurchargeText(days)} Clients can supply their own trailer if it meets the weight requirements for hauling the equipment.`;
}

export function multiDayQuote(item, id, days, deliveryFee = 0) {
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

  if (id === ITEM_IDS.CAT_MULCHER) lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");

  return { text: lines.join("\n"), subtotal, tax, total, rental, protection, days, deliveryFee, itemIds: [id] };
}

export function buildBundleQuote(itemIds, days = 1, deliveryFee = 0) {
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
    if (item.protection) protection += protectionTotal(days);
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

  if (itemIds.includes(ITEM_IDS.CAT_MULCHER)) lines.push("The CAT HM316 is usually better for longer rentals since the carbide teeth don’t need sharpening.");

  return { text: lines.join("\n"), subtotal, tax, total, rental, protection, days, deliveryFee, itemIds };
}

export function applyTrailerToQuote(baseQuote, days) {
  const trailerFee = trailerSurcharge(days);
  const priorTrailerFee = baseQuote.trailerFee || 0;
  const subtotal = (baseQuote.subtotal - priorTrailerFee) + trailerFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;

  return {
    text:
      `${baseQuote.text}\n` +
      `Trailer surcharge: ${money(trailerFee)}\n` +
      `Updated subtotal: ${money(subtotal)}\n` +
      `Sales tax (7%): ${money(tax)}\n` +
      `Total with trailer: ${money(total)}`,
    quote: { ...baseQuote, subtotal, tax, total, trailerFee, days }
  };
}
