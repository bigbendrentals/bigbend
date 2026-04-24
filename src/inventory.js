export const ITEM_IDS = {
  CAT_3017: "cat-3017",
  JD_50P: "jd-50p",
  CAT_3075: "cat-3075",
  BOXER: "boxer",
  CAT_239: "cat-239",
  CAT_265: "cat-265",
  JD_333P: "jd-333p",
  TELEHANDLER: "telehandler",
  FORKLIFT: "forklift",
  LIFT_KING: "lift-king",
  MATERIAL_LIFT: "material-lift",
  GENIE_Z45: "genie-z45",
  JLG_ET500J: "jlg-et500j",
  GS1930: "genie-gs1930",
  GS3246: "genie-gs3246",
  PRESSURE_WASHER: "pressure-washer",
  SURFACE_CLEANER: "surface-cleaner",
  SNAKE: "snake",
  EEL: "eel",
  ROTARY_HAMMER: "rotary-hammer-drill",
  STUMP_GRINDER: "stump-grinder",
  TRASH_PUMP: "trash-pump",
  SUMP_PUMP: "sump-pump",
  GAS_COMPRESSOR: "gas-compressor",
  PANCAKE: "pancake",
  SPLITTER: "splitter",
  CAT_MULCHER: "cat-hm316-mulcher",
  JD_MULCHER: "jd-mh60d-mulcher",
  AUGER: "auger-skid",
  BREAKER: "breaker",
  POWER_RAKE: "power-rake",
  BRUSHCAT: "brushcat",
  GRAPPLE: "grapple",
  CONCRETE_SAW: "concrete-saw",
  SCREED: "screed",
  TROWEL: "trowel",
  VIBRATOR: "vibrator",
  BULL_FLOAT: "bull-float",

  // NEW ITEMS FROM CSV
  BRUSHCAT_60_HIGH_FLOW_BRUSH_CUTTER: "brushcat-60-high-flow",
  BRUSHCAT_72_HIGH_FLOW_BRUSH_CUTTER: "brushcat-72-high-flow",
  LAND_PLANE: "land-plane",
  BOX_BLADE: "box-blade",
  DISC_HARROW: "disc-harrow",
  CULTIPACKER: "cultipacker",
  SEEDER: "seeder",
  TILLER: "tiller",
  LAND_LEVELER: "land-leveler",
  LANDSCAPE_RAKE: "landscape-rake",
  PULVERIZER: "pulverizer",
  AUGER_HEAVY_DUTY: "auger-heavy-duty",
  AUGER_BIT_SET: "auger-bit-set",
  FORK_EXTENSIONS: "fork-extensions",
  PALLET_FORKS_HEAVY_DUTY: "pallet-forks-heavy-duty",
  ROOT_GRAPPLE_HEAVY_DUTY: "root-grapple-heavy-duty",
  TREE_PULLER: "tree-puller",
  LOG_GRAPPLE: "log-grapple",
  STUMP_BUCKET: "stump-bucket",
  ROCK_BUCKET: "rock-bucket",
  TRENCHER_ATTACHMENT: "trencher-attachment",
  BACKHOE_ATTACHMENT: "backhoe-attachment",
  POST_DRIVER: "post-driver",
  CONCRETE_MIXER: "concrete-mixer",
  PLATE_COMPACTOR: "plate-compactor",
  RAMMER: "rammer",
  WATER_TRAILER: "water-trailer",
  EQUIPMENT_TRAILER: "equipment-trailer",
  DUMP_TRAILER: "dump-trailer",
  GOOSENECK_TRAILER: "gooseneck-trailer"
};
export const MULCHER_COMBOS = {
  cat: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265],
  jd: [ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P]
};

export const EQUIPMENT = {

  [ITEM_IDS.CAT_3017]: {
    name: "CAT 301.7 Mini Excavator",
    category: "excavator",
    day: 385,
    protection: true,
    delivery: true,
    keyword: "CAT 301.7",
    aliases: ["301.7","3017","cat 301.7","cat301.7","cat 3017","mini excavator","mini ex","small excavator"],
    details: "18-inch bucket with 12-inch optional bucket, hydraulic thumb, open cab.",
    thumb: "Yes, the CAT 301.7 has a hydraulic thumb.",
    weight: 4222
  },

  [ITEM_IDS.JD_50P]: {
    name: "John Deere 50P Excavator",
    category: "excavator",
    day: 495,
    protection: true,
    delivery: true,
    keyword: "John Deere 50P",
    aliases: ["50p","jd50p","john deere 50p","mid size excavator"],
    details: "36-inch bucket, enclosed cab.",
    thumb: "Yes, the John Deere 50P does have a thumb.",
    weight: 11349
  },

  [ITEM_IDS.CAT_3075]: {
    name: "CAT 307.5 Excavator",
    category: "excavator",
    day: 660,
    protection: true,
    delivery: true,
    keyword: "CAT 307.5",
    aliases: ["307.5","cat 307.5","cat 3075","large excavator"],
    details: "24-inch bucket, hydraulic thumb, enclosed cab.",
    thumb: "Yes, the CAT 307.5 has a hydraulic thumb.",
    weight: 17905
  },

  [ITEM_IDS.BOXER]: {
    name: "Boxer Mini Skid Steer",
    category: "skid_steer",
    day: 330,
    protection: true,
    delivery: true,
    aliases: ["boxer","mini skid","mini skid steer","stand on skid steer"],
    details: "Bucket included."
  },

  [ITEM_IDS.CAT_239]: {
    name: "CAT 239",
    category: "skid_steer",
    day: 440,
    protection: true,
    delivery: true,
    aliases: ["cat 239","239","small skid steer"],
    details: "Open cab.",
    weight: 7430
  },

  [ITEM_IDS.CAT_265]: {
    name: "CAT 265",
    category: "skid_steer",
    day: 550,
    protection: true,
    delivery: true,
    aliases: ["cat 265","high flow skid steer"],
    details: "Closed cab with AC, high flow.",
    weight: 10492
  },

  [ITEM_IDS.JD_333P]: {
    name: "John Deere 333P",
    category: "skid_steer",
    day: 660,
    protection: true,
    delivery: true,
    aliases: ["333p","jd 333p","john deere skid steer"],
    details: "High horsepower skid steer.",
    weight: 12183
  },

  [ITEM_IDS.TELEHANDLER]: {
    name: "JLG 6K Telehandler",
    category: "material_handling",
    day: 723.8,
    week: 1556.5,
    month: 3650,
    protection: true,
    delivery: true,
    aliases: ["telehandler","lull","reach forklift"],
    details: "6,000 lb capacity, 42 ft lift height."
  },

  [ITEM_IDS.FORKLIFT]: {
    name: "Mitsubishi Forklift",
    category: "material_handling",
    day: 385,
    protection: true,
    delivery: true,
    aliases: ["forklift"],
    details: "Warehouse forklift."
  },

  [ITEM_IDS.LIFT_KING]: {
    name: "Lift King 8K Forklift",
    category: "material_handling",
    day: 550,
    protection: true,
    delivery: true,
    aliases: ["rough terrain forklift","8k forklift"],
    details: "Rough terrain forklift."
  },
   [ITEM_IDS.GENIE_Z45]: {
    name: "Genie Z45 Boom Lift",
    category: "boom_lift",
    day: 471,
    week: 1884,
    protection: true,
    delivery: true,
    aliases: ["z45","boom lift","man lift"],
    details: "Articulating boom lift."
  },

  [ITEM_IDS.JLG_ET500J]: {
    name: "JLG ET500J Towable Boom Lift",
    category: "boom_lift",
    protection: true,
    delivery: true,
    aliases: ["et500j","towable boom lift"],
    details: "Check website for pricing."
  },

  [ITEM_IDS.GS1930]: {
    name: "Genie GS1930 Scissor Lift",
    category: "scissor_lift",
    day: 192,
    week: 550,
    month: 715,
    protection: true,
    delivery: true,
    aliases: ["gs1930","scissor lift"],
    details: "Slab lift only."
  },

  [ITEM_IDS.GS3246]: {
    name: "Genie GS3246 Scissor Lift",
    category: "scissor_lift",
    day: 313,
    week: 660,
    month: 1320,
    protection: true,
    delivery: true,
    aliases: ["gs3246","large scissor lift"],
    details: "Slab lift only."
  },

  [ITEM_IDS.PRESSURE_WASHER]: {
    name: "Pressure Washer",
    category: "small_tool",
    day: 85,
    aliases: ["pressure washer"],
    details: "Pressure washer."
  },

  [ITEM_IDS.SURFACE_CLEANER]: {
    name: "Surface Cleaner",
    category: "small_tool",
    day: 38.5,
    aliases: ["surface cleaner"],
    details: "Flatwork cleaner."
  },

  [ITEM_IDS.STUMP_GRINDER]: {
    name: "Rayco RG37 Stump Grinder",
    category: "small_tool",
    day: 357.5,
    protection: true,
    delivery: true,
    aliases: ["stump grinder","rg37"],
    details: "Rental protection required."
  },

  [ITEM_IDS.TRASH_PUMP]: {
    name: "Trash Pump",
    category: "small_tool",
    day: 88,
    aliases: ["trash pump"],
    details: "2-inch pump."
  },

  [ITEM_IDS.SUMP_PUMP]: {
    name: "Sump Pump",
    category: "small_tool",
    day: 93.5,
    aliases: ["sump pump"],
    details: "Submersible pump."
  },

  [ITEM_IDS.GAS_COMPRESSOR]: {
    name: "Gas Compressor",
    category: "small_tool",
    day: 71.5,
    aliases: ["air compressor"],
    details: "Gas powered."
  },

  [ITEM_IDS.PANCAKE]: {
    name: "Pancake Compressor",
    category: "small_tool",
    day: 35,
    aliases: ["pancake compressor"],
    details: "Portable compressor."
  },

  [ITEM_IDS.SPLITTER]: {
    name: "Log Splitter",
    category: "small_tool",
    day: 99,
    aliases: ["log splitter"],
    details: "Wood splitter."
  },
    [ITEM_IDS.CAT_MULCHER]: {
    name: "CAT HM316 Forestry Mulcher",
    category: "attachment",
    day: 610,
    protection: true,
    aliases: ["cat mulcher","hm316"],
    details: "Carbide teeth. High flow required."
  },

  [ITEM_IDS.JD_MULCHER]: {
    name: "John Deere MH60D Forestry Mulcher",
    category: "attachment",
    day: 610,
    protection: true,
    aliases: ["jd mulcher","mh60d"],
    details: "High flow mulcher."
  },

  [ITEM_IDS.AUGER]: {
    name: "Skid Steer Auger",
    category: "attachment",
    day: 225,
    aliases: ["auger"],
    details: "Bits separate."
  },

  [ITEM_IDS.BREAKER]: {
    name: "Skid Steer Breaker",
    category: "attachment",
    day: 350,
    aliases: ["breaker"],
    details: "Hydraulic breaker."
  },

  [ITEM_IDS.GRAPPLE]: {
    name: "Grapple",
    category: "attachment",
    day: 110,
    aliases: ["grapple"],
    details: "Root grapple."
  },

  // 🔥 NEW CSV ITEMS

  [ITEM_IDS.PLATE_COMPACTOR]: {
    name: "Plate Compactor",
    category: "small_tool",
    day: 85,
    aliases: ["plate compactor","compactor"],
    details: "Plate compactor."
  },

  [ITEM_IDS.RAMMER]: {
    name: "Jumping Jack Rammer",
    category: "small_tool",
    day: 95,
    aliases: ["rammer","jumping jack"],
    details: "Rammer compactor."
  },

  [ITEM_IDS.CONCRETE_MIXER]: {
    name: "Concrete Mixer",
    category: "small_tool",
    day: 75,
    aliases: ["concrete mixer"],
    details: "Concrete mixer."
  },

  [ITEM_IDS.TRENCHER_ATTACHMENT]: {
    name: "Skid Steer Trencher",
    category: "attachment",
    day: 225,
    aliases: ["trencher attachment"],
    details: "Attachment."
  },

  [ITEM_IDS.TREE_PULLER]: {
    name: "Tree Puller",
    category: "attachment",
    day: 150,
    aliases: ["tree puller"],
    details: "Attachment."
  },

  [ITEM_IDS.EQUIPMENT_TRAILER]: {
    name: "Equipment Trailer",
    category: "trailer",
    aliases: ["equipment trailer","trailer"],
    details: "Trailer surcharge applies."
  },

  [ITEM_IDS.DUMP_TRAILER]: {
    name: "Dump Trailer",
    category: "trailer",
    aliases: ["dump trailer"],
    details: "Trailer surcharge applies."
  },

  [ITEM_IDS.GOOSENECK_TRAILER]: {
    name: "Gooseneck Trailer",
    category: "trailer",
    aliases: ["gooseneck"],
    details: "Trailer surcharge applies."
  }

};
export const CATEGORY_ALIASES = {
  excavator: ["excavator", "excavators", "mini excavator", "mini excavators", "trackhoe", "trackhoes", "digger", "digger machine"],
  skid_steer: ["skid steer", "skid steers", "skid steer4s", "track loader", "track loaders", "compact track loader", "compact track loaders", "ctl", "ride on skid steer", "mini skid steer"],
  boom_lift: ["boom lift", "boom lifts", "man lift", "man lifts", "articulating boom", "towable boom", "towable man lift"],
  scissor_lift: ["scissor lift", "scissor lifts", "slab scissor lift", "slab scissor lifts", "flat scissor lift", "flat surface scissor lift"],
  telehandler: ["telehandler", "telehandlers", "lull", "lulls", "reach forklift"],
  forklift: ["forklift", "forklifts", "warehouse forklift", "rough terrain forklift", "rough ground forklift"],
  pressure_washer: ["pressure washer", "pressure washers", "power washer", "power washers"],
  trailer: ["trailer", "trailers", "equipment trailer", "dump trailer", "gooseneck"]
};

export const CATEGORY_ITEMS = {
  excavator: [ITEM_IDS.CAT_3017, ITEM_IDS.JD_50P, ITEM_IDS.CAT_3075],
  skid_steer: [ITEM_IDS.BOXER, ITEM_IDS.CAT_239, ITEM_IDS.CAT_265, ITEM_IDS.JD_333P],
  boom_lift: [ITEM_IDS.GENIE_Z45, ITEM_IDS.JLG_ET500J],
  scissor_lift: [ITEM_IDS.GS1930, ITEM_IDS.GS3246]
};
