// POST /api/booking — validates an inquiry and sends it to Telegram. Secrets stay server-side.
const crypto = require('crypto');
// Keep in sync with the TR array in public/index.html (ids only are trusted).
const TOURS = { t1:'Kyrgyzstan Highlights', t2:'The Nomad Experience', t3:'Alpine Lakes Adventure', t4:'Issyk-Kul & Song-Kul Discovery', t5:'Kel-Suu Expedition', t6:'Silk Road Heritage', t7:'The Southern Discovery', t8:'Kyrgyzstan Grand Adventure' };
const LANGS = { en:'English', ru:'Russian', ky:'Kyrgyz', es:'Spanish', it:'Italian', zh:'Chinese', ja:'Japanese', fr:'French' };
const BUDGETS = ['', '<500', '500-1000', '1000-1500', '1500-2500', '2500+'];
// Best-effort memory (per serverless instance). For strict limits use Upstash/Vercel KV.
const hits = new Map(), done = new Map();
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clean = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0, n) : '');

function limited(ip) {
  const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 600000);
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > 5;
}
function validate(b) {
  const e = {}, v = {};
  v.name = clean(b.name, 100); if (v.name.length < 2) e.name = 'name';
  v.email = clean(b.email, 120); v.phone = clean(b.phone, 25);
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = 'email';
  if (v.phone && !/^[0-9 ()\-]{5,15}$/.test(v.phone)) e.phone = 'phone';
  if (!v.email && !v.phone) e.contact = 'contact';
  v.cc = clean(b.cc, 5); if (v.phone && !/^\+\d{1,4}$/.test(v.cc)) e.cc = 'cc';
  v.country = clean(b.country, 60); if (v.country.length < 2) e.country = 'country';
  v.budget = BUDGETS.includes(b.budget) ? b.budget : '';
  if (b.consent !== true) e.consent = 'consent';
  v.tour = clean(b.tour, 10); if (!TOURS[v.tour]) e.tour = 'tour';
  v.date = clean(b.date, 10); const d = new Date(v.date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || isNaN(d) || d <= new Date() || d > new Date(Date.now() + 94608e6)) e.date = 'date';
  v.trav = Number(b.trav); if (!Number.isInteger(v.trav) || v.trav < 1 || v.trav > 20) e.trav = 'trav';
  v.notes = clean(b.notes, 1000);
  v.lang = LANGS[b.lang] ? b.lang : 'en';
  v.key = clean(b.key, 64); if (!/^[\w-]{8,64}$/.test(v.key)) e.key = 'key';
  return { e, v };
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const out = (c, o) => res.status(c).json(o);
  if (req.method !== 'POST') return out(405, { ok:false, error:'method' });
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return out(503, { ok:false, error:'not_configured' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (b.website) return out(200, { ok:true, ref:'TH-0' });          // honeypot: silently drop bots
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return out(429, { ok:false, error:'rate_limited' });
  const { e, v } = validate(b);
  if (Object.keys(e).length) return out(400, { ok:false, error:'validation', fields:e });
  if (done.has(v.key)) return out(200, { ok:true, ref:done.get(v.key) }); // duplicate submit
  const ref = `TH-${new Date().getUTCFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const text = [
    '<b>NEW TRAVEL HORIZON INQUIRY</b>', '', `Reference: <code>${ref}</code>`, '',
    `Name: ${esc(v.name)}`, `Country of residence: ${esc(v.country)}`, v.phone ? `Phone: ${esc(v.cc + ' ' + v.phone)}` : null, v.email ? `Email: ${esc(v.email)}` : null,
    `Language: ${LANGS[v.lang]}`, '', `Tour: ${esc(TOURS[v.tour])}`, `Preferred date: ${v.date}`,
    `Travelers: ${v.trav}`, v.budget ? `Budget per person: $${esc(v.budget)}` : null, '', v.notes ? `Message:\n${esc(v.notes)}` : null, v.notes ? '' : null, 'Source: Travel Horizon website'
  ].filter(x => x !== null).join('\n');
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:'POST', headers:{ 'Content-Type':'application/json' }, signal:ac.signal,
      body: JSON.stringify({ chat_id: chat, text, parse_mode:'HTML', disable_web_page_preview:true })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { console.error('telegram_rejected', r.status, j.error_code); return out(502, { ok:false, error:'delivery_failed' }); }
    done.set(v.key, ref); if (done.size > 2000) done.clear();
    return out(200, { ok:true, ref });
  } catch (err) {
    console.error('telegram_error', err.name);
    return out(504, { ok:false, error:'delivery_failed' });
  } finally { clearTimeout(timer); }
};
