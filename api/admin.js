// Protected admin API. Configure SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Vercel.
const base=()=>String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const anon=()=>process.env.SUPABASE_ANON_KEY;
const service=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;
async function request(path,options={}){const r=await fetch(base()+path,{...options,headers:{apikey:service(),Authorization:'Bearer '+service(),'Content-Type':'application/json',...(options.headers||{})}});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.message||body.error||'Supabase request failed');return body;}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');const out=(s,b)=>res.status(s).json(b);
 if(!base()||!anon()||!service())return out(503,{ok:false,error:'admin_not_configured'});
 if(req.method==='POST'&&req.query.action==='login'){
  const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string')return out(400,{ok:false});
  const r=await fetch(base()+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:anon(),'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const j=await r.json().catch(()=>({}));if(!r.ok)return out(401,{ok:false,error:'invalid_credentials'});
  return out(200,{ok:true,access_token:j.access_token,refresh_token:j.refresh_token,expires_in:j.expires_in,user:{email:j.user?.email}});
 }
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!token)return out(401,{ok:false,error:'unauthorized'});
 const ur=await fetch(base()+'/auth/v1/user',{headers:{apikey:anon(),Authorization:'Bearer '+token}});const user=await ur.json().catch(()=>({}));
 if(!ur.ok||!user.id)return out(401,{ok:false,error:'unauthorized'});
 try{
  const admins=await request('/rest/v1/admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id');
  if(!admins.length)return out(403,{ok:false,error:'not_admin'});
  if(req.method==='POST'&&req.query.action==='telegram-test'){
   const bot=process.env.TELEGRAM_BOT_TOKEN,chat=process.env.TELEGRAM_CHAT_ID;
   if(!bot||!chat)return out(503,{ok:false,error:'telegram_not_configured'});
   const tg=await fetch('https://api.telegram.org/bot'+bot+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:'Travel Horizon: test message. Telegram connection is working.'})});
   const tj=await tg.json().catch(()=>({}));
   if(!tg.ok||!tj.ok){console.error('telegram_test_failed',tg.status,tj.error_code);return out(502,{ok:false,error:'telegram_delivery_failed',telegram_code:tj.error_code||null});}
   return out(200,{ok:true});
  }
  if(req.method==='GET'&&req.query.action==='bookings'){
   const rows=await request('/rest/v1/bookings?select=*&order=created_at.desc&limit=200');return out(200,{ok:true,bookings:rows});
  }
  if(req.method==='GET'&&req.query.action==='stats'){
   const rows=await request('/rest/v1/bookings?select=id,status,created_at');return out(200,{ok:true,total:rows.length,new:rows.filter(x=>x.status==='new').length,confirmed:rows.filter(x=>x.status==='confirmed').length});
  }
  if(req.method==='PATCH'&&req.query.action==='booking'){
   const id=String(req.body?.id||'');const status=String(req.body?.status||'');if(!/^[0-9a-f-]{36}$/i.test(id)||!['new','contacted','confirmed','cancelled'].includes(status))return out(400,{ok:false,error:'invalid_input'});
   const rows=await request('/rest/v1/bookings?id=eq.'+id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status,updated_at:new Date().toISOString()})});return out(200,{ok:true,booking:rows[0]||null});
  }
  return out(404,{ok:false,error:'not_found'});
 }catch(e){console.error('admin_api_error',e.message);return out(500,{ok:false,error:'server_error'});}
};