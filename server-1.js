// ╔════════════════════════════════════════════════════════════════════╗
// ║  НАСТРОЙКИ — ВПИШИ СВОИ ДАННЫЕ ТОЛЬКО В ЭТИ ДВЕ СТРОКИ (в кавычки)  ║
// ╚════════════════════════════════════════════════════════════════════╝
const BOT_TOKEN   = "ВСТАВЬ_СЮДА_ТОКЕН_БОТА";   // 1) Токен бота от @BotFather. Выглядит так: 123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
const ADMIN_TG_ID = "ВСТАВЬ_СЮДА_СВОЙ_ID";      // 2) Твой Telegram ID — только цифры. Узнать: написать боту @userinfobot
// ──────────────────────────────────────────────────────────────────────
// Никому не показывай токен и не выкладывай этот файл с токеном в интернет.
//
// Как запустить:  node server.js   (нужен Node 18+, больше ничего ставить не надо)
// Рядом положи файл index.html (приложение). Адрес сервера (https) укажи в @BotFather как Web App.
// (Вместо правки файла можно задать BOT_TOKEN и ADMIN_TG_ID переменными окружения — они главнее.)
const http=require("http"),crypto=require("crypto"),fs=require("fs");
const TOKEN=process.env.BOT_TOKEN||BOT_TOKEN,ADMIN=String(process.env.ADMIN_TG_ID||ADMIN_TG_ID),PORT=process.env.PORT||3000,FILE="db.json";
if(!/^\d+:[\w-]{20,}$/.test(TOKEN)){console.error("\n❌ Токен бота не вставлен.\n   Открой server.js и впиши его в строку BOT_TOKEN (самый верх файла).\n   Токен выдаёт @BotFather, выглядит так: 123456789:AAH...\n");process.exit(1)}
if(!/^\d+$/.test(ADMIN)){console.error("\n❌ Не вписан твой Telegram ID.\n   Открой server.js и впиши его в строку ADMIN_TG_ID (только цифры).\n   Узнать ID можно у бота @userinfobot.\n");process.exit(1)}
const UNIQ=["7777777777","0000000000"];
let db={users:{},unique:{}};try{db=JSON.parse(fs.readFileSync(FILE))}catch{}
const save=()=>fs.writeFileSync(FILE,JSON.stringify(db));
const fresh=()=>({state:{bal:100000,nums:[],phones:[],hist:[]},rev:0});
const fmt=s=>"+7 "+s.slice(0,3)+" "+s.slice(3,6)+" "+s.slice(6,8)+" "+s.slice(8);
const user=id=>db.users[id]||(db.users[id]=fresh());
function auth(h){ // проверка подписи Telegram initData
  const p=new URLSearchParams(h||"");const hash=p.get("hash");p.delete("hash");
  const str=[...p.entries()].map(([k,v])=>k+"="+v).sort().join("\n");
  const key=crypto.createHmac("sha256","WebAppData").update(TOKEN).digest();
  if(crypto.createHmac("sha256",key).update(str).digest("hex")!==hash)return null;
  if(Date.now()/1000-Number(p.get("auth_date"))>86400)return null;
  try{return String(JSON.parse(p.get("user")).id)}catch{return null}}
function cleanNums(id,nums){ // уникальные номера остаются только у настоящего владельца
  return (nums||[]).filter(n=>{const d=String(n.num).replace(/\D/g,"").slice(1);return !UNIQ.includes(d)||db.unique[d]===id})}
http.createServer((req,res)=>{
  const send=(c,o)=>{res.writeHead(c,{"Content-Type":"application/json"});res.end(JSON.stringify(o))};
  if(req.method=="GET"&&!req.url.startsWith("/api/")){
    try{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(fs.readFileSync("index.html"))}catch{return send(404,{})}}
  let body="";req.on("data",c=>body+=c);req.on("end",()=>{
    const id=auth(req.headers["x-init-data"]);if(!id)return send(401,{});
    const b=body?JSON.parse(body):{},isAdmin=id===ADMIN,u=req.url;
    if(u=="/api/me")return send(200,{id,isAdmin});
    if(u=="/api/state"&&req.method=="GET"){const r=db.users[id];return send(200,r?{state:r.state,rev:r.rev}:{state:null,rev:0})}
    if(u=="/api/state"&&req.method=="PUT"){const r=user(id);if(b.rev!==r.rev)return send(409,{});
      b.state.nums=cleanNums(id,b.state.nums);r.state=b.state;r.rev++;save();return send(200,{rev:r.rev})}
    if(u=="/api/claim"){if(!UNIQ.includes(b.num))return send(400,{});
      if(db.unique[b.num]&&db.unique[b.num]!==id)return send(200,{ok:false});db.unique[b.num]=id;save();return send(200,{ok:true})}
    if(!isAdmin)return send(403,{}); // дальше только админ
    const to=String(b.to||id),t=user(to);
    if(u=="/api/admin/unique")return send(200,db.unique);
    if(u=="/api/admin/balance"){t.state.bal+=Number(b.amount)||0;t.rev++;save();return send(200,{ok:true})}
    if(u=="/api/admin/number"){const num=String(b.num);if(!/^\d{10}$/.test(num))return send(400,{});
      const uq=UNIQ.includes(num);if(uq&&db.unique[num]&&db.unique[num]!==to)return send(200,{ok:false});
      if(uq)db.unique[num]=to;
      t.state.nums.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),num:fmt(num),v:Number(b.value)||0,n:"🎁 Подарок",c:"#f59e0b",u:uq?1:0});
      t.rev++;save();return send(200,{ok:true})}
    send(404,{})});
}).listen(PORT,()=>console.log("http://localhost:"+PORT));
