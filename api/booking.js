// Short public inquiry endpoint. Secrets are read only from Vercel environment variables.
const crypto=require('crypto');
const TOURS={t1:'Kyrgyzstan Highlights',t2:'The Nomad Experience',t3:'Alpine Lakes Adventure',t4:'Issyk-Kul & Song-Kul Discovery',t5:'Kel-Suu Expedition',t6:'Silk Road Heritage',t7:'The Southern Discovery',t8:'Kyrgyzstan Grand Adventure'};
const LANGS={en:'English',ru:'Russian',ky:'Kyrgyz',es:'Spanish'};
const clean=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,n):'';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const hits=new Map(),done=new Map();
function rate(ip){const now=Date.now(),a=(hits.get(ip)||[]).filter(x=>now-x<600000);a.push(now);hits.set(ip,a);if(hits.size>5000)hits.clear();return a.length<=5}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const out=(s,b)=>res.status(s).json(b);
 if(req.method!=='POST')return out(405,{ok:false,error:'method_not_allowed'});
 const b=req.body&&typeof req.body==='object'?req.body:{};
 if(b.website)return out(200,{ok:true,ref:'TH-0'});
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
 if(!rate(ip))return out(429,{ok:false,error:'rate_limited'});
 const v={name:clean(b.name,100),country:clean(b.country,60),phone:clean(b.phone,25),notes:clean(b.notes,1000),tour:clean(b.tour,10),lang:LANGS[b.lang]?b.lang:'en',key:clean(b.key,64)};
 const errors={};
 if(v.name.length<2)errors.name='required';if(v.country.length<2)errors.country='required';
 if(!/^\+?[0-9 ()-]{7,22}$/.test(v.phone))errors.phone='invalid';
 if(!TOURS[v.tour])errors.tour='invalid';if(!/^[\w-]{8,64}$/.test(v.key))errors.key='invalid';
 if(Object.keys(errors).length)return out(400,{ok:false,error:'validation',fields:errors});
 if(done.has(v.key))return out(200,{ok:true,ref:done.get(v.key)});
 const ref='TH-'+new Date().getUTCFullYear()+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
 let saved=false;const sb=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(sb&&service){try{
  const r=await fetch(sb+'/rest/v1/bookings?on_conflict=idempotency_key',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({name:v.name,country:v.country,phone:v.phone,tour:TOURS[v.tour],language:LANGS[v.lang],notes:v.notes,status:'new',telegram_ref:ref,idempotency_key:v.key})});
  if(!r.ok){console.error('supabase_insert_failed',r.status);return out(503,{ok:false,error:'storage_failed'})}saved=true;
 }catch(e){console.error('supabase_insert_error',e.name);return out(503,{ok:false,error:'storage_failed'})}}
 const token=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
 if(!token||!chat){if(saved){done.set(v.key,ref);return out(200,{ok:true,ref,saved:true,notified:false,warning:'telegram_not_configured'})}return out(503,{ok:false,error:'not_configured'})}
 const text=['<b>НОВАЯ ЗАЯВКА · TRAVEL HORIZON</b>','',`Номер: <code>${ref}</code>`,`Имя: ${esc(v.name)}`,`Страна: ${esc(v.country)}`,`Телефон: ${esc(v.phone)}`,`Тур: ${esc(TOURS[v.tour])}`,`Язык ответа: ${LANGS[v.lang]}`,v.notes?`Сообщение: ${esc(v.notes)}`:null,'','Источник: сайт Travel Horizon'].filter(Boolean).join('\n');
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),8000);
 try{const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},signal:ac.signal,body:JSON.stringify({chat_id:chat,text,parse_mode:'HTML',disable_web_page_preview:true})});const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.ok){console.error('telegram_delivery_failed',r.status,j.error_code);return out(502,{ok:false,error:'delivery_failed',saved})}
  done.set(v.key,ref);if(done.size>2000)done.clear();return out(200,{ok:true,ref,saved,notified:true});
 }catch(e){console.error('telegram_network_error',e.name);return out(504,{ok:false,error:'delivery_failed',saved})}finally{clearTimeout(timer)}
};