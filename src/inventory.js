const WEBSITE = 'www.bigbendrentals.net';
const PHONE = '850-295-5373';

const INVENTORY = [
  {
    id: 'prolux_20_floor_buffer',
    name: "Prolux 20' Commercial Floor Buffer Scrubber/Polisher/Sander",
    daily: 93.50,
    weekly: 374.00,
    description: 'Commercial floor buffer/scrubber/polisher/sander.',
    aliases: ['floor buffer', 'buffer', 'floor scrubber', 'scrubber', 'polisher', 'floor polisher', 'floor sander', 'prolux']
  },
  {
    id: 'fence_post_pounder_skid_steer_excavator',
    name: 'Fence Post Pounder (Skid steer or Excavator)',
    daily: 350.00,
    weekly: 1000.00,
    description: 'Fence post pounder for skid steer or excavator.',
    aliases: ['skid steer post pounder', 'excavator post pounder', 'hydraulic post pounder', 'fence post pounder skid steer', 'fence post driver skid steer']
  },
  {
    id: 'handheld_fence_post_driver',
    name: 'Handheld Fence Post Pounder / Post Driver',
    daily: 55.00,
    weekly: 220.00,
    description: 'Handheld 2-cycle fence post pounder/post driver.',
    aliases: ['handheld fence post pounder', 'hand held fence post pounder', 'handheld post pounder', 'hand held post pounder', 'handheld post driver', 'hand held post driver', '2 cycle post driver', '2-cycle post driver', 'post driver', 'fence post driver']
  },
  {
    id: 'tr_industrial_tr89305_demo_hammer',
    name: 'TR Industrial TR89305 Demo Hammer',
    daily: 55.00,
    weekly: null,
    description: 'Electric handheld demolition hammer / jackhammer.',
    aliases: ['tr89305', 'tr 89305', 'tr-89305', 'demo hammer', 'demolition hammer', 'jackhammer', 'jack hammer', 'handheld jackhammer', 'handheld jack hammer', 'electric jackhammer', 'electric jack hammer']
  },
  {
    id: 'skid_steer_demolition_hammer_brokered',
    name: 'Skid Steer Demolition Hammer / Jackhammer',
    daily: null,
    weekly: null,
    brokered: true,
    productUrl: 'https://bigbendrentals.net/products/demolition-hammer-skid-steer-brokered',
    description: 'Brokered skid steer concrete breaker / demolition hammer / jackhammer attachment.',
    aliases: ['skid steer concrete breaker', 'skidsteer concrete breaker', 'skid steer breaker', 'skid steer jackhammer', 'skid steer jack hammer', 'skid steer demolition hammer', 'skid steer demo hammer', 'skid steer hammer', 'concrete breaker for skid steer', 'jackhammer for skid steer', 'demo hammer for skid steer', 'demolition hammer for skid steer']
  },
  {
    id: 'cat_239_skid_steer',
    name: 'CAT 239 Skid Steer',
    daily: null,
    weekly: null,
    description: 'Compact track loader / skid steer.',
    aliases: ['cat 239', '239', 'cat 239 skid steer']
  },
  {
    id: 'cat_265_skid_steer',
    name: 'CAT 265 Skid Steer',
    daily: null,
    weekly: null,
    description: 'High-flow skid steer / compact track loader.',
    aliases: ['cat 265', '265', 'cat 265 skid steer']
  },
  {
    id: 'deere_333p_skid_steer',
    name: 'John Deere 333P Skid Steer',
    daily: null,
    weekly: null,
    description: 'Large skid steer / compact track loader.',
    aliases: ['333p', '333 p', 'john deere 333p', 'deere 333p', 'jd 333p']
  },
  {
    id: 'boxer_skid_steer',
    name: 'Boxer Mini Skid Steer',
    daily: null,
    weekly: null,
    description: 'Mini skid steer.',
    aliases: ['boxer', 'mini skid steer', 'boxer skid steer']
  }
];

export { WEBSITE, PHONE, INVENTORY };
export default INVENTORY;
