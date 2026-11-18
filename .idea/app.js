(()=>{const $=s=>document.querySelector(s);let L=null;try{L=localStorage.getItem('thl')}catch(e){}
    const qp=new URLSearchParams(location.search).get('lang');if(TX[qp])L=qp;if(!TX[L])L='en';
    let C={},sel={d:'3',m:'lakes'},shown=false,KEY=uid();
    function uid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
    const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const okImg=u=>/^(\/uploads\/[a-f0-9]{16}\.(jpg|png|webp)|https:\/\/[^\s"'<>]+)$/.test(u||'');
    const H={'Content-Type':'application/json','X-TH':'1'};
    const ev=t=>fetch('/api/event',{method:'POST',headers:H,body:JSON.stringify({type:t})}).catch(()=>{});
    const t=k=>TX[L][k];
    const mrg=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,(b&&b[k])||a[k]]));
    function eff(){const d=TX[L].content,o=C[L]||{};return{hero:mrg(d.hero,o.hero),journeys:d.journeys.map((j,i)=>mrg(j,o.journeys&&o.journeys[i])),land:mrg(d.land,o.land)}}
    const img=(u,a)=>okImg(u)?`<img src="${esc(u)}" alt="${esc(a)}" loading="lazy" referrerpolicy="no-referrer">`:'';
    function fixImgs(){document.querySelectorAll('.ph img').forEach(i=>i.addEventListener('error',()=>i.remove(),{once:true}))}
    function render(){document.documentElement.lang=L;const e=eff();
        [0,1,2,3].forEach(i=>$('#n'+i).textContent=t('nav')[i]);$('#plan').textContent=$('#plan2').textContent=t('plan');
        $('#h-eb').textContent=e.hero.eyebrow;$('#h-t').innerHTML=`${esc(e.hero.titleLine)} <em>${esc(e.hero.titleEmphasis)}</em>`;$('#h-c1').textContent=e.hero.copyFirst;$('#h-c2').textContent=e.hero.copySecond;
        $('#hero').style.backgroundImage=okImg(e.hero.image)?`url("${e.hero.image}")`:'';
        ['feelT','jT','pT','pS','dur','mood','show','foot'].forEach(k=>$('#'+k).textContent=t(k==='foot'?'foot':k));$('#feel').textContent=t('feel');$('#quote-t').textContent=t('quote');
        $('#cards').innerHTML=e.journeys.map(j=>`<article class="card"><div class="ph">${img(j.image,j.alt)}</div><div class="cb"><small>${esc(j.label)} · ${esc(j.duration)}</small><h3>${esc(j.title)}</h3><p>${esc(j.description)}</p></div></article>`).join('');
        $('#l-t').innerHTML=`${esc(e.land.titleLine)} <em>${esc(e.land.titleEmphasis)}</em>`;$('#l-d').textContent=e.land.description;
        $('#l-f').innerHTML=`<div class="ph">${img(e.land.image,e.land.alt)}</div><figcaption>${esc(e.land.caption)}</figcaption>`;fixImgs();
        const grp=(id,name,items)=>{$(id).innerHTML=items.map(([v,l])=>`<label class="opt"><input type="radio" name="${name}" value="${v}"${sel[name]===v?' checked':''}><span>${esc(l)}</span></label>`).join('')};
        grp('#gd','d',[['3',t('d3')],['5',t('d5')],['7',t('d7')]]);grp('#gm','m',[['lakes',t('m1')],['trails',t('m2')],['culture',t('m3')]]);
        document.querySelectorAll('.lg button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===L));
        if(shown)result()}
    function result(){shown=true;const i=['lakes','trails','culture'].indexOf(sel.m)*3+['3','5','7'].indexOf(sel.d),r=t('res')?TX[L].res[i]:null;
        $('#res').innerHTML=`<div class="res"><h3>${esc(r[0])}</h3><p>${esc(r[1])}</p><p class="mt">${esc(t('note'))}</p><button class="btn" id="rq" style="background:var(--g);color:#fff">${esc(t('req'))}</button><form class="fm" id="fm" hidden novalidate><input name="name" placeholder="${esc(t('nm'))}" aria-label="${esc(t('nm'))}" autocomplete="name"><input name="contact" placeholder="${esc(t('ct'))}" aria-label="${esc(t('ct'))}" autocomplete="email"><input name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" id="sb" style="background:var(--g);color:#fff">${esc(t('send'))}</button><div class="msg" id="mg" role="status"></div></form></div>`;
        $('#rq').onclick=()=>{$('#fm').hidden=false;$('#rq').hidden=true;ev('contact')};
        $('#fm').onsubmit=async e=>{e.preventDefault();const f=e.target,mg=$('#mg'),name=f.name.value.trim(),ct=f.contact.value.trim();
            if(name.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ct)||/^\+?[0-9 ()\-]{7,20}$/.test(ct))){mg.textContent=t('ve');return}
            const sb=$('#sb');sb.disabled=true;sb.textContent=t('sending');
            try{const x=await fetch('/api/request',{method:'POST',headers:H,body:JSON.stringify({name,contact:ct,duration:sel.d,mood:sel.m,lang:L,idea:r[0],key:KEY,website:f.website.value})}),j=await x.json().catch(()=>({}));
                if(x.ok&&j.ok){mg.textContent=`${t('ok')} ${j.ref}`;f.reset();sb.hidden=true;KEY=uid()}else{mg.textContent=j.error==='not_configured'?t('nc'):t('err');sb.disabled=false;sb.textContent=t('send')}}
            catch(err){mg.textContent=t('err');sb.disabled=false;sb.textContent=t('send')}}}
    document.addEventListener('change',e=>{if(e.target.name==='d'||e.target.name==='m'){sel[e.target.name]=e.target.value;if(shown)result()}});
    $('#show').onclick=()=>{result();ev('planner');$('#res').scrollIntoView({block:'nearest'})};
    document.querySelector('.lg').addEventListener('click',e=>{const l=e.target.dataset&&e.target.dataset.l;if(l&&TX[l]){L=l;try{localStorage.setItem('thl',l)}catch(x){}render()}});
    render();ev('visit');
    fetch('/api/content').then(r=>r.json()).then(c=>{C=c||{};render()}).catch(()=>{});
})();