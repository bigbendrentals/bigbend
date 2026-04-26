// MULCHER FIX INCLUDED
function handleMessage(t, state) {

 // HIGH FLOW / MULCHER COMPATIBILITY (FIXED)
if (
  t.includes("mulcher") ||
  t.includes("brush cutter") ||
  t.includes("brushcat") ||
  t.includes("forestry head")
) {
  const ids = [ITEM_IDS.CAT_265, ITEM_IDS.JD_333P];

  state.lastCategory = "skid_steer";
  state.lastCategoryItems = ids;

  return `For a mulcher / brush cutter, you’ll need a high-flow skid steer. These are the correct options:

${formatOptions(ids)}

These machines are equipped to properly run that attachment.`;
}

  return "Normal logic continues...";
}
