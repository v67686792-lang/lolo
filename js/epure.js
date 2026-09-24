/* Движок чертежей: SVG-эпюр в миллиметрах + пошаговый плеер.
   Экранные координаты: X вправо, Y вниз, 1 единица = 1 мм. */
(function(){
'use strict';
const NG = window.NG = window.NG || {};
const NS = 'http://www.w3.org/2000/svg';

function sv(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
NG.sv = sv;

const G = NG.G = {
  add:(a,b)=>[a[0]+b[0],a[1]+b[1]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1]], mul:(a,k)=>[a[0]*k,a[1]*k],
  len:a=>Math.hypot(a[0],a[1]), dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),
  norm:a=>{const l=Math.hypot(a[0],a[1])||1;return [a[0]/l,a[1]/l];},
  perp:a=>[-a[1],a[0]], dot:(a,b)=>a[0]*b[0]+a[1]*b[1],
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],
  dir:t=>[Math.cos(t),Math.sin(t)], at2:v=>Math.atan2(v[1],v[0])
};

/* число с десятичной запятой, без хвостовых нулей */
NG.fmt = function(v, d){ if (d == null) d = 1; let s = (+v).toFixed(d); if (d>0) s = s.replace(/\.?0+$/, ''); if (s==='-0') s='0'; return s.replace('.', ','); };

const WIDTH = {main:2.6, nv:2.9, thin:1.4, aux:1.3, link:1.05, axis:1.4, ext:1};

/* ---------- габариты сцены ---------- */
function bbox(els, pad){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const P=p=>{ if(!p) return; x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]); };
  els.forEach(e=>{
    if (e.nobb) return;
    if (e.t==='seg'){P(e.a);P(e.b);}
    else if (e.t==='dim'){
      P(e.a);P(e.b);
      if (e.n){
        const v=G.norm(G.sub(e.b,e.a)), n=G.perp(v), m=G.lerp(e.a,e.b,.5), s=e.side||1;
        const w=e.n.length*1.8+4;
        if (Math.abs(n[0])>=.35) P([m[0]+n[0]*s*w, m[1]]); else P([m[0], m[1]+n[1]*s*6]);
      }
    }
    else if (e.t==='pt'){P(e.p);}
    else if (e.t==='txt'){
      /* грубая оценка ширины подписи: ~1,8 мм на символ */
      const w = (e.n||'').length*1.8, x = e.p[0] + (e.dp?e.dp[0]*0.3:0);
      P([x,e.p[1]]);
      if (e.anc==='start') P([x+w,e.p[1]]); else if (e.anc==='end') P([x-w,e.p[1]]); else { P([x-w/2,e.p[1]]); P([x+w/2,e.p[1]]); }
    }
    else if (e.t==='poly'){e.pts.forEach(P);}
    else if (e.t==='ang'){P(e.v);}
    else if (e.t==='arc'){ for(let i=0;i<=8;i++){ const t=e.t1+(e.t2-e.t1)*i/8; P(G.add(e.o,G.mul(G.dir(t),e.r))); } }
  });
  if (!isFinite(x0)) {x0=0;y0=0;x1=50;y1=50;}
  let w=x1-x0, h=y1-y0;
  const minW = 50, minH = 30;
  if (w<minW){x0-=(minW-w)/2; w=minW;}
  if (h<minH){y0-=(minH-h)/2; h=minH;}
  return {x:x0-pad, y:y0-pad, w:w+2*pad, h:h+2*pad};
}
NG.bbox = bbox;

/* ---------- рисование одного элемента ---------- */
function drawEl(g, e, u){
  const c = e.c || 'txt';
  if (e.t==='seg'){
    if (e.glow){
      return sv('line',{x1:e.a[0],y1:e.a[1],x2:e.b[0],y2:e.b[1],class:'glow pulse s-'+c,'stroke-width':12*u},g);
    }
    const w = (WIDTH[e.w||'main']||2.4)*u;
    const a = {x1:e.a[0],y1:e.a[1],x2:e.b[0],y2:e.b[1],class:'s-'+c,'stroke-width':w,'stroke-linecap':'round'};
    if (e.w==='aux' || e.dash) a['stroke-dasharray'] = (7*u)+' '+(4.5*u);
    if (e.w==='ext') a['stroke-dasharray'] = (2*u)+' '+(3.5*u);
    if (e.w==='link') a['stroke-opacity'] = .75;
    return sv('line',a,g);
  }
  if (e.t==='poly'){
    return sv('polygon',{points:e.pts.map(p=>p.join(',')).join(' '),class:'f-'+c,'fill-opacity':e.op==null?.1:e.op},g);
  }
  if (e.t==='pt'){
    const gg = sv('g',{},g);
    const r = (e.r||3.3)*u;
    sv('circle',{cx:e.p[0],cy:e.p[1],r:r,class:(e.hollow?'s-':'f-')+c+(e.hollow?'':' s-'+c),fill:e.hollow?'var(--figbg)':null,'stroke-width':1.6*u},gg);
    if (e.n) label(gg, e.p, e.n, c, e.lp, u, e.size);
    return gg;
  }
  if (e.t==='txt'){
    const fs=(e.size||13)*u;
    const dp = e.dp||[0,0];
    const t = sv('text',{x:e.p[0]+dp[0]*u,y:e.p[1]+dp[1]*u,'font-size':fs,'text-anchor':e.anc||'middle',class:'ep-text '+(e.val?'ep-val ':'')+'f-'+c,'stroke-width':3.2*u},g);
    t.textContent = e.n;
    return t;
  }
  if (e.t==='ang'){
    const gg = sv('g',{},g);
    const va=G.sub(e.a,e.v), vb=G.sub(e.b,e.v);
    const t1=G.at2(va); let d=G.at2(vb)-t1;
    while(d>Math.PI) d-=2*Math.PI; while(d<=-Math.PI) d+=2*Math.PI;
    const r = e.r || Math.max(5, Math.min(10, 0.38*Math.min(G.len(va),G.len(vb))));
    const p1=G.add(e.v,G.mul(G.dir(t1),r)), p2=G.add(e.v,G.mul(G.dir(t1+d),r));
    const sw = d>0?1:0;
    sv('path',{d:`M${e.v[0]},${e.v[1]} L${p1[0]},${p1[1]} A${r},${r} 0 0 ${sw} ${p2[0]},${p2[1]} Z`,class:'f-'+c,'fill-opacity':.16},gg);
    sv('path',{d:`M${p1[0]},${p1[1]} A${r},${r} 0 0 ${sw} ${p2[0]},${p2[1]}`,class:'s-'+c,fill:'none','stroke-width':2*u},gg);
    if (e.n){
      const bis = G.dir(t1+d/2);
      const lp = G.add(e.v,G.mul(bis,r+9*u+2));
      const t = sv('text',{x:lp[0],y:lp[1]+4.5*u,'font-size':13*u,'text-anchor':'middle',class:'ep-text f-'+c,'stroke-width':3.2*u},gg);
      t.textContent=e.n;
    }
    return gg;
  }
  if (e.t==='rt'){
    const s = e.s2 || Math.max(2.4, 8*u);
    const ua=G.norm(G.sub(e.a,e.v)), ub=G.norm(G.sub(e.b,e.v));
    const p1=G.add(e.v,G.mul(ua,s)), p3=G.add(e.v,G.mul(ub,s)), p2=G.add(p1,G.mul(ub,s));
    return sv('polyline',{points:[p1,p2,p3].map(p=>p.join(',')).join(' '),fill:'none',class:'s-'+c,'stroke-width':1.3*u},g);
  }
  if (e.t==='dim'){
    const gg = sv('g',{},g);
    const v=G.norm(G.sub(e.b,e.a)), n=G.perp(v);
    const tk=5*u;
    sv('line',{x1:e.a[0],y1:e.a[1],x2:e.b[0],y2:e.b[1],class:'s-'+c,'stroke-width':2.2*u},gg);
    [e.a,e.b].forEach(p=>sv('line',{x1:p[0]-n[0]*tk,y1:p[1]-n[1]*tk,x2:p[0]+n[0]*tk,y2:p[1]+n[1]*tk,class:'s-'+c,'stroke-width':2*u},gg));
    if (e.n){
      const side = e.side||1;
      const m=G.lerp(e.a,e.b,.5);
      const off = e.lo || 11;
      const lp=G.add(m,G.mul(n,side*off*u));
      const anc = Math.abs(n[0])<.35?'middle':((n[0]*side)>0?'start':'end');
      const t = sv('text',{x:lp[0],y:lp[1]+4.5*u,'font-size':(e.size||13)*u,'text-anchor':anc,class:'ep-text f-'+c,'stroke-width':3.2*u},gg);
      t.textContent=e.n;
    }
    return gg;
  }
  if (e.t==='arc'){
    const p1=G.add(e.o,G.mul(G.dir(e.t1),e.r)), p2=G.add(e.o,G.mul(G.dir(e.t2),e.r));
    const d=e.t2-e.t1;
    return sv('path',{d:`M${p1[0]},${p1[1]} A${e.r},${e.r} 0 ${Math.abs(d)>Math.PI?1:0} ${d>0?1:0} ${p2[0]},${p2[1]}`,fill:'none',class:'s-'+c,'stroke-width':1.3*u,'stroke-dasharray':(5*u)+' '+(3.5*u)},g);
  }
}

function label(g, p, text, c, lp, u, size){
  const d = lp ? G.norm(lp) : [-.7,-.7];
  const fs = (size||14)*u;
  const q = G.add(p, G.mul(d, 11*u));
  let anc='middle';
  if (d[0]<-.3) anc='end'; else if (d[0]>.3) anc='start';
  let dy = fs*.36;
  if (d[1]>.45) dy = fs*.85; else if (d[1]<-.45) dy = 0;
  const t = sv('text',{x:q[0],y:q[1]+dy,'font-size':fs,'text-anchor':anc,class:'ep-text f-'+c,'stroke-width':3.4*u},g);
  t.textContent = text;
}

/* ---------- фигура (эпюр) ---------- */
NG.Fig = function(host, opts){
  const els = opts.els;
  const wrap = document.createElement('div');
  wrap.className = 'fig' + (opts.cls?' '+opts.cls:'');
  host.appendChild(wrap);
  if (opts.cap){ const c=document.createElement('div'); c.className='figcap'; c.textContent=opts.cap; wrap.appendChild(c); }
  const svg = sv('svg',{xmlns:NS, preserveAspectRatio:'xMidYMid meet', role:'img'}, wrap);
  const bb = bbox(els, opts.pad==null?11:opts.pad);
  svg.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.w} ${bb.h}`);
  const self = {svg, wrap, step: opts.step==null?Infinity:opts.step, nodes:[]};
  let lastW = 0;

  function render(animate){
    const cw = svg.clientWidth || wrap.clientWidth || opts.w || 600;
    const maxH = opts.maxH || window.innerHeight*0.72;
    const sc = Math.max(0.3, Math.min(cw/bb.w, maxH/bb.h));
    const u = (opts.u || 1/sc) * (opts.k || 1);
    lastW = cw;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (opts.grid !== false){
      const defs = sv('defs',{},svg);
      const id = 'gp'+Math.random().toString(36).slice(2,8);
      const pat = sv('pattern',{id, width:5, height:5, patternUnits:'userSpaceOnUse', x:0, y:0},defs);
      sv('path',{d:'M5 0 L0 0 0 5',fill:'none',stroke:'var(--gridc)','stroke-width':u},pat);
      const id2 = id+'b';
      const pat2 = sv('pattern',{id:id2, width:10, height:10, patternUnits:'userSpaceOnUse', x:0, y:0},defs);
      sv('path',{d:'M10 0 L0 0 0 10',fill:'none',stroke:'var(--gridc2)','stroke-width':u},pat2);
      sv('rect',{x:bb.x,y:bb.y,width:bb.w,height:bb.h,fill:`url(#${id})`},svg);
      sv('rect',{x:bb.x,y:bb.y,width:bb.w,height:bb.h,fill:`url(#${id2})`},svg);
    }
    const layer = sv('g',{},svg);
    self.nodes = els.map(e=>drawEl(layer, e, u));
    apply(animate);
  }

  function apply(animate){
    const s = self.step;
    els.forEach((e,i)=>{
      const n = self.nodes[i]; if (!n) return;
      const es = e.s||0;
      let vis = es <= s;
      if (e.hl) vis = es === s;
      if (e.until!=null && s > e.until) vis = false;
      n.style.display = vis ? '' : 'none';
      n.classList.remove('el-new','el-old');
      if (vis && s!==Infinity && es===s && es>0 && !e.glow){
        n.classList.add('el-new');
        if (animate && e.t==='seg' && !e.glow && !e.noanim) grow(n, e);
      }
    });
  }

  function grow(n, e){
    const t0 = performance.now(), D = 520;
    n.setAttribute('x2', e.a[0]); n.setAttribute('y2', e.a[1]);
    function f(t){
      const k = Math.min(1,Math.max(0,(t-t0)/D)), q = 1-Math.pow(1-k,3);
      n.setAttribute('x2', e.a[0]+(e.b[0]-e.a[0])*q);
      n.setAttribute('y2', e.a[1]+(e.b[1]-e.a[1])*q);
      if (k<1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  self.setStep = function(s, animate){ self.step = s; apply(animate); };
  self.refresh = function(){ if (opts.u) return; const w = svg.clientWidth||0; if (w && Math.abs(w - lastW) > 2) render(false); };
  render(false);
  requestAnimationFrame(()=>self.refresh());
  if (window.ResizeObserver && !opts.u){ const ro = new ResizeObserver(()=>self.refresh()); ro.observe(wrap); }
  return self;
};

/* ---------- пошаговый плеер ---------- */
NG.players = [];
NG.Player = function(host, steps, opts){
  opts = opts || {};
  const els = [];
  steps.forEach((st,i)=>{
    (st.els||[]).forEach(e=>{ e.s = i; if (e.glow) e.hl = true; els.push(e); });
    (st.hl||[]).forEach(e=>{ e.s = i; e.hl = true; els.push(e); });
  });
  const root = document.createElement('div'); root.className='player'; root.tabIndex = -1;
  host.appendChild(root);
  const figHost = document.createElement('div'); root.appendChild(figHost);
  const fig = NG.Fig(figHost, {els, step:0, cap:opts.cap});
  const side = document.createElement('div'); side.className='side'; root.appendChild(side);
  side.innerHTML = `<div class="pl-count"><span class="cnt"></span><button class="btn sm allb" type="button">всё решение ⏭</button></div>
    <div class="pl-title"></div><div class="pl-text"></div>
    <div class="pl-ctrl"><button class="btn prev" type="button" aria-label="Назад">←</button><button class="btn pri next" type="button">Дальше →</button><button class="btn sm rst" type="button" aria-label="Сначала">⟲</button></div>
    <div class="dots"></div><div class="pl-hint">Можно листать стрелками <span class="kbd">←</span> <span class="kbd">→</span> на клавиатуре</div>`;
  const $ = s=>side.querySelector(s);
  const dots = $('.dots');
  steps.forEach((st,i)=>{ const d=document.createElement('i'); d.title=st.title.replace(/<[^>]+>/g,''); d.onclick=()=>go(i,true); dots.appendChild(d); });
  let cur = 0;
  function go(i, anim){
    cur = Math.max(0, Math.min(steps.length-1, i));
    const st = steps[cur];
    fig.setStep(cur, anim);
    $('.cnt').textContent = `Шаг ${cur+1} / ${steps.length}`;
    $('.pl-title').innerHTML = st.title;
    $('.pl-text').innerHTML = st.html || '';
    $('.prev').disabled = cur===0;
    const nx = $('.next');
    nx.disabled = cur===steps.length-1;
    nx.textContent = cur===steps.length-1 ? 'Готово ✓' : 'Дальше →';
    [...dots.children].forEach((d,j)=>{ d.className = j<cur?'on':(j===cur?'cur':''); });
    if (opts.onStep) opts.onStep(cur, steps.length);
  }
  $('.prev').onclick=()=>go(cur-1,true);
  $('.next').onclick=()=>go(cur+1,true);
  $('.rst').onclick=()=>go(0,false);
  $('.allb').onclick=()=>go(steps.length-1,false);
  const api = {root, go, next:()=>go(cur+1,true), prev:()=>go(cur-1,true), get cur(){return cur;}, fig};
  const activate = ()=>{ NG.activePlayer = api; };
  root.addEventListener('pointerdown', activate);
  root.addEventListener('focusin', activate);
  NG.players.push(api);
  go(0,false);
  return api;
};

function inView(el){ const r = el.getBoundingClientRect(); return r.bottom>80 && r.top < window.innerHeight-80; }
document.addEventListener('keydown', e=>{
  const t = e.target;
  if (t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return;
  if (e.key!=='ArrowRight' && e.key!=='ArrowLeft') return;
  let p = NG.activePlayer;
  if (!p || !document.body.contains(p.root) || !inView(p.root)){
    p = NG.players.filter(x=>document.body.contains(x.root)).find(x=>inView(x.root));
  }
  if (!p) return;
  e.preventDefault();
  if (e.key==='ArrowRight') p.next(); else p.prev();
});

})();
