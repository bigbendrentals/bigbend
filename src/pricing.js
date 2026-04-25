
export function money(v){return `$${v.toFixed(2)}`;}

export function total(item, days){
  const rental = item.day * days;
  const protection = item.protection ? 49.99 : 0;
  const subtotal = rental + protection;
  const tax = subtotal * 0.07;
  return { rental, protection, subtotal, tax, total: subtotal+tax };
}
