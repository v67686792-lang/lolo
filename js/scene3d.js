/* Лёгкий 3D на SVG: угол «комнаты» из П₁, П₂, П₃, вращение пальцем/мышью, виды спереди/сверху/слева.
   Мировые координаты как в лекции: x — влево, y — к нам, z — вверх. */
(function(){
'use strict';
const NG = window.NG, G = NG.G, fmt = NG.fmt, sv = NG.sv;
const V3 = {
  add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}), sub:(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),
  mul:(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k}), len:a=>Math.hypot(a.x,a.y,a.z),
  norm:a=>{const l=Math.hypot(a.x,a.y,a.z)||1;return {x:a.x/l,y:a.y/l,z:a.z/l};},
  dot:(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z, lerp:(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t})
};
NG.V3 = V3;
const VIEWS = {iso:[0.72,0.42], front:[0,0], top:[0,Math.PI/2], side:[Math.PI/2,0]};

NG.Scene3D = function(host, opts){
  const size = opts.size || {x:100,y:60,z:60};
  const wrap = document.createElement('div'); wrap.className='fig';
  host.appendChild(wrap);
  const cap = document.createElement('div'); cap.className='figcap'; cap.textContent = '3D · крути пальцем или мышью'; wrap.appendChild(cap);
  const svg = sv('svg',{xmlns:'http://www.w3.org/2000/svg',preserveAspectRatio:'xMidYMid meet'},wrap);
  const C = {x:size.x/2, y:size.y/2, z:size.z/2};
  const R = Math.hypot(size.x,size.y,size.z)/2 + 8;
  svg.setAttribute('viewBox', `${-R} ${-R*0.82} ${2*R} ${1.64*R}`);
  let yaw = VIEWS.iso[0], pitch = VIEWS.iso[1];
  function P(p){
    const X = -(p.x - C.x), Y = p.z - C.z, Z = p.y - C.y;
    const x1 = X*Math.cos(yaw) + Z*Math.sin(yaw), z1 = -X*Math.sin(yaw) + Z*Math.cos(yaw);
    const y2 = Y*Math.cos(pitch) - z1*Math.sin(pitch), z2 = z1*Math.cos(pitch) + Y*Math.sin(pitch);
    return [x1, -y2, z2];
  }
  const self = {P, V3};
  function render(){
    const items = opts.build();
    const cw = svg.clientWidth || 500;
    const u = (2*R)/cw;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const polys = items.filter(i=>i.t==='poly').map(i=>({i, pts:i.pts.map(P)}));
    polys.forEach(o=>o.d = o.pts.reduce((s,p)=>s+p[2],0)/o.pts.length);
    polys.sort((a,b)=>a.d-b.d).forEach(o=>{
      sv('polygon',{points:o.pts.map(p=>p[0]+','+p[1]).join(' '),class:'f-'+(o.i.c||'aux')+' s-'+(o.i.c||'aux'),'fill-opacity':o.i.op==null?.1:o.i.op,'stroke-opacity':o.i.sop==null?.35:o.i.sop,'stroke-width':u},svg);
    });
    items.filter(i=>i.t==='seg').forEach(i=>{
      const a=P(i.a), b=P(i.b);
      const at={x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'s-'+(i.c||'txt'),'stroke-width':(i.w||2.2)*u,'stroke-linecap':'round'};
      if (i.dash) at['stroke-dasharray']=(5*u)+' '+(4*u);
      if (i.op!=null) at.opacity=i.op;
      sv('line',at,svg);
    });
    items.filter(i=>i.t==='path').forEach(i=>{
      const pts=i.pts.map(P);
      sv('polyline',{points:pts.map(p=>p[0]+','+p[1]).join(' '),fill:'none',class:'s-'+(i.c||'txt'),'stroke-width':(i.w||2)*u},svg);
    });
    items.filter(i=>i.t==='pt').forEach(i=>{
      const a=P(i.p);
      sv('circle',{cx:a[0],cy:a[1],r:(i.r||3.4)*u,class:'f-'+(i.c||'txt')},svg);
      if (i.n){ const t=sv('text',{x:a[0]+(i.dx||7)*u,y:a[1]+(i.dy||-6)*u,'font-size':(i.size||14)*u,class:'ep-text f-'+(i.c||'txt'),'stroke-width':3*u,'text-anchor':i.anc||'start'},svg); t.textContent=i.n; }
    });
    items.filter(i=>i.t==='txt').forEach(i=>{
      const a=P(i.p);
      const t=sv('text',{x:a[0],y:a[1],'font-size':(i.size||13)*u,class:'ep-text f-'+(i.c||'txt'),'stroke-width':3*u,'text-anchor':'middle',opacity:i.op==null?1:i.op},svg); t.textContent=i.n;
    });
  }
  self.render = render;
  let anim = null;
  self.view = function(name){
    const [ty,tp] = VIEWS[name]; const y0=yaw, p0=pitch, t0=performance.now();
    cancelAnimationFrame(anim);
    const f=t=>{ const k=Math.min(1,(t-t0)/450), q=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2; yaw=y0+(ty-y0)*q; pitch=p0+(tp-p0)*q; render(); if(k<1) anim=requestAnimationFrame(f); };
    anim=requestAnimationFrame(f);
  };
  let drag=null;
  svg.addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,yaw,pitch,touch:e.pointerType!=='mouse'}; svg.setPointerCapture&&svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove',e=>{ if(!drag) return; yaw = drag.yaw + (e.clientX-drag.x)*0.012; if (!drag.touch) pitch = Math.max(-0.15, Math.min(Math.PI/2, drag.pitch + (e.clientY-drag.y)*0.01)); render(); });
  const end=()=>{ drag=null; };
  svg.addEventListener('pointerup',end); svg.addEventListener('pointercancel',end);
  const bar = document.createElement('div'); bar.className='vbtns';
  [['iso','3D'],['front','Спереди (П₂)'],['top','Сверху (П₁)'],['side','Слева (П₃)']].forEach(([k,l])=>{ const bt=document.createElement('button'); bt.className='btn sm'; bt.type='button'; bt.textContent=l; bt.onclick=()=>self.view(k); bar.appendChild(bt); });
  host.appendChild(bar);
  if (window.ResizeObserver) new ResizeObserver(()=>render()).observe(wrap);
  render();
  return self;
};

/* плоскости проекций и оси */
NG.room = function(L, W, H, opts){
  opts = opts||{};
  const O={x:0,y:0,z:0};
  const it = [
    {t:'poly',c:'p1',op:.07,pts:[O,{x:L,y:0,z:0},{x:L,y:W,z:0},{x:0,y:W,z:0}]},
    {t:'poly',c:'p2',op:.07,pts:[O,{x:L,y:0,z:0},{x:L,y:0,z:H},{x:0,y:0,z:H}]},
  ];
  if (!opts.no3) it.push({t:'poly',c:'p3',op:.07,pts:[O,{x:0,y:W,z:0},{x:0,y:W,z:H},{x:0,y:0,z:H}]});
  it.push({t:'seg',a:O,b:{x:L+6,y:0,z:0},c:'axis',w:1.3},{t:'seg',a:O,b:{x:0,y:W+6,z:0},c:'axis',w:1.3},{t:'seg',a:O,b:{x:0,y:0,z:H+6},c:'axis',w:1.3});
  it.push({t:'txt',p:{x:L+10,y:0,z:0},n:'x',c:'axis'},{t:'txt',p:{x:0,y:W+10,z:0},n:'y',c:'axis'},{t:'txt',p:{x:0,y:0,z:H+10},n:'z',c:'axis'},{t:'txt',p:{x:-3,y:-3,z:-3},n:'O',c:'axis',size:12});
  it.push({t:'txt',p:{x:L*0.85,y:W*0.85,z:0},n:'П₁',c:'p1',size:15,op:.9},{t:'txt',p:{x:L*0.85,y:0,z:H*0.85},n:'П₂',c:'p2',size:15,op:.9});
  if (!opts.no3) it.push({t:'txt',p:{x:0,y:W*0.8,z:H*0.85},n:'П₃',c:'p3',size:15,op:.9});
  return it;
};

/* ============ виджет: точка и её проекции ============ */
NG.widgetPoint = function(host){
  const st = {x:55,y:30,z:40};
  host.innerHTML = `<div class="v3d"><div class="w3"></div><div><div class="w2"></div></div></div>
    <div class="card" style="margin-top:10px">
      <div class="slider">x (широта) <input type="range" min="5" max="90" value="55" data-k="x"><b></b></div>
      <div class="slider">y (глубина) <input type="range" min="0" max="50" value="30" data-k="y"><b></b></div>
      <div class="slider">z (высота) <input type="range" min="0" max="50" value="40" data-k="z"><b></b></div>
      <div class="pt-read muted" style="font-size:14px"></div>
    </div>`;
  const A = ()=>({x:st.x,y:st.y,z:st.z});
  const sc = NG.Scene3D(host.querySelector('.w3'), {size:{x:100,y:60,z:60}, build(){
    const a=A(), a1={x:a.x,y:a.y,z:0}, a2={x:a.x,y:0,z:a.z}, a3={x:0,y:a.y,z:a.z};
    return NG.room(100,60,60).concat([
      {t:'seg',a:a,b:a1,c:'p1',dash:true,w:1.5},{t:'seg',a:a,b:a2,c:'p2',dash:true,w:1.5},{t:'seg',a:a,b:a3,c:'p3',dash:true,w:1.5},
      {t:'seg',a:a1,b:{x:a.x,y:0,z:0},c:'aux',w:1,op:.7},{t:'seg',a:a1,b:{x:0,y:a.y,z:0},c:'aux',w:1,op:.7},
      {t:'seg',a:a2,b:{x:a.x,y:0,z:0},c:'aux',w:1,op:.7},{t:'seg',a:a2,b:{x:0,y:0,z:a.z},c:'aux',w:1,op:.7},
      {t:'seg',a:a3,b:{x:0,y:a.y,z:0},c:'aux',w:1,op:.7},{t:'seg',a:a3,b:{x:0,y:0,z:a.z},c:'aux',w:1,op:.7},
      {t:'pt',p:a,n:'A',c:'txt',r:4},{t:'pt',p:a1,n:'A₁',c:'p1'},{t:'pt',p:a2,n:'A₂',c:'p2'},{t:'pt',p:a3,n:'A₃',c:'p3'}
    ]);
  }});
  const h2 = host.querySelector('.w2');
  function epure(){
    h2.innerHTML='';
    const a=A();
    const p1=[-a.x,a.y], p2=[-a.x,-a.z], p3=[a.y,-a.z], k=[a.y,a.y];
    const els = NG.U.axesEls([{x:90,y:50,z:50},{x:5,y:0,z:0}], true).concat([
      {t:'seg',a:p1,b:p2,c:'link',w:'link'},{t:'seg',a:p2,b:p3,c:'link',w:'link'},
      {t:'seg',a:p1,b:k,c:'aux',w:'aux'},{t:'seg',a:k,b:p3,c:'aux',w:'aux'},
      {t:'dim',a:[0,-3],b:[-a.x,-3],c:'p3',n:'x',side:-1,size:12},
      {t:'dim',a:[-a.x-3,0],b:[-a.x-3,a.y],c:'p2',n:'y',side:-1,size:12},
      {t:'dim',a:[-a.x-3,0],b:[-a.x-3,-a.z],c:'p1',n:'z',side:1,size:12},
      {t:'pt',p:p2,n:'A₂',c:'p2',lp:[1,-1]},{t:'pt',p:p1,n:'A₁',c:'p1',lp:[1,1]},{t:'pt',p:p3,n:'A₃',c:'p3',lp:[1,-1]}
    ]);
    const f = NG.Fig(h2,{els, pad:8});
    f.wrap.insertAdjacentHTML('beforeend','<div class="figcap">ЭПЮР (КЧ)</div>');
    host.querySelector('.pt-read').innerHTML = `A(${a.x}; ${a.y}; ${a.z}) → <b class="c-p1">A₁(${a.x}; ${a.y})</b> — без z, <b class="c-p2">A₂(${a.x}; ${a.z})</b> — без y, <b class="c-p3">A₃(${a.y}; ${a.z})</b> — без x. Каждая проекция теряет одну координату, поэтому одной проекции мало, двух — достаточно.`;
  }
  let raf=0;
  host.querySelectorAll('input[type=range]').forEach(inp=>{
    const out = inp.parentNode.querySelector('b');
    const upd=()=>{ st[inp.dataset.k]=+inp.value; out.textContent=inp.value+' мм'; cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ sc.render(); epure(); }); };
    inp.addEventListener('input',upd); out.textContent=inp.value+' мм';
  });
  epure();
};

/* ============ виджет: лаборатория типов прямых ============ */
NG.widgetLineLab = function(host){
  let type='ga', seg=NG.randSeg('ga', NG.rng('lab-ga'));
  host.innerHTML = `<div class="types9"></div><div class="v3d"><div class="w3"></div><div class="w2"></div></div><div class="card lab-info"></div>`;
  const tb = host.querySelector('.types9');
  NG.TYPE_ORDER.forEach(k=>{ const bt=document.createElement('button'); bt.type='button'; bt.className='btn sm'; bt.dataset.k=k; bt.textContent=NG.TYPES[k].icon+' '+NG.TYPES[k].name; bt.onclick=()=>{ type=k; seg=NG.randSeg(k, NG.rng('lab-'+k)); upd(); }; tb.appendChild(bt); });
  const more=document.createElement('button'); more.type='button'; more.className='btn sm pri'; more.textContent='🎲 другой пример'; more.onclick=()=>{ seg=NG.randSeg(type); upd(); }; tb.appendChild(more);
  const sc = NG.Scene3D(host.querySelector('.w3'), {size:{x:100,y:60,z:60}, build(){
    const {A,B}=seg;
    const pr=(P,k)=>k===1?{x:P.x,y:P.y,z:0}:k===2?{x:P.x,y:0,z:P.z}:{x:0,y:P.y,z:P.z};
    const it = NG.room(100,60,60);
    [1,2,3].forEach(k=>{ const c='p'+k; it.push({t:'seg',a:A,b:pr(A,k),c,dash:true,w:1,op:.6},{t:'seg',a:B,b:pr(B,k),c,dash:true,w:1,op:.6},{t:'seg',a:pr(A,k),b:pr(B,k),c,w:2.6}); });
    it.push({t:'seg',a:A,b:B,c:'txt',w:3.2},{t:'pt',p:A,n:'A',c:'txt'},{t:'pt',p:B,n:'B',c:'txt'});
    return it;
  }});
  const h2 = host.querySelector('.w2');
  function upd(){
    tb.querySelectorAll('button[data-k]').forEach(b=>b.classList.toggle('pri', b.dataset.k===type));
    sc.render();
    h2.innerHTML='';
    const {A,B}=seg;
    const base = NG.U.baseScene({A,B,axes:true,show3:true});
    const S=base.S, els=base.els.slice();
    if (G.dist(S.a3,S.b3)>0.5) els.push({t:'seg',a:S.a3,b:S.b3,c:'p3'});
    [[A,S.a1,S.a2,S.a3],[B,S.b1,S.b2,S.b3]].forEach(([P,p1,p2,p3])=>{ els.push({t:'seg',a:p2,b:p3,c:'link',w:'link'},{t:'seg',a:p1,b:[P.y,P.y],c:'link',w:'link'},{t:'seg',a:[P.y,P.y],b:p3,c:'link',w:'link'}); });
    els.push(...NG.U.mergePts([{p:S.a3,n:'A₃',c:'p3',others:[S.b3,S.a2]},{p:S.b3,n:'B₃',c:'p3',others:[S.a3,S.b2]}]));
    const f = NG.Fig(h2,{els, pad:8});
    f.wrap.insertAdjacentHTML('beforeend','<div class="figcap">ЭПЮР (КЧ)</div>');
    const T = NG.TYPES[type], M = NG.measure(A,B);
    host.querySelector('.lab-info').innerHTML = `<h4>${T.name}</h4><p><b>Как узнать на КЧ:</b> ${T.sign}</p><p><b>Натуральная величина:</b> ${T.nv}.</p><p><b>Свойства (пиши на зачёте):</b></p><ul class="clean">${T.props.map(p=>`<li>${p}</li>`).join('')}</ul><p class="mono muted" style="font-size:13px">A(${A.x}; ${A.y}; ${A.z}), B(${B.x}; ${B.y}; ${B.z}) · |AB| ≈ ${fmt(M.NV)} · α ≈ ${fmt(M.a,0)}°, β ≈ ${fmt(M.b,0)}°, γ ≈ ${fmt(M.g,0)}°</p>`;
  }
  upd();
};

/* ============ виджет: почему работает метод прямоугольного треугольника ============ */
NG.widgetTri3D = function(host){
  const A={x:72,y:14,z:46}, B={x:22,y:40,z:16};
  const A1={x:A.x,y:A.y,z:0}, B1={x:B.x,y:B.y,z:0}, K={x:A.x,y:A.y,z:B.z};
  const dz = A.z-B.z;
  const u = V3.norm(V3.sub(A1,B1));
  let n = {x:-u.y, y:u.x, z:0}; if (n.y<0) n = V3.mul(n,-1);
  let t = 0;
  host.innerHTML = `<div class="w3"></div><div class="card" style="margin-top:10px"><div class="slider">Уложить треугольник на П₁ <input type="range" min="0" max="100" value="0"><b>0%</b></div><div class="tri-txt" style="font-size:15px"></div></div>`;
  const sc = NG.Scene3D(host.querySelector('.w3'), {size:{x:100,y:60,z:60}, build(){
    const it = NG.room(100,60,60,{no3:true});
    it.push({t:'seg',a:A,b:A1,c:'aux',dash:true,w:1.2},{t:'seg',a:B,b:B1,c:'aux',dash:true,w:1.2},{t:'seg',a:A1,b:B1,c:'p1',w:3},
      {t:'pt',p:A1,n:'A₁',c:'p1',dx:-8,anc:'end'},{t:'pt',p:B1,n:'B₁',c:'p1'});
    const s = Math.min(1,t/0.5), psi = Math.max(0,(t-0.5)/0.5)*Math.PI/2;
    const down = {x:0,y:0,z:-B.z*s};
    let Aq = V3.add(A,down), Kq = V3.add(K,down), Bq = V3.add(B,down);
    if (t>0.5){ Aq = V3.add(A1, V3.add(V3.mul({x:0,y:0,z:1}, dz*Math.cos(psi)), V3.mul(n, dz*Math.sin(psi)))); Kq = A1; Bq = B1; }
    it.push({t:'poly',c:'nv',op:.16,sop:.0,pts:[Aq,Kq,Bq]});
    if (t>0.02){ it.push({t:'seg',a:A,b:B,c:'txt',w:1.4,op:.35},{t:'seg',a:A,b:K,c:'dd',w:1.2,op:.35}); }
    it.push({t:'seg',a:Kq,b:Bq,c:'p1',w:2,dash:true},{t:'seg',a:Aq,b:Kq,c:'dd',w:3},{t:'seg',a:Aq,b:Bq,c:'nv',w:3.2});
    const e1 = V3.norm(V3.sub(Kq,Bq)), w = V3.sub(Aq,Bq); const e2 = V3.norm(V3.sub(w, V3.mul(e1, V3.dot(w,e1))));
    const al = Math.atan2(dz, V3.len(V3.sub(A1,B1)));
    const arc=[]; for(let i=0;i<=12;i++){ const q=al*i/12; arc.push(V3.add(Bq, V3.add(V3.mul(e1,9*Math.cos(q)), V3.mul(e2,9*Math.sin(q))))); }
    it.push({t:'path',pts:arc,c:'ang',w:2.2});
    it.push({t:'pt',p:Aq,n:t>=0.99?'A₀':'A',c:'nv'},{t:'pt',p:Bq,n:t<0.49?'B':'',c:'txt'},{t:'txt',p:V3.add(Bq,V3.add(V3.mul(e1,15*Math.cos(al/2)),V3.mul(e2,15*Math.sin(al/2)))),n:'α',c:'ang',size:14});
    return it;
  }});
  const txt = host.querySelector('.tri-txt');
  function say(){
    txt.innerHTML = t<0.05 ? `Отрезок <b>AB</b> висит в пространстве, его проекция на пол — <b class="c-p1">A₁B₁</b>. Проведём через B линию, параллельную A₁B₁. Получился <b>прямоугольный треугольник</b>: катет ∥ A₁B₁ (той же длины), вертикальный катет <b class="c-dd">Δz</b> — насколько A выше B, гипотенуза — сам отрезок <b class="c-nv">AB</b>. Угол при B — это угол наклона AB к полу, <b class="c-ang">α</b>.`
      : t<0.5 ? `Опускаем треугольник вниз: катет садится ровно на <b class="c-p1">A₁B₁</b>, а <b class="c-dd">Δz</b> встаёт вертикально над A₁.`
      : t<0.99 ? `Поворачиваем треугольник вокруг A₁B₁, пока он не ляжет на пол — ничего не растягивается, длины и углы сохраняются.`
      : `Лёг! На чертеже это выглядит так: <b class="c-dd">Δz</b> отложен <b>перпендикулярно</b> A₁B₁ из точки A₁ → точка <b>A₀</b>. <b class="c-nv">A₀B₁ = |AB|</b> — натуральная величина, <b class="c-ang">∠A₁B₁A₀ = α</b>. Это и есть метод прямоугольного треугольника.`;
  }
  const inp = host.querySelector('input'), out=host.querySelector('.slider b');
  inp.addEventListener('input',()=>{ t=inp.value/100; out.textContent=inp.value+'%'; sc.render(); say(); });
  say();
};
})();
