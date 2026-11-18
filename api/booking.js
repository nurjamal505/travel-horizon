// Vercel Function: validate, persist (if configured), then notify Telegram.
const crypto = require('crypto');
const TOURS = {t1:'Kyrgyzstan Highlights',t2:'The Nomad Experience',t3:'Alpine Lakes Adventure',t4:'Issyk-Kul & Song-Kul Discovery',t5:'Kel-Suu Expedition',t6:'Silk Road Heritage',t7:'The Southern Discovery',t8:'Kyrgyzstan Grand Adventure'};
const LANGS = {en:'English',ru:'Russian',ky:'Kyrgyz',es:'Spanish'};
const BUDGETS = ['', '<500','500-1000','1000-1500','1500-2500','2500+'];
const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,n):'';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const hits=new Map(),done=new Map();
function rate(ip){const now=Date.now(),a=(hits.get(ip)||[]).filter(x=>now-x<600000);a.push(now);hits.set(ip,a);if(hits.size>5000)hits.clear();return a.length<=5;}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const out=(s,b)=>res.status(s).json(b);
 if(req.method!=='POST')return out(405,{ok:false,error:'method'});
 const b=req.body&&typeof req.body==='object'?req.body:{};
 if(b.website)return out(200,{ok:true,ref:'TH-0'});
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
 if(!rate(ip))return out(429,{ok:false,error:'rate_limited'});
 const v={name:clean(b.name,100),email:clean(b.email,120),phone:clean(b.phone,25),cc:clean(b.cc,5),country:clean(b.country,60),tour:clean(b.tour,10),date:clean(b.date,10),trav:Number(b.trav),notes:clean(b.notes,1000),lang:LANGS[b.lang]?b.lang:'en',budget:BUDGETS.includes(b.budget)?b.budget:'',key:clean(b.key,64)};
 const e={};
 if(v.name.length<2)e.name=1;
 if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email))e.email=1;
 if(v.phone&&!/^[0-9 ()-]{5,15}$/.test(v.phone))e.phone=1;
 if(!v.email&&!v.phone)e.contact=1;
 if(v.phone&&!/^\+\d{1,4}$/.test(v.cc))e.cc=1;
 if(v.country.length<2)e.country=1;
 if(!TOURS[v.tour])e.tour=1;
 const d=new Date(v.date+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||isNaN(d)||d<=new Date()||d>Date.now()+94608e6)e.date=1;
 if(!Number.isInteger(v.trav)||v.trav<1||v.trav>20)e.trav=1;
 if(b.consent!==true)e.consent=1;
 if(!/^[\w-]{8,64}$/.test(v.key))e.key=1;
 if(Object.keys(e).length)return out(400,{ok:false,error:'validation',fields:e});
 if(done.has(v.key))return out(200,{ok:true,ref:done.get(v.key),duplicate:true});
 const ref='TH-'+new Date().getUTCFullYear()+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
 let saved=false,notified=false;
 // Save first. A Telegram outage must not destroy a customer's inquiry.
 if(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY){
  try{
   const raw=String(process.env.SUPABASE_URL),base=raw.endsWith('/')?raw.slice(0,-1):raw;
   const sr=await fetch(base+'/rest/v1/bookings?on_conflict=idempotency_key',{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({name:v.name,country:v.country,email:v.email,phone:v.phone?(v.cc+' '+v.phone):null,tour:TOURS[v.tour],date:v.date,travelers:v.trav,budget:v.budget,language:LANGS[v.lang],notes:v.notes,status:'new',telegram_ref:ref,idempotency_key:v.key})});
   if(!sr.ok){console.error('supabase_insert_failed',sr.status);return out(503,{ok:false,error:'storage_failed'});}
   saved=true;
  }catch(err){console.error('supabase_insert_error',err.name);return out(503,{ok:false,error:'storage_failed'});}
 }
 const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chat){
  if(saved){done.set(v.key,ref);return out(200,{ok:true,ref,saved:true,notified:false,warning:'telegram_not_configured'});}
  return out(503,{ok:false,error:'not_configured'});
 }
 const message=['<b>NEW TRAVEL HORIZON INQUIRY</b>','',`Reference: <code>${ref}</code>`,'',`Name: ${esc(v.name)}`,`Country: ${esc(v.country)}`,v.phone?`Phone: ${esc(v.cc+' '+v.phone)}`:null,v.email?`Email: ${esc(v.email)}`:null,`Language: ${LANGS[v.lang]}`,'',`Tour: ${esc(TOURS[v.tour])}`,`Date: ${v.date}`,`Travelers: ${v.trav}`,v.budget?`Budget/person: $${esc(v.budget)}`:null,v.notes?`Notes: ${esc(v.notes)}`:null,'Source: Travel Horizon'].filter(Boolean).join('\n');
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),8000);
 try{
  const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},signal:ac.signal,body:JSON.stringify({chat_id:chat,text:message,parse_mode:'HTML',disable_web_page_preview:true})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok){console.error('telegram_delivery_failed',r.status,j.error_code);if(saved){done.set(v.key,ref);return out(502,{ok:false,error:'delivery_failed',saved:true});}return out(502,{ok:false,error:'delivery_failed',saved:false});}
  notified=true;done.set(v.key,ref);if(done.size>2000)done.clear();
  return out(200,{ok:true,ref,saved,notified});
 }catch(err){console.error('telegram_delivery_error',err.name);if(saved){done.set(v.key,ref);return out(504,{ok:false,error:'delivery_failed',saved:true});}return out(504,{ok:false,error:'delivery_failed',saved:false});}
 finally{clearTimeout(timer);}
};