// MULCHER FIX INCLUDED
function handleMessage(t, state) {

  // HIGH FLOW / MULCHER COMPATIBILITY OVERRIDE
  if (
    t.includes("mulcher") ||
    t.includes("brush cutter") ||
    t.includes("brushcat") ||
    t.includes("forestry head")
  ) {
    const ids = ["CAT_265", "JD_333P"];

    state.lastCategory = "skid_steer";
    state.lastCategoryItems = ids;

    return `For a mulcher / brush cutter, you’ll need a high-flow skid steer. These are the correct options:

• CAT 265 — $550/day, $2,200/week
• John Deere 333P — $660/day, $2,640/week

These machines are equipped to properly run that attachment.`;
  }

  return "Normal logic continues...";
}
