export const ITEM_IDS = {
  CAT_3017: "cat-3017", JD_50P: "jd-50p", CAT_3075: "cat-3075",
  BOXER: "boxer", CAT_239: "cat-239", CAT_265: "cat-265", JD_333P: "jd-333p",
  TELEHANDLER: "telehandler", FORKLIFT: "forklift", LIFT_KING: "lift-king", MATERIAL_LIFT: "material-lift",
  GENIE_Z45: "genie-z45", JLG_ET500J: "jlg-et500j", GS1930: "genie-gs1930", GS3246: "genie-gs3246",
  PRESSURE_WASHER: "pressure-washer", SURFACE_CLEANER: "surface-cleaner", SNAKE: "snake", EEL: "eel",
  ROTARY_HAMMER: "rotary-hammer-drill", STUMP_GRINDER: "stump-grinder", TRASH_PUMP: "trash-pump", SUMP_PUMP: "sump-pump",
  GAS_COMPRESSOR: "gas-compressor", PANCAKE: "pancake", SPLITTER: "splitter",
  CAT_MULCHER: "cat-hm316-mulcher", JD_MULCHER: "jd-mh60d-mulcher",
  AUGER: "auger-skid", BREAKER: "breaker", POWER_RAKE: "power-rake", BRUSHCAT: "brushcat", GRAPPLE: "grapple",
  CONCRETE_SAW: "concrete-saw", SCREED: "screed", TROWEL: "trowel", VIBRATOR: "vibrator", BULL_FLOAT: "bull-float"
};

export const MULCHER_COMBOS = {
  cat: [ITEM_IDS.CAT_MULCHER, ITEM_IDS.CAT_265],
  jd: [ITEM_IDS.JD_MULCHER, ITEM_IDS.JD_333P]
};

export const EQUIPMENT = {
  [ITEM_IDS.CAT_3017]: { name: "CAT 301.7 Mini Excavator", category: "excavator", day: 385, protection: true, delivery: true, keyword: "CAT 301.7", aliases: ["301.7","3017","cat 301.7","cat301.7","cat 3017","cat3017","cat 301","mini excavator","mini excavators","mini ex","small excavator","small digger"], details: "18-inch bucket with 12-inch optional bucket, hydraulic thumb, open cab.", thumb: "Yes, the CAT 301.7 has a hydraulic thumb.", weight: 4222 },
  [ITEM_IDS.JD_50P]: { name: "John Deere 50P Excavator", category: "excavator", day: 495, protection: true, delivery: true, keyword: "John Deere 50P", aliases: ["50p","50 p","jd50p","jd 50p","john deere 50p","deere 50p","mid size excavator","larger mini excavator"], details: "36-inch bucket, enclosed cab.", thumb: "Yes, the John Deere 50P does have a thumb.", weight: 11349 },
  [ITEM_IDS.CAT_3075]: { name: "CAT 307.5 Excavator", category: "excavator", day: 660, protection: true, delivery: true, keyword: "CAT 307.5", aliases: ["307.5","3075","307 5","cat 307.5","cat307.5","cat 3075","cat3075","bigger excavator","full size excavator"], details: "24-inch bucket, hydraulic thumb, enclosed cab, 17,905 lb.", thumb: "Yes, the CAT 307.5 has a hydraulic thumb.", weight: 17905 },
  [ITEM_IDS.BOXER]: { name: "Boxer Mini Skid Steer", category: "skid_steer", day: 330, protection: true, delivery: true, keyword: "Boxer Mini Skid Steer", aliases: ["boxer","mini skid","mini skid steer","ride on skid","ride-on skid","ride on skid steer","ride-on skid steer","walk behind skid steer","stand on skid steer","stand-on skid steer"], details: "Bucket is included." },
  [ITEM_IDS.CAT_239]: { name: "CAT 239", category: "skid_steer", day: 440, protection: true, delivery: true, keyword: "CAT 239", aliases: ["239","cat 239","cat239","small cat skid steer","smaller skid steer"], details: "Open cab.", weight: 7430 },
  [ITEM_IDS.CAT_265]: { name: "CAT 265", category: "skid_steer", day: 550, protection: true, delivery: true, keyword: "CAT 265", aliases: ["265","cat 265","cat265","high flow cat skid steer","cat high flow skid steer","high flow skid steer"], details: "74 hp, 10,492 lb, closed cab with AC, high flow.", weight: 10492 },
  [ITEM_IDS.JD_333P]: { name: "John Deere 333P", category: "skid_steer", day: 660, protection: true, delivery: true, keyword: "John Deere 333P", aliases: ["333p","333 p","jd333p","jd 333p","john deere 333p","deere 333p","deere skid steer","john deere skid steer","large john deere skid steer"], details: "108.5 hp, 12,183 lb.", weight: 12183 },
  [ITEM_IDS.TELEHANDLER]: { name: "JLG 6K Telehandler", category: "material_handling", day: 723.8, week: 1556.5, month: 3650, protection: true, delivery: true, keyword: "telehandler", aliases: ["telehandler","telehandlers","lull","lulls","reach forklift","reach fork lift","jlg 6k telehandler","6k telehandler"], details: "6,000 lb capacity, 42 ft 4 in lift height." },
  [ITEM_IDS.FORKLIFT]: { name: "Mitsubishi Forklift", category: "material_handling", day: 385, protection: true, delivery: true, keyword: "forklift", aliases: ["forklift","forklifts","mitsubishi forklift","warehouse forklift","standard forklift"], details: "3,150 lb capacity, 17 ft lift height." },
  [ITEM_IDS.LIFT_KING]: { name: "Lift King 8K Forklift", category: "material_handling", day: 550, protection: true, delivery: true, keyword: "8k forklift", aliases: ["lift king","rough terrain forklift","rough ground forklift","8k forklift","off road forklift","outdoor forklift"], details: "8,000 lb capacity, 14 ft lift height." },
  [ITEM_IDS.MATERIAL_LIFT]: { name: "Sumner Contractor Lift", category: "material_handling", day: 110, aliases: ["contractor lift","duct lift","material lift","sheetrock lift"], details: "Manual lift, 16 ft max height, 650 lb capacity." },
  [ITEM_IDS.GENIE_Z45]: { name: "Genie Z45 Articulating Boom Lift", category: "boom_lift", day: 471, week: 1884, protection: true, delivery: true, keyword: "Genie Z45 boom lift", aliases: ["genie z45","z45","boom lift","boom lifts","man lift","man lifts","articulating boom","articulating boom lift","lift to work in the air"], details: "Articulating boom lift." },
  [ITEM_IDS.JLG_ET500J]: { name: "JLG ET500J Towable 50' Boom Lift", category: "boom_lift", protection: true, delivery: true, keyword: "JLG ET500J boom lift", aliases: ["jlg et500j","et500j","towable boom","towable boom lift","towable 50 boom lift","towable man lift","tow behind boom","tow-behind boom","towable lift"], details: "Towable 50-foot boom lift. Please check the website for current pricing." },
  [ITEM_IDS.GS1930]: { name: "Genie GS1930 Scissor Lift", category: "scissor_lift", day: 192, week: 550, month: 715, protection: true, delivery: true, keyword: "Genie GS1930 Scissor Lift", aliases: ["gs1930","genie gs1930","1930 scissor lift","small scissor lift","slab scissor lift","flat surface scissor lift"], details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift." },
  [ITEM_IDS.GS3246]: { name: "Genie GS3246 Scissor Lift", category: "scissor_lift", day: 313, week: 660, month: 1320, protection: true, delivery: true, keyword: "Genie GS3246 Scissor Lift", aliases: ["gs3246","genie gs3246","3246 scissor lift","larger slab scissor lift","bigger scissor lift"], details: "Indoor/outdoor slab scissor lift. Not a rough-terrain scissor lift." },
  [ITEM_IDS.PRESSURE_WASHER]: { name: "Pressure Washer", category: "small_tool", day: 85, aliases: ["pressure washer","pressure washers","power washer","power washers","rb600","rb 600"], details: "Pressure washer." },
  [ITEM_IDS.SURFACE_CLEANER]: { name: "Surface Cleaner", category: "small_tool", day: 38.5, aliases: ["surface cleaner","driveway cleaner","sidewalk cleaner","flatwork cleaner"], details: "Flatwork surface cleaner." },
  [ITEM_IDS.SNAKE]: { name: "Ridgid K400 Drain Snake", category: "small_tool", day: 93.5, keyword: "Ridgid K400", aliases: ["drain snake","drain snakes","snake machine","k400","k-400","ridgid k400","rigid k400","small drain cleaner"], details: "Good for many standard drain jobs." },
  [ITEM_IDS.EEL]: { name: "Electric Eel", category: "small_tool", day: 137.5, keyword: "Electric Eel", aliases: ["electric eel","commercial drain cleaner","heavy drain cleaner","large drain snake","big drain cleaner"], details: "Better for heavier drain jobs." },
  [ITEM_IDS.ROTARY_HAMMER]: { name: 'Makita 1-9/16" Rotary Hammer Drill', category: "small_tool", day: 71.5, keyword: "rotary hammer drill", aliases: ["hammer drill","hammer drills","rotary hammer","rotary hammer drill","rotary hammer drills","makita hammer drill","makita rotary hammer","sds max drill","concrete hammer drill"], details: "Takes SDS Max bits. Some bits are included." },
  [ITEM_IDS.STUMP_GRINDER]: { name: "Rayco RG37 Stump Grinder", category: "small_tool", day: 357.5, protection: true, delivery: true, keyword: "stump grinder", aliases: ["stump grinder","rayco rg37","rg37","stump machine","grind a stump"], details: "Rental Protection Plan is required on that machine." },
  [ITEM_IDS.TRASH_PUMP]: { name: "Trash Pump", category: "small_tool", day: 88, aliases: ["trash pump","water pump","pump out water","pump a pond","drain pool","pump pool"], details: "2-inch semi-trash pump." },
  [ITEM_IDS.SUMP_PUMP]: { name: "Sump Pump", category: "small_tool", day: 93.5, aliases: ["sump pump","submersible sump pump","submersible pump"], details: "Submersible sump pump." },
  [ITEM_IDS.GAS_COMPRESSOR]: { name: "Gas Air Compressor", category: "small_tool", day: 71.5, aliases: ["gas air compressor","gas compressor","towable compressor","air compressor"], details: "Gas-powered air compressor." },
  [ITEM_IDS.PANCAKE]: { name: "Pancake Compressor", category: "small_tool", day: 35, aliases: ["pancake compressor","portable compressor","small compressor"], details: "Portable pancake compressor." },
  [ITEM_IDS.SPLITTER]: { name: "Log Splitter", category: "small_tool", day: 99, aliases: ["log splitter","split wood","split logs","firewood splitter","wood splitter"], details: "Log splitter." },
  [ITEM_IDS.CAT_MULCHER]: { name: "CAT HM316 Forestry Mulcher", category: "attachment", day: 610, protection: true, keyword: "CAT HM316 Forestry Mulcher", aliases: ["cat mulcher","cat hm316","hm316","hm316 mulcher","cat hm 316","cat forestry mulcher"], details: "Uses carbide teeth that do not need sharpening. High Flow XPS required. 62-inch working width, 74-inch overall width, 58-inch overall height, 53-inch length, 2,959 lb. Axial piston dual-speed motor, polychain belt drive, 34 fixed teeth, max 8-inch cutting diameter, max 4.1-inch cutting depth. Can be rented by itself or paired with the CAT 265 only." },
  [ITEM_IDS.JD_MULCHER]: { name: "John Deere MH60D Forestry Mulcher", category: "attachment", day: 610, protection: true, keyword: "John Deere MH60D Forestry Mulcher", aliases: ["john deere mulcher","jd mulcher","mh60d","mh60d mulcher","john deere mh60d","jd mh60d","john deere forestry mulcher"], details: "Removes up to 8-inch trees and 12-inch stumps. 30 double-carbide-tipped teeth. Two-speed hydraulic system. 60-inch cutting width, 74-inch overall width, 56-inch height, 55-inch length, 2,730 lb. Can be rented by itself or paired with the John Deere 333P only." },
  [ITEM_IDS.AUGER]: { name: "Skid Steer Auger", category: "attachment", day: 225, aliases: ["skid steer auger","auger attachment","auger","post hole auger","post hole digger"], details: "Bits rented separately. Attachment can be rented separately." },
  [ITEM_IDS.BREAKER]: { name: "Skid Steer Breaker", category: "attachment", day: 350, aliases: ["skid steer breaker","breaker attachment","breaker","skid steer hammer","demolition hammer attachment"], details: "Attachment can be rented separately." },
  [ITEM_IDS.POWER_RAKE]: { name: "Power Rake", category: "attachment", day: 225, aliases: ["power rake","soil conditioner","soil prep attachment"], details: "Attachment can be rented separately." },
  [ITEM_IDS.BRUSHCAT]: { name: "Brushcat 60", category: "attachment", day: 275, aliases: ["brushcat","brushcat 60","skid steer brush cutter","brush cutter attachment","bush hog attachment"], details: "Attachment can be rented separately." },
  [ITEM_IDS.GRAPPLE]: { name: "Grapple", category: "attachment", day: 110, aliases: ["grapple","root grapple","brush grapple","tree grapple"], details: "Attachment can be rented separately." },
  [ITEM_IDS.CONCRETE_SAW]: { name: "Concrete Saw", category: "small_tool", day: 150, aliases: ["concrete saw","cut off saw","cutoff saw","stihl saw","demo saw"], details: "Blade is sold separately." },
  [ITEM_IDS.SCREED]: { name: "Power Screed", category: "small_tool", day: 137.5, aliases: ["power screed","screed","vibrating screed","concrete screed"], details: "Screed board rented separately." },
  [ITEM_IDS.TROWEL]: { name: "Power Trowel", category: "small_tool", day: 135, aliases: ["power trowel","walk behind trowel","concrete trowel"], details: "Power trowel." },
  [ITEM_IDS.VIBRATOR]: { name: "Concrete Vibrator", category: "small_tool", day: 49, aliases: ["concrete vibrator","cement vibrator","pencil vibrator"], details: "Concrete vibrator." },
  [ITEM_IDS.BULL_FLOAT]: { name: "Bull Float", category: "small_tool", day: 35, aliases: ["bull float","concrete float"], details: "Bull float." }
};

export const CATEGORY_ALIASES = {
  excavator: ["excavator","excavators","mini excavator","mini excavators","trackhoe","trackhoes","digger","digger machine"],
  skid_steer: ["skid steer","skid steers","skid steer4s","track loader","track loaders","compact track loader","compact track loaders","ctl","ride on skid steer","mini skid steer"],
  boom_lift: ["boom lift","boom lifts","man lift","man lifts","articulating boom","towable boom","towable man lift"],
  scissor_lift: ["scissor lift","scissor lifts","slab scissor lift","slab scissor lifts","flat scissor lift","flat surface scissor lift"],
  telehandler: ["telehandler","telehandlers","lull","lulls","reach forklift"],
  forklift: ["forklift","forklifts","warehouse forklift","rough terrain forklift","rough ground forklift"],
  pressure_washer: ["pressure washer","pressure washers","power washer","power washers"]
};

export const CATEGORY_ITEMS = {
  excavator: [ITEM_IDS.CAT_3017, ITEM_IDS.JD_50P, ITEM_IDS.CAT_3075],
  skid_steer: [ITEM_IDS.BOXER, ITEM_IDS.CAT_239, ITEM_IDS.CAT_265, ITEM_IDS.JD_333P],
  boom_lift: [ITEM_IDS.GENIE_Z45, ITEM_IDS.JLG_ET500J],
  scissor_lift: [ITEM_IDS.GS1930, ITEM_IDS.GS3246]
};
