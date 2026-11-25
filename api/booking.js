// Public short-inquiry endpoint. Telegram is sent independently of optional database persistence.
const crypto=require('crypto');
const TOURS={t1:'Kyrgyzstan Highlights',t2:'The Nomad Experience',t3:'Alpine Lakes Adventure',t4:'Issyk-Kul & Song-Kul Discovery',t5:'Kel-Suu Expedition',t6:'Silk Road Heritage',t7:'The Southern Discovery',t8:'Kyrgyzstan Grand Adventure'};
const LANGS={en:'English',ru:'Russian',ky:'Kyrgyz',es:'Spanish'};
const clean=(v,n)=>typeof v==='string'?v.replace(/[\\u0000-\\u001f\\u007f]+/g,' ').trim().slice(0,n):'';
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const hits=new Map(),done=new Map();
function rate(ip){const now=Date.now(),a=(hits.get(ip)||[]).filter(x=>now-x<600000);a.push(now);hits.set(ip,a);if(hits.size>5000)hits.clear();return a.length<=8}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const out=(status,body)=>res.status(status).json(body);
 if(req.method!=='POST')return out(405,{ok:false,error:'method_not_allowed'});
 const b=req.body&&typeof req.body==='object'?req.body:{};if(b.website)return out(200,{ok:true,ref:'TH-0'});
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';if(!rate(ip))return out(429,{ok:false,error:'rate_limited'});
 const v={name:clean(b.name,100),country:clean(b.country,60),phone:clean(b.phone,25),notes:clean(b.notes,1000),tour:clean(b.tour,10),lang:LANGS[b.lang]?b.lang:'en',key:clean(b.key,64)};
 const errors={};if(v.name.length<2)errors.name='required';if(v.country.length<2)errors.country='required';if(!/^\\+?[0-9 ()-]{7,22}$/.test(v.phone))errors.phone='invalid';if(!TOURS[v.tour])errors.tour='invalid';if(!/^[\\w-]{8,64}$/.test(v.key))errors.key='invalid';
 if(Object.keys(errors).length)return out(400,{ok:false,error:'validation',fields:errors});if(done.has(v.key))return out(200,{ok:true,ref:done.get(v.key),notified:true});
 const token=String(process.env.TELEGRAM_BOT_TOKEN||'').trim(),chat=String(process.env.TELEGRAM_CHAT_ID||'').trim();
 if(!token||!chat)return out(503,{ok:false,error:'telegram_not_configured',detail:'Set non-empty TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel, then redeploy.'});
 const ref='TH-'+new Date().getUTCFullYear()+'-'+crypto.randomBytes(4).toString('hex').toUpperCase();
 const message=['<b>НОВАЯ ЗАЯВКА · TRAVEL HORIZON</b>','', 'Номер: <code>'+ref+'</code>','Имя: '+esc(v.name),'Страна: '+esc(v.country),'Телефон: '+esc(v.phone),'Тур: '+esc(TOURS[v.tour]),'Язык ответа: '+LANGS[v.lang],v.notes?'Сообщение: '+esc(v.notes):null,'','Источник: сайт Travel Horizon'].filter(Boolean).join('\\n');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{const response=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({chat_id:chat,text:message,parse_mode:'HTML',disable_web_page_preview:true})});const tg=await response.json().catch(()=>({}));
  if(!response.ok||!tg.ok){const description=clean(tg.description||'',220);console.error('telegram_send_failed',{http:response.status,code:tg.error_code,description});const detail=tg.error_code===401?'Bot token is invalid. Copy a fresh token from @BotFather.':tg.error_code===400?'Telegram rejected the chat. Open the bot and press Start; verify TELEGRAM_CHAT_ID.':description||'Telegram API rejected the request.';return out(502,{ok:false,error:'telegram_delivery_failed',detail,telegram_code:tg.error_code||null})}
 }catch(error){console.error('telegram_network_error',error.name);return out(504,{ok:false,error:'telegram_network_error',detail:'Could not reach Telegram. Retry shortly.'})}finally{clearTimeout(timer)}
 done.set(v.key,ref);if(done.size>3000)done.clear();
 let saved=false,warning=null;const sb=String(process.env.SUPABASE_URL||'').trim().replace(/\\/+$/,'');const service=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 if(sb&&service){try{const response=await fetch(sb+'/rest/v1/bookings?on_conflict=idempotency_key',{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({name:v.name,country:v.country,phone:v.phone,tour:TOURS[v.tour],language:LANGS[v.lang],notes:v.notes,status:'new',telegram_ref:ref,idempotency_key:v.key})});if(response.ok)saved=true;else{warning='telegram_sent_database_save_failed';console.error('supabase_insert_failed',response.status,(await response.text()).slice(0,300))}}catch(error){warning='telegram_sent_database_unreachable';console.error('supabase_insert_error',error.name)}}else warning='supabase_not_configured';
 return out(200,{ok:true,ref,notified:true,saved,warning});
};