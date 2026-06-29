function applyLang(l){
  L=l; document.documentElement.lang=l;
  document.querySelectorAll('[data-en]').forEach(el=>{const v=el.getAttribute('data-'+l); if(v!==null) el.innerHTML=v;});
  document.querySelectorAll('#lang button').forEach(b=>b.classList.toggle('on', b.dataset.set===l));
  renderRegions(); renderGeo(activeCountry); renderCatFilters(); renderOriFilters(); renderCatalog();
}

/* ADV */
function renderAdv(){
  const g=document.getElementById('advGrid'); g.innerHTML='';
  ADV.forEach(a=>{const d=document.createElement('div');d.className='adv';
    d.innerHTML='<div class="n">'+a.n+'</div><h3>'+a[L][0]+'</h3><p>'+a[L][1]+'</p>';g.appendChild(d);});
}

/* GEOGRAPHY */
function renderRegions(){
  const wrap=document.getElementById('regions'); wrap.innerHTML='';
  REGIONS.forEach((r,i)=>{
    const sec=document.createElement('div'); sec.className='region';
    const head=document.createElement('div'); head.className='rh';
    head.innerHTML='<span class="rn serif">0'+(i+1)+'</span><span class="rt">'+r[L]+'</span><span class="rc">'+r.cs.length+' '+(L==='ru'?'стран':'countries')+'</span>';
    sec.appendChild(head);
    const cc=document.createElement('div'); cc.className='countries';
    r.cs.forEach(code=>{
      const b=document.createElement('button'); b.className='cbtn'+(code===activeCountry?' active':'');
      b.textContent=C[code][L]; b.onclick=()=>{activeCountry=code; renderRegions(); renderGeo(code);};
      cc.appendChild(b);
    });
    sec.appendChild(cc); wrap.appendChild(sec);
  });
}
function renderGeo(code){
  activeCountry=code; const c=C[code];
  document.getElementById('geoDetail').innerHTML=
    '<div class="dh">'+(L==='ru'?'Везём из страны':'Sourced from')+'</div>'+
    '<div class="dn serif">'+c[L]+'</div>'+
    '<div class="dp">'+(L==='ru'?c.pru:c.pen)+'</div>'+
    '<button class="geo-go" id="geoGoBtn">'+(L==='ru'?'Перейти к ассортименту →':'View the range →')+'</button>';
  const b=document.getElementById('geoGoBtn'); if(b) b.onclick=()=>gotoCountryProducts(code);
  if(window.__globe) window.__globe.focus(code);
}
function selectCountry(code){activeCountry=code; renderRegions(); renderGeo(code);}

function initGlobe(){
  const cv=document.getElementById('geoGlobe'); if(!cv||!window.d3||!window.topojson) return;
  const ctx=cv.getContext&&cv.getContext('2d'); if(!ctx) return;
  const ISO2CODE={}; for(const k in SRC) ISO2CODE[SRC[k]]=k;
  const feats=topojson.feature(TOPO,TOPO.objects.countries).features;
  const byId={}; feats.forEach(f=>byId[+f.id]=f);
  const dpr=Math.min(window.devicePixelRatio||1,2);
  let W=0; const proj=d3.geoOrthographic().clipAngle(90).precision(0.6);
  const path=d3.geoPath(proj,ctx), grat=d3.geoGraticule10();
  let rot=18, phi=-10, dragging=false, hoverCode=null, lastX=0,lastY=0, target=null;
  const tip=document.getElementById('globeTip');
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function norm(a){while(a>180)a-=360;while(a<-180)a+=360;return a;}
  function resize(){const w=cv.clientWidth||520; W=w; cv.width=W*dpr; cv.height=W*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); proj.scale(W/2-8).translate([W/2,W/2]);}
  function visible(ll){return d3.geoDistance(ll,[-rot,-phi])<Math.PI/2;}
  function draw(){
    proj.rotate([rot,phi]); ctx.clearRect(0,0,W,W);
    ctx.beginPath(); path({type:'Sphere'});
    const g=ctx.createRadialGradient(W*0.38,W*0.34,W*0.08,W/2,W/2,W/2);
    g.addColorStop(0,'#17543c'); g.addColorStop(.72,'#0f3a2a'); g.addColorStop(1,'#07211a');
    ctx.fillStyle=g; ctx.fill();
    ctx.beginPath(); path(grat); ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=.5; ctx.stroke();
    for(const fe of feats){const code=ISO2CODE[+fe.id]; ctx.beginPath(); path(fe);
      if(code){const on=code===hoverCode||code===activeCountry;
        ctx.fillStyle=on?'#E8C552':'rgba(201,162,39,.74)'; ctx.fill();
        ctx.lineWidth=on?1.5:.7; ctx.strokeStyle=on?'#fff':'rgba(255,255,255,.4)'; ctx.stroke();}
      else{ctx.fillStyle='rgba(255,255,255,.07)'; ctx.fill(); ctx.lineWidth=.5; ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.stroke();}}
    ctx.beginPath(); path({type:'Sphere'}); ctx.strokeStyle='rgba(201,162,39,.28)'; ctx.lineWidth=1; ctx.stroke();
  }
  function tick(){
    if(target!=null){rot+=norm(-target.lon-rot)*0.12; phi+=(clamp(-target.lat,-52,52)-phi)*0.12; if(Math.abs(norm(-target.lon-rot))<0.5)target=null;}
    else if(!dragging&&hoverCode===null)rot=norm(rot+0.15);
    draw(); requestAnimationFrame(tick);
  }
  function at(mx,my){if(!proj.invert)return null; const ll=proj.invert([mx,my]); if(!ll)return null;
    for(const code in SRC){const fe=byId[SRC[code]]; if(fe&&d3.geoContains(fe,ll))return code;} return null;}
  cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
    if(dragging){rot=norm(rot+(mx-lastX)*0.4); phi=clamp(phi-(my-lastY)*0.4,-85,85); lastX=mx;lastY=my; target=null; return;}
    const code=at(mx,my); hoverCode=code; cv.style.cursor=code?'pointer':'grab';
    if(code&&tip){const c=C[code]; tip.innerHTML='<b>'+c[L]+'</b><span>'+(L==='ru'?c.pru:c.pen)+'</span><em>'+(L==='ru'?'Нажмите → продукция ниже':'Click → products below')+'</em>';
      tip.style.display='block'; tip.style.left=clamp(mx+14,4,W-tip.offsetWidth-4)+'px'; tip.style.top=clamp(my+14,4,W-tip.offsetHeight-4)+'px';}
    else if(tip)tip.style.display='none';});
  cv.addEventListener('pointerleave',()=>{hoverCode=null; if(tip)tip.style.display='none';});
  cv.addEventListener('pointerdown',e=>{dragging=true; const r=cv.getBoundingClientRect(); lastX=e.clientX-r.left; lastY=e.clientY-r.top; try{cv.setPointerCapture(e.pointerId);}catch(_){}});
  cv.addEventListener('pointerup',e=>{dragging=false; const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top; const code=at(mx,my); if(code)selectCountry(code);});
  window.addEventListener('resize',resize); resize();
  window.__globe={focus:code=>{const fe=byId[SRC[code]]; if(fe){const c=d3.geoCentroid(fe); target={lon:c[0],lat:c[1]};}}};
  requestAnimationFrame(tick);
}
function gotoCountryProducts(code){activeCountry=code; renderRegions(); renderGeo(code); oriFilter=code; catFilter='all'; renderCatFilters(); renderOriFilters(); renderCatalog(); const el=document.getElementById('catalog'); if(el)el.scrollIntoView({behavior:'smooth'});}

/* SEASON */
function renderMonths(){
  const wrap=document.getElementById('months'); wrap.innerHTML='';
  MONTHS[L].forEach((m,i)=>{
    const b=document.createElement('button');
    b.className='mbtn'+(i===selMonth?' active':'')+(i===new Date().getMonth()?' now':'');
    b.textContent=m; b.onclick=()=>{selMonth=i; renderMonths(); renderSeason();};
    wrap.appendChild(b);
  });
}
function renderSeason(){
  const avail=SEASON.filter(s=>s.m[selMonth]);
  document.getElementById('seasonCap').textContent=
    (L==='ru'?'Доступно в выбранном месяце':'Available in the selected month')+' · '+MONTHS[L][selMonth]+' · '+avail.length;
  const g=document.getElementById('seasonGrid'); g.innerHTML='';
  avail.forEach(s=>{const d=document.createElement('div');d.className='scrop';
    d.innerHTML='<div class="nm serif">'+s[L]+'</div><div class="or">'+(L==='ru'?s.oru:s.oen)+'</div>';g.appendChild(d);});
}

/* CATALOG */
function renderCatFilters(){
  const w=document.getElementById('catFilters'); w.innerHTML='';
  const mk=(k,label)=>{const b=document.createElement('button');b.className='cbtn'+(catFilter===k?' active':'');b.textContent=label;b.onclick=()=>{catFilter=k;renderCatFilters();renderCatalog();};w.appendChild(b);};
  mk('all',L==='ru'?'Все':'All');
  Object.entries(CATS).forEach(([k,v])=>mk(k,v[L]));
}
function renderOriFilters(){
  const w=document.getElementById('oriFilters'); w.innerHTML='';
  const mk=(k,label)=>{const b=document.createElement('button');b.className='cbtn'+(oriFilter===k?' active':'');b.textContent=label;b.onclick=()=>{oriFilter=k;renderOriFilters();renderCatalog();};w.appendChild(b);};
  mk('all',L==='ru'?'Все':'All');
  Object.keys(C).forEach(code=>mk(code,C[code][L]));
}
function renderCatalog(){
  const g=document.getElementById('catGrid'); g.innerHTML='';
  const list=PROD.filter(p=>(catFilter==='all'||p.cat===catFilter)&&(oriFilter==='all'||(p.ori&&p.ori.includes(oriFilter))));
  document.getElementById('catEmpty').style.display=list.length?'none':'block';
  list.forEach(p=>{
    const d=document.createElement('div'); d.className='pcard';
    if(p.img){d.style.backgroundImage="url('"+p.img+"')";} else {d.style.backgroundColor=p.tint||'#1B4B38';}
    d.innerHTML='<div class="meta"><div class="pc">'+CATS[p.cat][L]+'</div>'+
      '<div class="pn">'+p[L]+'</div>'+
      '<div class="po">'+(L==='ru'?p.oru:p.oen)+'</div>'+
      '<div class="pmeta"><span class="tag">'+(L==='ru'?'Сезон':'Season')+': '+(L==='ru'?p.sru:p.sen)+'</span></div></div>';
    g.appendChild(d);
  });
}
document.getElementById('catReset').onclick=()=>{catFilter='all';oriFilter='all';renderCatFilters();renderOriFilters();renderCatalog();};

/* LOGISTICS */
function renderLog(){
  const w=document.getElementById('logFeat'); w.innerHTML='';
  LOG.forEach(s=>{const d=document.createElement('div');d.className='lfeat';
    d.innerHTML='<div class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+s.i+'"/></svg></div>'+
      '<div><h3>'+s[L][0]+'</h3><p>'+s[L][1]+'</p></div>';w.appendChild(d);});
}

/* COUNTERS */
function animateCounters(){
  document.querySelectorAll('[data-count]').forEach(el=>{
    const t=+el.dataset.count, dur=1100, st=performance.now();
    function step(now){const p=Math.min((now-st)/dur,1);el.textContent=Math.round((1-Math.pow(1-p,3))*t);if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  });
}

/* FORM */
document.getElementById('rfqForm').addEventListener('submit',function(e){
  e.preventDefault(); const f=e.target;
  const subj=encodeURIComponent('RFQ — '+(f.crop.value||'')+' '+(f.volume.value||''));
  const body=encodeURIComponent([
    (L==='ru'?'Культура: ':'Crop: ')+f.crop.value,
    (L==='ru'?'Объём: ':'Volume: ')+f.volume.value,
    'Incoterms: '+f.inco.value,
    (L==='ru'?'Доставка: ':'Destination: ')+f.dest.value,
    (L==='ru'?'Компания: ':'Company: ')+f.company.value,
    (L==='ru'?'Контакт: ':'Contact: ')+f.contact.value
  ].join('\n'));
  document.getElementById('rfqOk').style.display='block';
  window.location.href='mailto:info@newlink.com?subject='+subj+'&body='+body;
});

/* REVEAL */
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);if(e.target.querySelector&&e.target.querySelector('[data-count]')){}}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
} else { document.querySelectorAll('.reveal').forEach(el=>el.classList.add('in')); }

/* LANG TOGGLE */
document.getElementById('lang').addEventListener('click',e=>{const b=e.target.closest('button');if(b)applyLang(b.dataset.set);});
const _burger=document.getElementById('burger'), _mm=document.getElementById('mobileMenu');
if(_burger&&_mm){ _burger.addEventListener('click',()=>{const o=_mm.classList.toggle('open'); _burger.classList.toggle('open',o);});
  _mm.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{_mm.classList.remove('open'); _burger.classList.remove('open');})); }

/* INIT */
initGlobe();
applyLang('ru');
window.addEventListener('load',animateCounters);
setTimeout(animateCounters,300);
