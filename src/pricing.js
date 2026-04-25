import { EQUIPMENT } from "./inventory.js";

export const SALES_TAX = 0.07;
export const RENTAL_PROTECTION_PLAN_BASE = 49.99;
export const TRAILER_SURCHARGE_FIRST_DAY = 49.99;
export const TRAILER_SURCHARGE_ADDITIONAL_DAY = 15;

export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

export function protectionTotal(days = 1) {
  if (days <= 1) return RENTAL_PROTECTION_PLAN_BASE;
  return RENTAL_PROTECTION_PLAN_BASE * (1 + 0.05 * (days - 1));
}

export function getWeeklyRate(item) {
  if (item?.week) return item.week;
  return (item?.day || 0) * 4;
}

export function getMonthlyRate(item) {
  if (item?.month) return item.month;
  const week = getWeeklyRate(item);
  return week ? week * 4 : 0;
}

export function getRentalAmount(item, days = 1) {
  const d = Number(days || 1);
  if (d >= 30) return getMonthlyRate(item);
  if (d >= 7) {
    const weeks = Math.floor(d / 7);
    const extraDays = d % 7;
    return weeks * getWeeklyRate(item) + extraDays * (item?.day || 0);
  }
  if (d >= 4) return getWeeklyRate(item);
  return (item?.day || 0) * d;
}

export function trailerSurcharge(days = 1) {
  const d = Number(days || 1);
  if (d <= 1) return TRAILER_SURCHARGE_FIRST_DAY;
  return TRAILER_SURCHARGE_FIRST_DAY + ((d - 1) * TRAILER_SURCHARGE_ADDITIONAL_DAY);
}

export function quoteTotals(item, days = 1, extras = {}) {
  const rental = getRentalAmount(item, days);
  const protection = item?.protection ? protectionTotal(days) : 0;
  const deliveryFee = Number(extras.deliveryFee || 0);
  const trailerFee = Number(extras.trailerFee || 0);
  const subtotal = rental + protection + deliveryFee + trailerFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;
  return { rental, protection, deliveryFee, trailerFee, subtotal, tax, total };
}

export function buildBundleQuote(itemIds, days = 1, deliveryFee = 0) {
  const items = itemIds.map((id) => ({ id, ...EQUIPMENT[id] })).filter((item) => item.name);
  if (!items.length) return null;

  let rental = 0;
  let protection = 0;
  for (const item of items) {
    rental += getRentalAmount(item, days);
    if (item.protection) protection += protectionTotal(days);
  }

  const subtotal = rental + protection + deliveryFee;
  const tax = subtotal * SALES_TAX;
  const total = subtotal + tax;

  const lines = [`${items.map((i) => i.name).join(" + ")} for ${days} day${days === 1 ? "" : "s"}:`];
  for (const item of items) lines.push(`${item.name}: ${money(getRentalAmount(item, days))}`);
  if (protection) lines.push(`Rental Protection Plan: ${money(protection)}`);
  if (deliveryFee) lines.push(`Delivery: ${money(deliveryFee)}`);
  lines.push(`Subtotal: ${money(subtotal)}`, `Sales tax (7%): ${money(tax)}`, `Total: ${money(total)}`);
  return { text: lines.join("\n"), subtotal, tax, total, rental, protection, days, deliveryFee, itemIds };
}
