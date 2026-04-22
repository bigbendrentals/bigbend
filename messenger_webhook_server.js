function reply(message, state) {
  const text = normalize(message);
  const found = findEquipment(message);
  const id = found ? found[0] : state.lastId;
  const item = id ? EQUIPMENT[id] : null;
  const days = parseDays(message);
  const delivery = deliveryInfo(message);
  const deliveryFee = delivery?.fee || 0;

  const matchedIds = [...new Set(findAllEquipment(message))];
  const category = findCategory(message) || state.lastCategory;
  const lastCategoryItems = state.lastCategory ? (CATEGORY_ITEMS[state.lastCategory] || []) : [];

  // bundle quote
  if (
    matchedIds.length >= 2 &&
    isPriceQuestion(message)
  ) {
    const quoteDays = days || 1;
    return {
      text: buildBundleQuote(matchedIds, quoteDays, deliveryFee),
      lastId: matchedIds[0],
      lastCategory: null,
      lastQuotedItems: matchedIds,
      lastQuotedDays: quoteDays,
      lastDeliveryFee: deliveryFee
    };
  }

  // follow-up total for prior bundle
  if (
    state.lastQuotedItems &&
    state.lastQuotedItems.length >= 2 &&
    containsAny(text, ["total cost", "total", "altogether", "all in"])
  ) {
    return {
      text: buildBundleQuote(
        state.lastQuotedItems,
        state.lastQuotedDays || 1,
        state.lastDeliveryFee || 0
      ),
      lastId: state.lastId,
      lastCategory: state.lastCategory,
      lastQuotedItems: state.lastQuotedItems,
      lastQuotedDays: state.lastQuotedDays || 1,
      lastDeliveryFee: state.lastDeliveryFee || 0
    };
  }

  // ambiguous follow-up after a category list
  if (
    !found &&
    lastCategoryItems.length > 1 &&
    containsAny(text, [
      "how heavy is that machine",
      "how heavy is it",
      "what does it weigh",
      "how much does it weigh",
      "how much it weighs",
      "can i get it scheduled",
      "can i schedule it",
      "schedule it",
      "schedule that",
      "book it",
      "book that",
      "reserve it",
      "reserve that",
      "is it available",
      "is that available"
    ])
  ) {
    const names = lastCategoryItems.map((x) => EQUIPMENT[x].name).join(", ");
    if (containsAny(text, [
      "can i get it scheduled",
      "can i schedule it",
      "schedule it",
      "schedule that",
      "book it",
      "book that",
      "reserve it",
      "reserve that",
      "is it available",
      "is that available"
    ])) {
      return {
        text: `Which machine do you want to schedule — ${names}?`,
        lastId: state.lastId,
        lastCategory: state.lastCategory
      };
    }
    return {
      text: `Which machine do you mean — ${names}?`,
      lastId: state.lastId,
      lastCategory: state.lastCategory
    };
  }

  // weight/spec questions for a specific machine
  if (item && containsAny(text, ["how much does it weigh", "how much it weighs", "what does it weigh", " weight", " weigh"])) {
    if (item.weight) {
      return { text: `${item.name} weighs ${item.weight.toLocaleString()} lb.`, lastId: id, lastCategory: state.lastCategory };
    }
    return { text: item.details || singleQuote(item, id), lastId: id, lastCategory: state.lastCategory };
  }

  if (item && text.includes("thumb")) {
    if (item.thumb) {
      return { text: item.thumb, lastId: id, lastCategory: state.lastCategory };
    }
    return { text: `I don’t have a thumb listed on the ${item.name}. ${item.details || ""}`.trim(), lastId: id, lastCategory: state.lastCategory };
  }

  if (item && (text.includes("bucket") || text.includes("cab"))) {
    return { text: item.details || singleQuote(item, id), lastId: id, lastCategory: state.lastCategory };
  }

  // booking intent
  if (bookingIntent(message)) {
    if (!found && lastCategoryItems.length > 1) {
      const names = lastCategoryItems.map((x) => EQUIPMENT[x].name).join(", ");
      return {
        text: `Which machine do you want to schedule — ${names}?`,
        lastId: state.lastId,
        lastCategory: state.lastCategory
      };
    }

    const keyword = item?.keyword || "equipment";
    return {
      text: `For scheduling or availability, you’ll need to contact Dave at ${DAVE_PHONE}—text is preferred, but you can call as well. You can also check options by searching "${keyword}" on our website at ${WEBSITE}.`,
      lastId: id,
      lastCategory: state.lastCategory
    };
  }

  // delivery
  if (text.includes("deliver") || text.includes("delivery")) {
    const info = deliveryInfo(message);
    if (info) return { text: `Yes, we can deliver there. ${info.msg}`, lastId: id, lastCategory: state.lastCategory };
    return { text: "Yes, we deliver within 75 miles.", lastId: id, lastCategory: state.lastCategory };
  }

  // exact single-item pricing
  if (matchedIds.length === 1 && item) {
    if (days && days > 1 && item.day) {
      return { text: multiDayQuote(item, days, deliveryFee), lastId: id, lastCategory: null };
    }
    if (isPriceQuestion(message)) {
      return { text: singleQuote(item, id), lastId: id, lastCategory: null };
    }
  }

  // category responses
  if (category === "skid_steer") {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.skid_steer)}.`,
      lastId: null,
      lastCategory: "skid_steer"
    };
  }

  if (category === "excavator") {
    return {
      text: `We have ${formatCategoryQuote(CATEGORY_ITEMS.excavator)}.`,
      lastId: null,
      lastCategory: "excavator"
    };
  }

  if (category === "telehandler") {
    return {
      text: `We have a 6K telehandler for ${money(EQUIPMENT.telehandler.day)}/day, ${money(EQUIPMENT.telehandler.week)}/week, or ${money(EQUIPMENT.telehandler.month)}/month. It’s rated at 42 ft 4 in lift height.`,
      lastId: "telehandler",
      lastCategory: null
    };
  }

  if (category === "forklift") {
    return {
      text: "Yes—we have a standard forklift, a rough-terrain forklift, and a telehandler. Are you looking for a warehouse-style forklift, rough-ground forklift, or a lull?",
      lastId: null,
      lastCategory: "forklift"
    };
  }

  if (category === "pressure_washer") {
    return {
      text: `Yes, we have a pressure washer for ${money(EQUIPMENT["pressure-washer"].day)} a day. We also have a surface cleaner for ${money(EQUIPMENT["surface-cleaner"].day)} a day for flatwork.`,
      lastId: null,
      lastCategory: null
    };
  }

  // job-based routing
  if (text.includes("move tree limbs") || text.includes("move some tree limbs") || text.includes("tree limbs") || text.includes("move limbs") || text.includes("brush pile") || text.includes("move brush") || text.includes("storm debris")) {
    return {
      text: `For moving tree limbs or brush, I’d usually point you toward a skid steer with a grapple. The grapple is ${money(EQUIPMENT.grapple.day)} a day.`,
      lastId: "grapple",
      lastCategory: null
    };
  }

  if (text.includes("grapple")) {
    return { text: `We have a grapple for ${money(EQUIPMENT.grapple.day)} a day. ${EQUIPMENT.grapple.details}`, lastId: "grapple", lastCategory: null };
  }

  if (text.includes("dig holes") || text.includes("post holes") || text.includes("fence posts")) {
    return {
      text: `For that, I’d usually pair the machine with an auger. We have a skid steer auger for ${money(EQUIPMENT["auger-skid"].day)} a day, and if you want the smaller setup, the Boxer mini skid with the auger can be a good fit too.`,
      lastId: "auger-skid",
      lastCategory: null
    };
  }

  if (text.includes("clear land") || text.includes("brush") || text.includes("thick brush") || text.includes("overgrowth")) {
    return {
      text: `For land clearing, I’d usually point you toward a mulcher at ${money(EQUIPMENT.mulcher.day)} a day or a Brushcat 60 at ${money(EQUIPMENT.brushcat.day)} a day depending on how aggressive the material is.`,
      lastId: "mulcher",
      lastCategory: null
    };
  }

  if (text.includes("grade") || text.includes("level") || text.includes("smooth out") || text.includes("prep yard") || text.includes("prep soil")) {
    return {
      text: `For grading or leveling, the power rake at ${money(EQUIPMENT["power-rake"].day)} a day is usually a strong fit.`,
      lastId: "power-rake",
      lastCategory: null
    };
  }

  if (text.includes("break concrete") || text.includes("demo") || text.includes("demolition") || text.includes("break up concrete")) {
    return {
      text: `For demolition work, I’d usually pair it with the skid steer breaker at ${money(EQUIPMENT.breaker.day)} a day.`,
      lastId: "breaker",
      lastCategory: null
    };
  }

  if (text.includes("drain") || text.includes("clogged")) {
    return {
      text: `We have a Ridgid K400 for ${money(EQUIPMENT.snake.day)} a day and an Electric Eel for ${money(EQUIPMENT.eel.day)} a day for heavier jobs.`,
      lastId: "snake",
      lastCategory: null
    };
  }

  if (text.includes("drain a pool") || text.includes("pump pool") || text.includes("pump out a pool") || text.includes("pool")) {
    return {
      text: `For pumping out a pool, the trash pump is usually the better option. It’s ${money(EQUIPMENT["trash-pump"].day)} a day. We also have a sump pump for ${money(EQUIPMENT["sump-pump"].day)} a day.`,
      lastId: "trash-pump",
      lastCategory: null
    };
  }

  if (text.includes("what do i need to pour concrete") || text.includes("pour concrete")) {
    return {
      text: `For pouring concrete, the usual setup is a power trowel for ${money(EQUIPMENT.trowel.day)} a day, a power screed for ${money(EQUIPMENT.screed.day)} a day, a concrete vibrator for ${money(EQUIPMENT.vibrator.day)} a day, and a bull float for ${money(EQUIPMENT["bull-float"].day)} a day. If you need to cut after, we also have a concrete saw for ${money(EQUIPMENT["concrete-saw"].day)} a day.`,
      lastId: state.lastId,
      lastCategory: state.lastCategory
    };
  }

  return {
    text: "Tell me what equipment you need and I’ll price it out.",
    lastId: id,
    lastCategory: state.lastCategory
  };
}
