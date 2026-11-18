(()=>{const $=s=>document.querySelector(s);
    const AT={en:{ttl:'Travel Horizon — Admin',pw:'Password',in:'Sign in',out:'Sign out',save:'Save',up:'Upload photo (JPEG, PNG, WebP, up to 8 MB)',saved:'Saved. Visitors see it after reload.',bad:'Wrong password',blocked:'Too many attempts. Try again in {n} min.',nc:'ADMIN_PASSWORD is not set on the server.',err:'Error',hero:'Homepage intro',cards:'Destination cards',land:'The land',stats:'Statistics: visits / planner / contact clicks',img:'Photo: upload, or paste an https link',val:'Check these fields: '},
        ru:{ttl:'Travel Horizon — Админка',pw:'Пароль',in:'Войти',out:'Выйти',save:'Сохранить',up:'Загрузить фото (JPEG, PNG, WebP, до 8 МБ)',saved:'Сохранено. Посетители увидят после перезагрузки.',bad:'Неверный пароль',blocked:'Слишком много попыток. Повторите через {n} мин.',nc:'На сервере не задан ADMIN_PASSWORD.',err:'Ошибка',hero:'Вступление на главной',cards:'Карточки направлений',land:'Раздел «Земля»',stats:'Статистика: визиты / планировщик / клики «запросить»',img:'Фото: загрузите или вставьте https-ссылку',val:'Проверьте поля: '},
        ky:{ttl:'Travel Horizon — Админ',pw:'Сыр сөз',in:'Кирүү',out:'Чыгуу',save:'Сактоо',up:'Сүрөт жүктөө (JPEG, PNG, WebP, 8 МБ чейин)',saved:'Сакталды. Келгендер баракты жаңыртканда көрөт.',bad:'Сыр сөз туура эмес',blocked:'Аракет өтө көп. {n} мүнөттөн кийин кайталаңыз.',nc:'Серверде ADMIN_PASSWORD коюлган эмес.',err:'Ката',hero:'Башкы беттин киришүүсү',cards:'Багыт карточкалары',land:'«Жер» бөлүмү',stats:'Статистика: визиттер / пландоочу / суроо басуулары',img:'Сүрөт: жүктөңүз же https шилтеме коюңуз',val:'Талааларды текшериңиз: '}};
    let AL=localStorage.getItem('thla')||'en',CL='en',C={},DATA={};const t=k=>AT[AL][k]||AT.en[k];
    const api=(p,o={})=>fetch(p,{credentials:'same-origin',...o,headers:{'X-TH':'1',...(o.headers||{})}}).then(async r=>({s:r.status,j:await r.json().catch(()=>({}))}));
    const mrg=(a,b)=>Object.fromEntries(Object.keys(a).map(k=>[k,(b&&b[k])||a[k]]));
    const eff=l=>{const d=TX[l].content,o=C[l]||{};return{hero:mrg(d.hero,o.hero),journeys:d.journeys.map((j,i)=>mrg(j,o.journeys&&o.journeys[i])),land:mrg(d.land,o.land)}};
    const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function ui(){document.documentElement.lang=AL;$('#ttl').textContent=t('ttl');$('#lpw').textContent=t('pw');$('#in').textContent=t('in');$('#out').textContent=t('out');$('#save').textContent=t('save');
        $('#al').innerHTML=['en','ru','ky'].map(l=>`<button class="o" data-a="${l}" aria-pressed="${l===AL}">${l.toUpperCase()}</button>`).join('');
        $('#tabs').innerHTML=['en','ky','ru'].map(l=>`<button class="o" data-c="${l}" aria-pressed="${l===CL}">${l.toUpperCase()}</button>`).join('');}
    const fld=(path,label,val,type)=>{const big=/description|copy/i.test(path),id='f_'+path.replace(/\./g,'_');
        if(type==='img')return `<label for="${id}">${esc(label)} — ${esc(t('img'))}</label><input id="${id}" data-p="${path}" value="${esc(val)}"><div class="row"><input type="file" accept="image/jpeg,image/png,image/webp" data-u="${id}" aria-label="${esc(t('up'))}"></div>`;
        return `<label for="${id}">${esc(label)}</label>${big?`<textarea id="${id}" data-p="${path}">${esc(val)}</textarea>`:`<input id="${id}" data-p="${path}" value="${esc(val)}">`}`};
    function build(){const e=eff(CL),H=['eyebrow','titleLine','titleEmphasis','copyFirst','copySecond','image'],J=['label','duration','title','description','image','alt'],La=['titleLine','titleEmphasis','description','image','alt','caption'];
        $('#form').innerHTML=`<h2>${t('hero')}</h2>`+H.map(k=>fld('hero.'+k,k,e.hero[k],k==='image'&&'img')).join('')+`<h2>${t('cards')}</h2>`+e.journeys.map((j,i)=>`<div class="card"><b>#${i+1}</b>`+J.map(k=>fld(`journeys.${i}.${k}`,k,j[k],k==='image'&&'img')).join('')+'</div>').join('')+`<h2>${t('land')}</h2>`+La.map(k=>fld('land.'+k,k,e.land[k],k==='image'&&'img')).join('')}
    function collect(){const o={hero:{},journeys:[{},{},{}],land:{}};document.querySelectorAll('[data-p]').forEach(el=>{const p=el.dataset.p.split('.');if(p[0]==='journeys')o.journeys[+p[1]][p[2]]=el.value.trim();else o[p[0]][p[1]]=el.value.trim()});return o}
    async function load(){const s=await api('/api/stats');if(s.s!==200){$('#login').hidden=false;$('#ed').hidden=true;return}
        $('#login').hidden=true;$('#ed').hidden=false;const c=await fetch('/api/content').then(r=>r.json()).catch(()=>({}));C=c;
        const tot=Object.values(s.j).reduce((a,d)=>[a[0]+d.visit,a[1]+d.planner,a[2]+d.contact],[0,0,0]);$('#stats').textContent=`${t('stats')}: ${tot.join(' / ')}`;build()}
    document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
        if(b.dataset.a){AL=b.dataset.a;localStorage.setItem('thla',AL);ui();if(!$('#ed').hidden){build()}return}
        if(b.dataset.c){C[CL]=collect();CL=b.dataset.c;ui();build();return}
        if(b.id==='in'){const r=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('#pw').value})});
            if(r.s===200){$('#pw').value='';$('#lm').textContent='';load()}else $('#lm').textContent=r.j.error==='blocked'?t('blocked').replace('{n}',r.j.minutes):r.j.error==='not_configured'?t('nc'):t('bad');return}
        if(b.id==='out'){await api('/api/logout',{method:'POST'});location.reload();return}
        if(b.id==='save'){const r=await api('/api/content',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:CL,content:collect()})});
            const m=$('#sm');if(r.s===200){m.className='msg ok';m.textContent=t('saved');C[CL]=collect()}else{m.className='msg err';m.textContent=r.j.fields?t('val')+r.j.fields.join(', '):t('err')+' '+r.s}}});
    document.addEventListener('change',async e=>{const f=e.target;if(!f.dataset.u||!f.files[0])return;const m=$('#sm');
        const r=await api('/api/uploads',{method:'POST',headers:{'Content-Type':f.files[0].type},body:f.files[0]});
        if(r.s===200){$('#'+f.dataset.u).value=r.j.url;m.className='msg ok';m.textContent=r.j.url}else{m.className='msg err';m.textContent=r.s===415?'JPEG / PNG / WebP only':r.s===413?'> 8 MB':t('err')+' '+r.s}});
    ui();load();})();