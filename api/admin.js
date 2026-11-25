const crypto=require('crypto');
const {put,list}=require('@vercel/blob');
const secret=()=>String(process.env.ADMIN_SESSION_SECRET||'');
const pass=()=>String(process.env.ADMIN_PASSWORD||'');
const cookieName='th_admin';
const send=(res,status,body)=>res.status(status).json(body);
function bodyOf(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{}}return {}}
function cookie(res,value,maxAge){res.setHeader('Set-Cookie',cookieName+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+maxAge);}
function sign(exp){return crypto.createHmac('sha256',secret().trim()).update(String(exp)).digest('base64url')}
function isAdmin(req){if(!secret()||!pass())return false;const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';const [exp,sig]=raw.split('.');if(!exp||!sig||Number(exp)<Date.now())return false;const expected=sign(exp);return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}
function key(){return crypto.createHash('sha256').update(secret().trim()).digest()}
function encrypt(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv),data=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64')}
function decrypt(value){const b=Buffer.from(value,'base64'),iv=b.subarray(0,12),tag=b.subarray(12,28),data=b.subarray(28),d=crypto.createDecipheriv('aes-256-gcm',key(),iv);d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(data),d.final()]).toString('utf8'))}
async function readBookings(){const r=await list({prefix:'data/bookings/',limit:1000});const files=r.blobs||[];const rows=await Promise.all(files.map(async f=>{try{const x=await fetch(f.url,{cache:'no-store'});if(!x.ok)return null;return decrypt(Buffer.from(await x.arrayBuffer()).toString('utf8'))}catch(e){console.error('booking_blob_read_failed',f.pathname);return null}}));return rows.filter(Boolean).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 const action=String(req.query?.action||'');
 if(!secret().trim()||!pass().trim())return send(res,503,{ok:false,error:'admin_not_configured'});
 if(req.method==='POST'&&action==='login'){
  const input=bodyOf(req);const p=String(input.password||'').trim();const configured=pass().trim();const a=crypto.createHash('sha256').update(p).digest(),b=crypto.createHash('sha256').update(configured).digest();
  if(!crypto.timingSafeEqual(a,b)){await new Promise(r=>setTimeout(r,500));return send(res,401,{ok:false,error:'invalid_credentials'})}
  const exp=Date.now()+7*24*60*60*1000;cookie(res,exp+'.'+sign(exp),7*24*60*60);return send(res,200,{ok:true});
 }
 if(req.method==='POST'&&action==='logout'){cookie(res,'',0);return send(res,200,{ok:true})}
 if(!isAdmin(req))return send(res,401,{ok:false,error:'unauthorized'});
 try{
  if(req.method==='GET'&&action==='bookings'){const bookings=await readBookings();return send(res,200,{ok:true,bookings})}
  if(req.method==='GET'&&action==='stats'){const b=await readBookings();return send(res,200,{ok:true,total:b.length,new:b.filter(x=>x.status==='new').length,contacted:b.filter(x=>x.status==='contacted').length,confirmed:b.filter(x=>x.status==='confirmed').length})}
  if(req.method==='PATCH'&&action==='booking'){
   const id=String(req.body?.id||''),status=String(req.body?.status||'');if(!/^TH-\d{4}-[A-F0-9]{8}$/.test(id)||!['new','contacted','confirmed','cancelled'].includes(status))return send(res,400,{ok:false,error:'invalid_input'});
   const rows=await readBookings(),row=rows.find(x=>x.ref===id);if(!row)return send(res,404,{ok:false,error:'not_found'});row.status=status;row.updated_at=new Date().toISOString();
   await put('data/bookings/'+id+'.enc',encrypt(row),{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:'text/plain',cacheControlMaxAge:60});return send(res,200,{ok:true,booking:row});
  }
  if(req.method==='GET'&&action==='photos'){const r=await list({prefix:'photos/',limit:200});return send(res,200,{ok:true,photos:(r.blobs||[]).map(x=>({url:x.url,pathname:x.pathname,size:x.size,uploadedAt:x.uploadedAt}))})}
  if(req.method==='POST'&&action==='upload'){
   const name=String(req.body?.name||'photo').replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,90),type=String(req.body?.type||''),data=String(req.body?.data||'');
   if(!['image/jpeg','image/png','image/webp','image/avif'].includes(type))return send(res,400,{ok:false,error:'invalid_image_type'});
   if(!data||data.length>5_800_000)return send(res,413,{ok:false,error:'image_too_large'});
   const buffer=Buffer.from(data,'base64');if(buffer.length>4*1024*1024)return send(res,413,{ok:false,error:'image_too_large'});
   const ext=type==='image/jpeg'?'jpg':type.split('/')[1],blob=await put('photos/'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'-'+name.replace(/\.[^.]+$/,'')+'.'+ext,buffer,{access:'public',addRandomSuffix:false,contentType:type,cacheControlMaxAge:86400});
   return send(res,200,{ok:true,url:blob.url,pathname:blob.pathname});
  }
  if(req.method==='POST'&&action==='telegram-test'){
   const token=String(process.env.TELEGRAM_BOT_TOKEN||''),chat=String(process.env.TELEGRAM_CHAT_ID||'');if(!token||!chat)return send(res,503,{ok:false,error:'telegram_not_configured'});
   const r=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:'Travel Horizon: тестовая проверка Telegram. Бот подключён.'})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)return send(res,502,{ok:false,error:'telegram_delivery_failed',telegram_code:j.error_code||null});return send(res,200,{ok:true});
  }
  return send(res,404,{ok:false,error:'not_found'});
 }catch(e){console.error('admin_api_error',e.message);return send(res,500,{ok:false,error:'server_error'})}
};