
import express from "express";
import { EQUIPMENT, CATEGORY_ITEMS } from "./inventory.js";
import { money, total } from "./pricing.js";
import { isPriceQuestion } from "./intent.js";

const app = express();
app.use(express.json());

const CONTACT = "Call 850-295-5373 or book online at www.bigbendrentals.net";

const state = {};

function getState(id){
  if(!state[id]) state[id]={};
  return state[id];
}

function formatOptions(ids){
  return ids.map(id=>{
    const i=EQUIPMENT[id];
    return `• ${i.name} — $${i.day}/day`;
  }).join("\n");
}

function handleMessage(msg, sender){
  const s = getState(sender);
  const t = msg.toLowerCase();

  if(t.includes("mulcher")){
    s.mulcher=true;
    return `We have these mulcher options:

${formatOptions(CATEGORY_ITEMS.mulcher)}

Do you want attachment only or combo?`;
  }

  if(s.mulcher && t.includes("combo")){
    s.combo=true;
    return `Which combo?

• CAT
• John Deere`;
  }

  if(s.combo && t.includes("cat")){
    const m = EQUIPMENT["cat-hm316-mulcher"];
    const skid = EQUIPMENT["cat-265"];
    const res = total({day:m.day+skid.day, protection:true},1);
    return `CAT Combo:

Rental: ${money(res.rental)}
Protection: ${money(res.protection)}
Tax: ${money(res.tax)}
Total: ${money(res.total)}

${CONTACT}`;
  }

  if(s.combo && t.includes("john")){
    const m = EQUIPMENT["jd-mh60d-mulcher"];
    const skid = EQUIPMENT["jd-333p"];
    const res = total({day:m.day+skid.day, protection:true},1);
    return `John Deere Combo:

Rental: ${money(res.rental)}
Protection: ${money(res.protection)}
Tax: ${money(res.tax)}
Total: ${money(res.total)}

${CONTACT}`;
  }

  return "Ask about mulchers.";
}

app.post("/webhook",(req,res)=>{
  const msg = req.body.message||"";
  const sender="test";
  const reply = handleMessage(msg,sender);
  console.log(reply);
  res.json({reply});
});

app.listen(10000,()=>console.log("running"));
