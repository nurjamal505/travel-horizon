'use strict';
// Travel Horizon: Node.js http server, no dependencies. Node 18+.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,DATA=process.env.DATA_DIR||path.join(ROOT,'data'),UP=path.join(DATA,'uploads');
const HOST=process.env.HOST||'127.0.0.1',PORT=+process.env.PORT||4173,PASS=process.env.ADMIN_PASSWORD||'';
const TOKEN=process.env.TELEGRAM_BOT_TOKEN,CHAT=process.env.TELEGRAM_CHAT_ID,TG=process.env.TELEGRAM_API||'https://api.telegram.org';
const SECURE=process.env.COOKIE_SECURE==='1',PROXY=process.env.TRUST_PROXY==='1';
fs.mkdirSync(UP,{recursive:true});
const FC=path.join(DATA,'content.json'),FST=path.join(DATA,'stats.json'),FRQ=path.join(DATA,'requests.jsonl');
const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const wr=(f,o)=>{const t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(o,null,1));fs.renameSync(t,f)};
const sess=new Map(),fails=new Map(),hits=new Map(),done=new Map();
const ipOf=q=>PROXY?(String(q.headers['x-forwarded-for']||'').split(',')[0].trim()||q.socket.remoteAddress):q.socket.remoteAddress;
const J=(r,c,o,h={})=>{r.writeHead(c,{'Content-Type':'application/json','Cache-Control':'no-store',...h});r.end(JSON.stringify(o))};
const body=(q,max)=>new Promise((ok,no)=>{let n=0,big=false;const a=[];q.on('data',d=>{n+=d.length;if(n>max)big=true;else a.push(d)});q.on('end',()=>big?no(Object.assign(new Error('big'),{code:413})):ok(Buffer.concat(a)));q.on('error',no)});
const jbody=async q=>{const b=await body(q,200000);try{return JSON.parse(b.toString()||'{}')}catch(e){return {}}};
const authed=q=>{const m=/(?:^|; )sid=([a-f0-9]{48})/.exec(q.headers.cookie||'');const e=m&&sess.get(m[1]);return !!e&&e>Date.now()};
const same=(a,b)=>crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(),crypto.createHash('sha256').update(b).digest());
const S=(v,n)=>typeof v==='string'&&v.length<=n;
const IMG=v=>v===''||/^\/uploads\/[a-f0-9]{16}\.(jpg|png|webp)$/.test(v)||/^https:\/\/[^\s"'<>]{1,500}$/.test(v);
const HK=['eyebrow','titleLine','titleEmphasis','copyFirst','copySecond','image'],JK=['label','duration','title','description','image','alt'],LK=['titleLine','titleEmphasis','description','image','alt','caption'];
function check(c){const e=[],h=c.hero||{},l=c.land||{};
    HK.forEach(k=>{if(k==='image'?!(S(h[k],600)&&IMG(h[k])):!S(h[k],600))e.push('hero.'+k)});
    if(!Array.isArray(c.journeys)||c.journeys.length!==3)e.push('journeys');
    else c.journeys.forEach((j,i)=>JK.forEach(k=>{if(k==='image'?!(S(j&&j[k],600)&&IMG(j[k])):!S(j&&j[k],600))e.push(`journeys.${i}.${k}`)}));
    LK.forEach(k=>{if(k==='image'?!(S(l[k],600)&&IMG(l[k])):!S(l[k],800))e.push('land.'+k)});return e}
const pick=(o,ks)=>Object.fromEntries(ks.map(k=>[k,o[k]]));
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json','.txt':'text/plain'};
function stat(q,r,p){let dir,rel;
    if(p.startsWith('/uploads/')){dir=UP;rel=p.slice(9);if(!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(rel)){r.writeHead(404);return r.end()}}
    else if(p==='/admin'||p==='/admin/'){dir=path.join(ROOT,'admin');rel='index.html'}
    else if(p.startsWith('/admin/')){dir=path.join(ROOT,'admin');rel=p.slice(7)}
    else{dir=path.join(ROOT,'public');rel=p==='/'?'index.html':p.slice(1)}
    let f;try{f=path.join(dir,decodeURIComponent(rel))}catch(e){r.writeHead(400);return r.end()}
    if(!f.startsWith(dir+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){r.writeHead(404);return r.end('Not found')}
    r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':dir===UP?'public, max-age=31536000, immutable':'no-cache'});fs.createReadStream(f).pipe(r)}
async function request(q,r,a){const b=await jbody(q);if(b.website)return J(r,200,{ok:true,ref:'TH-0'});
    const now=Date.now(),h=(hits.get(a)||[]).filter(t=>now-t<6e5);h.push(now);hits.set(a,h);if(hits.size>5000)hits.clear();if(h.length>5)return J(r,429,{ok:false,error:'rate'});
    const c=(v,n)=>typeof v==='string'?v.replace(/[\u0000-\u001f]+/g,' ').trim().slice(0,n):'';
    const v={name:c(b.name,100),contact:c(b.contact,120),duration:String(b.duration),mood:String(b.mood),lang:String(b.lang),idea:c(b.idea,200),key:c(b.key,64)},e={};
    if(v.name.length<2)e.name=1;if(!(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.contact)||/^\+?[0-9 ()\-]{7,20}$/.test(v.contact)))e.contact=1;
    if(!['3','5','7'].includes(v.duration))e.duration=1;if(!['lakes','trails','culture'].includes(v.mood))e.mood=1;if(!['en','ky','ru'].includes(v.lang))v.lang='en';if(!/^[\w-]{8,64}$/.test(v.key))e.key=1;
    if(Object.keys(e).length)return J(r,400,{ok:false,error:'validation',fields:e});
    if(done.has(v.key))return J(r,200,{ok:true,ref:done.get(v.key)});
    if(!TOKEN||!CHAT)return J(r,503,{ok:false,error:'not_configured'});
    const ref='TH-'+new Date().getUTCFullYear()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    const E=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const text=['<b>NEW TRAVEL HORIZON REQUEST</b>','',`Reference: <code>${ref}</code>`,`Name: ${E(v.name)}`,`Contact: ${E(v.contact)}`,`Language: ${v.lang.toUpperCase()}`,`Planner: ${v.duration==='7'?'7+':v.duration} days, ${v.mood}`,`Idea shown: ${E(v.idea)}`,'','Source: Travel Horizon website'].join('\n');
    const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),8000);let ok=false;
    try{const x=await fetch(`${TG}/bot${TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},signal:ac.signal,body:JSON.stringify({chat_id:CHAT,text,parse_mode:'HTML',disable_web_page_preview:true})});const j=await x.json().catch(()=>({}));ok=x.ok&&j.ok===true;if(!ok)console.error('telegram rejected',x.status,j.error_code)}catch(err){console.error('telegram error',err.name)}finally{clearTimeout(tm)}
    try{fs.appendFileSync(FRQ,JSON.stringify({ref,at:new Date().toISOString(),status:ok?'sent':'failed',name:v.name,contact:v.contact,lang:v.lang,duration:v.duration,mood:v.mood})+'\n')}catch(e){}
    if(!ok)return J(r,502,{ok:false,error:'delivery_failed'});done.set(v.key,ref);if(done.size>2000)done.clear();J(r,200,{ok:true,ref})}
async function api(q,r,p){const m=q.method,a=ipOf(q);
    if(m==='GET'&&p==='/api/content')return J(r,200,rd(FC,{}));
    if(m!=='GET'&&q.headers['x-th']!=='1')return J(r,403,{ok:false,error:'csrf'});
    if(m==='POST'&&p==='/api/request')return request(q,r,a);
    if(m==='POST'&&p==='/api/event'){const b=await jbody(q);if(!['visit','planner','contact'].includes(b.type))return J(r,400,{ok:false});const s=rd(FST,{}),d=new Date().toISOString().slice(0,10);s[d]=s[d]||{visit:0,planner:0,contact:0};s[d][b.type]++;wr(FST,s);return J(r,200,{ok:true})}
    if(m==='POST'&&p==='/api/login'){const f=fails.get(a)||{n:0,until:0};
        if(f.until>Date.now())return J(r,429,{ok:false,error:'blocked',minutes:Math.ceil((f.until-Date.now())/6e4)});
        const b=await jbody(q);if(!PASS)return J(r,503,{ok:false,error:'not_configured'});
        if(typeof b.password==='string'&&same(b.password,PASS)){fails.delete(a);const t=crypto.randomBytes(24).toString('hex');sess.set(t,Date.now()+12*36e5);return J(r,200,{ok:true},{'Set-Cookie':`sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${SECURE?'; Secure':''}`})}
        f.n++;if(f.n>=5){f.until=Date.now()+15*6e4;f.n=0}fails.set(a,f);return J(r,401,{ok:false,error:'bad'})}
    if(m==='POST'&&p==='/api/logout'){const k=/(?:^|; )sid=([a-f0-9]{48})/.exec(q.headers.cookie||'');if(k)sess.delete(k[1]);return J(r,200,{ok:true},{'Set-Cookie':'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
    if(!authed(q))return J(r,401,{ok:false,error:'auth'});
    if(m==='GET'&&p==='/api/stats')return J(r,200,rd(FST,{}));
    if(m==='PUT'&&p==='/api/content'){const b=await jbody(q),c=b.content||{};if(!['en','ru','ky'].includes(b.lang))return J(r,400,{ok:false,error:'lang'});
        const e=check(c);if(e.length)return J(r,400,{ok:false,error:'validation',fields:e});
        const all=rd(FC,{});all[b.lang]={hero:pick(c.hero,HK),journeys:c.journeys.map(j=>pick(j,JK)),land:pick(c.land,LK)};wr(FC,all);return J(r,200,{ok:true})}
    if(m==='POST'&&p==='/api/uploads'){const buf=await body(q,8*1024*1024),t=q.headers['content-type'];let ext=null;
        if(t==='image/jpeg'&&buf[0]===0xFF&&buf[1]===0xD8)ext='jpg';
        else if(t==='image/png'&&buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';
        else if(t==='image/webp'&&buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP')ext='webp';
        if(!ext)return J(r,415,{ok:false,error:'type'});const name=crypto.randomBytes(8).toString('hex')+'.'+ext;fs.writeFileSync(path.join(UP,name),buf);return J(r,200,{ok:true,url:'/uploads/'+name})}
    return J(r,404,{ok:false})}
http.createServer(async(q,r)=>{try{
    r.setHeader('X-Content-Type-Options','nosniff');r.setHeader('Referrer-Policy','same-origin');r.setHeader('X-Frame-Options','DENY');
    r.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-ancestors 'none'");
    const p=new URL(q.url,'http://x').pathname;if(p.startsWith('/api/'))return await api(q,r,p);return stat(q,r,p)
}catch(e){if(!r.headersSent)J(r,e.code===413?413:500,{ok:false,error:e.code===413?'too_large':'server'})}}).listen(PORT,HOST,()=>{
    console.log(`Travel Horizon on http://${HOST}:${PORT}`);if(!PASS)console.warn('WARNING: ADMIN_PASSWORD is not set: admin login is disabled');if(!TOKEN||!CHAT)console.warn('WARNING: Telegram is not configured: requests will be rejected')});