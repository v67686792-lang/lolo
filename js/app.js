/* Сборка страницы: навигация, прогресс, виджеты, задачи, тренажёр, пробный зачёт. */
(function(){
'use strict';
const NG = window.NG, G = NG.G, fmt = NG.fmt;
const {ANG, PL} = NG.K;
const $ = (s,r)=>(r||document).querySelector(s);
const $$ = (s,r)=>[...(r||document).querySelectorAll(s)];
const h = (tag, cls, html)=>{ const e=document.createElement(tag); if (cls) e.className=cls; if (html!=null) e.innerHTML=html; return e; };
const clone = o=>JSON.parse(JSON.stringify(o));

/* ---------- тема, меню ---------- */
$('.themebtn').onclick = ()=>{ const l = document.documentElement.classList.toggle('light'); NG.store.set('theme', l?'light':'dark'); };
$('.navbtn').onclick = ()=>document.body.classList.toggle('navopen');
$('.navshade').onclick = ()=>document.body.classList.remove('navopen');
$$('.toc a').forEach(a=>a.addEventListener('click',()=>document.body.classList.remove('navopen')));
const secs = $$('main .sec');
if (window.IntersectionObserver){
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if (e.isIntersecting){ $$('.toc a.ti').forEach(a=>a.classList.toggle('on', a.getAttribute('href')==='#'+e.target.id)); } }), {rootMargin:'-45% 0px -50% 0px'});
  secs.forEach(s=>io.observe(s));
}

/* ---------- прогресс ---------- */
const ALL = [].concat(NG.HW.map(t=>'hw'+t.id), NG.PRAC_NV.map(t=>t.id), NG.PRAC_REV.map(t=>t.id), NG.PRAC_TRI.map(t=>t.id));
function progress(){
  const n = ALL.filter(id=>NG.store.get('done:'+id,false)).length;
  $('.prog-n').textContent = n; $('.prog-t').textContent = ALL.length;
  $('.prog .bar i').style.width = (100*n/ALL.length)+'%';
  $$('[data-done]').forEach(el=>el.classList.toggle('done', !!NG.store.get('done:'+el.dataset.done,false)));
}
NG.onStore = (k)=>{ if (k.indexOf('done:')===0) progress(); };
const markDone = id=>{ if (!NG.store.get('done:'+id,false)) NG.store.set('done:'+id,true); };
progress();

/* ---------- ленивые виджеты ---------- */
const W = {};
function mount(el){ if (el.dataset.mounted) return; el.dataset.mounted='1'; const f=W[el.dataset.w]; if (f) try { f(el); } catch(err){ console.error(err); el.innerHTML='<div class="idea err">Ошибка виджета: '+err.message+'</div>'; } }

/* ---------- панель задачи: разбор / оформление / ответ ---------- */
function taskPanel(host, prob, kind, opts){
  opts = opts||{};
  const p = clone(prob);
  let sol, cards;
  if (kind==='nv'){ sol = NG.solveNV(p); cards = NG.cardsNV(p, sol); }
  else if (kind==='rev'){ sol = NG.solveReverse(p); cards = NG.cardsRev(p, sol); }
  else { sol = NG.solveTri(p); cards = NG.cardsTri(); }
  const doneId = opts.doneId;
  const tabs = h('div','tabs');
  const panes = h('div');
  const names = [['steps','▶ Разбор по шагам'],['cons','🧩 Оформление'],['ans','✍️ Мой ответ']];
  const made = {};
  names.forEach(([k,l],i)=>{ const b=h('button',i?'':'on',l); b.type='button'; b.onclick=()=>show(k); b.dataset.k=k; tabs.appendChild(b); });
  host.appendChild(tabs); host.appendChild(panes);
  const pane = {};
  names.forEach(([k])=>{ pane[k]=h('div'); pane[k].style.display='none'; panes.appendChild(pane[k]); });
  function show(k){
    $$('button',tabs).forEach(b=>b.classList.toggle('on', b.dataset.k===k));
    Object.keys(pane).forEach(x=>pane[x].style.display = x===k?'':'none');
    if (made[k]) { if (k==='steps') made.steps.fig.refresh(); return; }
    made[k] = true;
    if (k==='steps'){
      made.steps = NG.Player(pane.steps, sol.steps, {onStep:(i,n)=>{ if (i===n-1 && doneId) markDone(doneId); }});
    } else if (k==='cons'){
      NG.Constructor(pane.cons, cards, {key:(opts.key||doneId||'x'), onSolved:()=>{ if (doneId) markDone(doneId); }, orderHint: kind==='rev' ? 'Порядок: треугольник → Δ (или длина проекции) → перенос на линию связи → ответ.' : kind==='tri' ? 'Порядок: НВ сторон → сравнение → углы.' : null});
    } else answerPane(pane.ans, kind, p, sol, opts, doneId);
  }
  show('steps');
  return {sol, show};
}

function answerPane(host, kind, p, sol, opts, doneId){
  const box = h('div','card');
  host.appendChild(box);
  if (kind==='nv'){
    const fields = [];
    if (!opts.hw) fields.push(['nv','|AB|, мм', sol.M.NV, Math.max(2, sol.M.NV*0.04)]);
    sol.find.forEach(k=>fields.push(['a'+k, ANG[k]+', °', sol.ang[k], 3]));
    box.innerHTML = `<p style="margin-top:0">Реши на листе, измерь и впиши. ${opts.hw?'<span class="muted">НВ не спрашиваем: она зависит от масштаба твоего листа. Углы — нет.</span>':'Допуск: НВ ±4%, углы ±3°.'}</p><div class="answer">${fields.map(f=>`<label>${f[1]}<input inputmode="decimal" data-f="${f[0]}" autocomplete="off"></label>`).join('')}<button class="btn pri sm" type="button">Проверить</button></div><div class="res"></div>`;
    $('button',box).onclick = ()=>{
      let ok=0; const lines=[];
      fields.forEach(([id,label,val,tol])=>{
        const inp = $(`input[data-f="${id}"]`,box); const v = parseFloat((inp.value||'').replace(',','.'));
        const good = isFinite(v) && Math.abs(v-val) <= tol;
        inp.classList.toggle('ok',good); inp.classList.toggle('bad',!good);
        if (good) ok++;
        lines.push(`${label.split(',')[0]}: ${isFinite(v)?fmt(v):'—'} ${good?'✅':'❌'} <span class="muted">(верно ≈ ${fmt(val, id==='nv'?1:0)})</span>`);
      });
      const all = ok===fields.length;
      $('.res',box).innerHTML = lines.join('<br>') + (all?'<p class="c-good"><b>Отлично! Всё сходится.</b></p>':'<p class="muted">Если не сошлось — открой «Разбор по шагам» и сравни свой чертёж с каждым шагом.</p>');
      if (all && doneId) markDone(doneId);
    };
  } else if (kind==='rev'){
    box.innerHTML = `<p style="margin-top:0">Сколько решений получилось у тебя?</p><div class="answer"><label>Число решений<select data-f="n" style="padding:9px;border-radius:10px;background:var(--panel2);color:var(--text);border:1px solid var(--line2)"><option value="">—</option><option>0</option><option>1</option><option>2</option></select></label><button class="btn pri sm" type="button">Проверить</button></div><div class="res"></div>`;
    $('button',box).onclick = ()=>{
      const v = $('select',box).value; const good = v!=='' && +v===sol.count;
      let extra = sol.Lk!=null ? `Длина недостающей проекции ≈ ${fmt(sol.Lk)} мм, расстояние до линии связи ≈ ${fmt(sol.h)} мм.` : `Δ ≈ ${fmt(sol.d)} мм.`;
      $('.res',box).innerHTML = (good?'✅ <b>Верно!</b> ':'❌ Правильно: <b>'+sol.count+'</b>. ') + `<span class="muted">${extra}</span>`;
      if (good && doneId) markDone(doneId);
    };
  } else {
    box.innerHTML = `<p style="margin-top:0">Какая сторона наименьшая и её углы?</p><div class="answer"><label>Сторона<select data-f="s" style="padding:9px;border-radius:10px;background:var(--panel2);color:var(--text);border:1px solid var(--line2)"><option value="">—</option><option>AB</option><option>BC</option><option>AC</option></select></label><label>НВ, мм<input data-f="nv" inputmode="decimal"></label><label>α, °<input data-f="a" inputmode="decimal"></label><label>β, °<input data-f="b" inputmode="decimal"></label><button class="btn pri sm" type="button">Проверить</button></div><div class="res"></div>`;
    $('button',box).onclick = ()=>{
      const M = sol.M; const s=$('select',box).value;
      const chk=(id,val,tol)=>{ const i=$(`input[data-f="${id}"]`,box), v=parseFloat((i.value||'').replace(',','.')); const g=isFinite(v)&&Math.abs(v-val)<=tol; i.classList.toggle('ok',g); i.classList.toggle('bad',!g); return g; };
      const r=[s===sol.min, chk('nv',M.NV,Math.max(2,M.NV*.04)), chk('a',M.a,3), chk('b',M.b,3)];
      $('.res',box).innerHTML = `Сторона: ${r[0]?'✅':'❌'} (${sol.min}) · НВ ${r[1]?'✅':'❌'} (≈ ${fmt(M.NV)}) · α ${r[2]?'✅':'❌'} (≈ ${fmt(M.a,0)}°) · β ${r[3]?'✅':'❌'} (≈ ${fmt(M.b,0)}°)`;
      if (r.every(Boolean) && doneId) markDone(doneId);
    };
  }
}

/* ---------- список задач с раскрывающейся панелью ---------- */
function taskList(host, list, kindOf, opts){
  opts = opts||{};
  const grid = h('div','tasks'); host.appendChild(grid);
  const panel = h('div','tpanel'); panel.style.display='none'; host.appendChild(panel);
  let openId = null;
  list.forEach(t=>{
    const kind = kindOf(t);
    const id = (opts.prefix||'')+t.id;
    const card = h('button','tcard'+(t.mine?' mine':'')); card.type='button'; card.dataset.done = id;
    card.innerHTML = `<div class="tno"><span>${opts.label?opts.label(t):t.id}</span>${t.mine?'<em>мой вариант</em>':''}</div><div class="thumb"></div><div class="tq">${t.short || t.title || shortQ(t)}</div>`;
    grid.appendChild(card);
    requestAnimationFrame(()=>{
      const pr = clone(t); if (kind==='nv' && pr.axes && (pr.find||[]).includes(3)) pr.show3 = true;
      const els = kind==='tri' ? NG.solveTri(pr).steps[0].els : NG.U.baseScene(pr).els;
      NG.Fig($('.thumb',card), {els, grid:false, pad:9, maxH:150, k:0.8});
    });
    card.onclick = ()=>{
      if (openId===id){ panel.style.display='none'; openId=null; card.classList.remove('on'); return; }
      $$('.tcard',grid).forEach(c=>c.classList.remove('on')); card.classList.add('on');
      openId = id; panel.innerHTML=''; panel.style.display='';
      const head = h('div','tpanel-h');
      head.innerHTML = `<div><h3>${opts.label?opts.label(t):t.id}${t.title&&!opts.label?'':''} ${t.title&&opts.label?'':''}</h3><p style="margin:6px 0 0">${t.q||t.title||''}</p>${t.ctext?`<p class="mono" style="margin:6px 0 0">${t.ctext}</p>`:''}</div><button class="btn sm" type="button">✕ закрыть</button>`;
      $('button',head).onclick = ()=>card.click();
      panel.appendChild(head);
      if (t.note){ const n=h('div','',t.note); panel.appendChild(n); }
      taskPanel(panel, t, kind, {doneId:id, key:id, hw:opts.hw});
      setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),60);
    };
  });
  progress();
}
function shortQ(t){
  if (t.rev) return `Найти ${NG.nk(t.unknown[0],+t.unknown[1])}, ${t.aplane==='nv'?'дана НВ':ANG[t.aplane]+' = '+t.val+'°'}`;
  return 'НВ и углы ' + t.find.map(k=>ANG[k]).join(', ');
}

/* ================= виджеты ================= */
W.map = function(el){
  const grid = h('div','map'); el.appendChild(grid);
  const panel = h('div','card mpanel','<p class="muted" style="margin:0">Выбери блок на карте ↑</p>'); el.appendChild(panel);
  NG.MAP.forEach((m,i)=>{
    const b = h('button','mnode'+(m.goal?' goal':''), `<span class="mn">${m.n}${m.exam?' · НА ЗАЧЁТЕ':''}</span><b>${m.t}</b><small>${m.s}</small>`);
    b.type='button';
    b.onclick = ()=>{ $$('.mnode',grid).forEach(x=>x.classList.remove('on')); b.classList.add('on');
      const prev = NG.MAP[i-1], next = NG.MAP[i+1];
      panel.innerHTML = `<h4>${m.t}</h4><p>${m.d}</p><p class="muted" style="font-size:14px">${prev?'⬅ опирается на: <b>'+prev.t+'</b>':''}${prev&&next?' · ':''}${next?'➡ ведёт к: <b>'+next.t+'</b>':''}</p><a class="btn sm pri" href="#${m.to}">Перейти к разделу →</a>`; };
    grid.appendChild(b);
  });
};
W.point = el=>NG.widgetPoint(el);
W.lab = el=>NG.widgetLineLab(el);
W.tri3d = el=>NG.widgetTri3D(el);

W['ex-p3'] = function(el){
  const A={x:50,y:25,z:35};
  const a1=[-A.x,A.y], a2=[-A.x,-A.z], a3=[A.y,-A.z], k=[A.y,A.y];
  const axes = NG.U.axesEls([{x:62,y:34,z:42}],true);
  const steps = [
    {title:'Дано: A₁ и A₂', els:axes.concat([{t:'seg',a:a1,b:a2,c:'link',w:'link'},{t:'pt',p:a2,n:'A₂',c:'p2',lp:[-1,-1]},{t:'pt',p:a1,n:'A₁',c:'p1',lp:[-1,1]}]),
      html:'<p>Известны две проекции точки A. Они на одной линии связи, ⊥ оси x. Нужно построить профильную проекцию <b class="c-p3">A₃</b>.</p>'},
    {title:'Высота та же', els:[{t:'seg',a:a2,b:[A.y+12,-A.z],c:'aux',w:'aux'}],
      html:'<p>A₃ и A₂ показывают одну и ту же высоту z. Поэтому A₃ лежит на <b>горизонтальной линии связи</b>, проведённой через A₂ (⊥ оси z).</p>'},
    {title:'Глубину берём с П₁', els:[{t:'seg',a:a1,b:k,c:'aux',w:'aux'},{t:'dim',a:[-A.x-4,0],b:[-A.x-4,A.y],c:'dd',n:'y',side:-1}],
      html:'<p>Глубина y видна на горизонтальной проекции — это расстояние от A₁ до оси x. Ведём от A₁ горизонталь до <b>линии 45°</b>.</p>'},
    {title:'Поворачиваем вверх → A₃', els:[{t:'seg',a:k,b:a3,c:'aux',w:'aux'},{t:'pt',p:a3,n:'A₃',c:'p3',lp:[1,-1]}],
      html:'<p>От линии 45° поднимаемся вертикально до горизонтали из A₂. Пересечение — <b class="c-p3">A₃</b>.</p>'},
    {title:'Проверка', els:[{t:'dim',a:[0,-A.z-5],b:[A.y,-A.z-5],c:'dd',n:'y',side:1}],
      html:'<p>Расстояние от A₃ до оси z равно y — тому же, что и от A₁ до оси x. Всё сходится: <b class="c-p3">A₃(y; z)</b>.</p>'}
  ];
  NG.Player(el, steps);
};
W['ex-tri'] = function(el){
  const t = NG.PRAC_NV.find(x=>x.id==='n2');
  el.appendChild(h('p','mono',`A(${t.A.x}; ${t.A.y}; ${t.A.z}), B(${t.B.x}; ${t.B.y}; ${t.B.z}) — найти |AB|, α, β, γ`));
  taskPanel(el, t, 'nv', {doneId:'n2', key:'ex-n2'});
};
W['rev-ex1'] = function(el){ const t=NG.PRAC_REV.find(x=>x.id==='r1'); el.appendChild(h('p','mono',t.ctext)); taskPanel(el, t, 'rev', {doneId:'r1', key:'ex-r1'}); };
W['rev-ex2'] = function(el){ const t=NG.PRAC_REV.find(x=>x.id==='r4'); el.appendChild(h('p','mono',t.ctext)); taskPanel(el, t, 'rev', {doneId:'r4', key:'ex-r4'}); };

W.hw = function(el){
  taskList(el, NG.HW, t=>t.rev?'rev':'nv', {prefix:'hw', hw:true, label:t=>t.id});
};

/* ---------- нарешка ---------- */
W['prac-tabs'] = function(el){
  const host = $('[data-w="prac"]');
  const tabs = [['drill','🔎 Тип прямой'],['nv','📏 НВ и углы'],['rev','↕ Обратные'],['tri','△ Треугольник'],['gen','🎲 Генератор']];
  const panes = {};
  tabs.forEach(([k,l],i)=>{
    const b = h('button',i?'':'on',l); b.type='button'; b.dataset.k=k; el.appendChild(b);
    panes[k] = h('div'); panes[k].style.display = i?'none':''; host.appendChild(panes[k]);
    b.onclick = ()=>{ $$('button',el).forEach(x=>x.classList.toggle('on',x===b)); Object.keys(panes).forEach(x=>panes[x].style.display = x===k?'':'none'); build(k); };
  });
  const built = {};
  function build(k){
    if (built[k]) return; built[k]=true;
    const p = panes[k];
    if (k==='drill') drill(p);
    if (k==='nv'){ p.appendChild(h('p','muted','Уровни: ● — разминка, ●● — как на зачёте, ●●● — с подвохом. Координаты в мм: перерисуй условие на лист в клетку.')); taskList(p, NG.PRAC_NV, ()=> 'nv', {label:t=>'●'.repeat(t.lvl)+' '+t.title}); }
    if (k==='rev'){ taskList(p, NG.PRAC_REV, ()=>'rev', {label:t=>t.title}); }
    if (k==='tri'){ taskList(p, NG.PRAC_TRI, ()=>'tri', {label:t=>t.title}); }
    if (k==='gen') generator(p);
  }
  build('drill');
};
W.prac = function(){};

function drill(host){
  const box = h('div'); host.appendChild(box);
  let score = NG.store.get('drill', {ok:0, all:0});
  function next(){
    box.innerHTML='';
    const type = NG.TYPE_ORDER[Math.floor(Math.random()*NG.TYPE_ORDER.length)];
    const seg = NG.randSeg(type);
    const top = h('div','cons-top'); top.innerHTML = `<h4>Что это за прямая?</h4><span class="score">Верно: <b>${score.ok}</b> из ${score.all}</span>`;
    box.appendChild(top);
    const figHost = h('div'); box.appendChild(figHost);
    const draw = (p3)=>{ figHost.innerHTML=''; const base=NG.U.baseScene({A:seg.A,B:seg.B,axes:true,show3:p3}); const els=base.els.slice(); if (p3){ const S=base.S; [[seg.A,S.a1,S.a2,S.a3],[seg.B,S.b1,S.b2,S.b3]].forEach(([P,p1,p2,q])=>els.push({t:'seg',a:p2,b:q,c:'link',w:'link'},{t:'seg',a:p1,b:[P.y,P.y],c:'link',w:'link'},{t:'seg',a:[P.y,P.y],b:q,c:'link',w:'link'})); if (G.dist(S.a3,S.b3)>0.5) els.push({t:'seg',a:S.a3,b:S.b3,c:'p3'}); els.push(...NG.U.mergePts([{p:S.a3,n:'A₃',c:'p3',others:[S.b3,S.a2]},{p:S.b3,n:'B₃',c:'p3',others:[S.a3,S.b2]}])); } NG.Fig(figHost,{els,maxH:380}); };
    draw(false);
    const tg = h('button','btn sm','Показать профильную проекцию'); tg.type='button'; let p3=false; tg.onclick=()=>{ p3=!p3; tg.textContent = p3?'Скрыть профильную проекцию':'Показать профильную проекцию'; draw(p3); };
    box.appendChild(h('div','vbtns')).appendChild(tg);
    const opts = h('div','opts'); box.appendChild(opts);
    const fb = h('div'); box.appendChild(fb);
    NG.TYPE_ORDER.forEach(k=>{
      const b = h('button','opt', NG.TYPES[k].icon+' '+NG.TYPES[k].name); b.type='button';
      b.onclick = ()=>{
        if (opts.dataset.done) return; opts.dataset.done='1';
        const good = k===type;
        b.classList.add(good?'ok':'bad');
        $$('.opt',opts).forEach((x,i)=>{ if (NG.TYPE_ORDER[i]===type) x.classList.add('ok'); });
        const T = NG.TYPES[type];
        fb.innerHTML = `<div class="idea ${good?'good':'err'}">${good?'<b>Верно!</b>':'<b>Не то.</b> Это — '+T.name+'.'} ${T.sign}</div>`;
        propsQuiz(fb, type, good);
      };
      opts.appendChild(b);
    });
  }
  function propsQuiz(fb, type, typeOk){
    const T = NG.TYPES[type];
    const r = NG.rng(Math.random()*1e9|0);
    const tru = NG.shuffle(T.props, r()*1e9|0).slice(0,4), fal = NG.shuffle(T.fprops, r()*1e9|0).slice(0,3);
    const items = NG.shuffle(tru.map(s=>({s,ok:true})).concat(fal.map(s=>({s,ok:false}))), r()*1e9|0);
    const card = h('div','card'); card.innerHTML = '<h4>Теперь опиши свойства: отметь все верные</h4>';
    const chips = h('div','chips'); card.appendChild(chips);
    items.forEach(it=>{ const c=h('button','chip',it.s); c.type='button'; c.onclick=()=>{ if (!card.dataset.done) c.classList.toggle('sel'); }; it.el=c; chips.appendChild(c); });
    const row = h('div','cons-foot'); const chk=h('button','btn pri sm','Проверить свойства'); chk.type='button'; const nx=h('button','btn sm','Следующая прямая →'); nx.type='button'; row.appendChild(chk); row.appendChild(nx); card.appendChild(row);
    const res = h('div','res'); card.appendChild(res);
    chk.onclick = ()=>{
      if (card.dataset.done) return; card.dataset.done='1';
      let all=true;
      items.forEach(it=>{ const sel=it.el.classList.contains('sel'); it.el.classList.remove('sel'); if (sel&&it.ok) it.el.classList.add('ok'); else if (sel&&!it.ok){ it.el.classList.add('bad'); all=false; } else if (!sel&&it.ok){ it.el.classList.add('miss'); all=false; } });
      score.all++; if (all && typeOk) score.ok++; NG.store.set('drill', score);
      res.innerHTML = (all?'<b class="c-good">Свойства верно!</b> ':'<b class="c-warn">Почти.</b> Зелёные — верно отмечены, красные — лишние, пунктир — пропущены. ') + `<div class="muted" style="margin-top:6px">Полный ответ: <b>${T.name}</b>. ${T.props.join('; ')}.</div>`;
    };
    nx.onclick = next;
    fb.appendChild(card);
  }
  next();
}

function randomNV(){
  const r = Math.random();
  const type = r<0.7 ? (Math.random()<.5?'ga':'gd') : r<0.8 ? 'p' : r<0.9 ? 'h' : 'f';
  const seg = NG.randSeg(type);
  const finds = type==='p' ? [[1,2]] : [[1,2],[1,2],[1],[2],[1,2,3],[3],[1,3],[2,3]];
  const find = finds[Math.floor(Math.random()*finds.length)];
  return {id:'g'+Date.now(), A:seg.A, B:seg.B, find, axes:true, coords:true};
}
function generator(host){
  host.appendChild(h('p','muted','Каждый раз новый отрезок с целыми координатами. Реши, впиши ответ — потом смотри разбор.'));
  const bt = h('button','btn pri','🎲 Новая задача'); bt.type='button'; host.appendChild(bt);
  const box = h('div','tpanel'); host.appendChild(box);
  function gen(){ box.innerHTML=''; const t=randomNV(); box.appendChild(h('p','mono',`A(${t.A.x}; ${t.A.y}; ${t.A.z}), B(${t.B.x}; ${t.B.y}; ${t.B.z}) — найти |AB|, ${t.find.map(k=>ANG[k]).join(', ')}`)); taskPanel(box, t, 'nv', {key:t.id}); }
  bt.onclick = gen; gen();
}

/* ---------- пробный зачёт ---------- */
W.exam = function(el){
  el.innerHTML = `<div class="card"><p style="margin-top:0">Две задачи, как на КР. Решай на листе, отвечай здесь. Таймер — просто для ориентира (дай себе 30–40 минут).</p><button class="btn pri" type="button">Начать пробный зачёт</button></div><div class="ex-body"></div>`;
  const body = $('.ex-body',el);
  $('button',el).onclick = start;
  let timer=null;
  function start(){
    clearInterval(timer);
    body.innerHTML='';
    const t0 = Date.now();
    const tm = h('div','score'); body.appendChild(tm);
    timer = setInterval(()=>{ const s=Math.floor((Date.now()-t0)/1000); tm.innerHTML = `⏱ <b>${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</b>`; },1000);
    const t1type = NG.TYPE_ORDER[Math.floor(Math.random()*8)];
    const s1 = NG.randSeg(t1type);
    const t2 = randomNV(); const g2 = NG.randSeg(Math.random()<.5?'ga':'gd'); t2.A=g2.A; t2.B=g2.B; t2.find=[1,2];
    const c1 = h('div','card'); c1.innerHTML = '<h4>Задача 1. Определи положение прямой и опиши её свойства</h4>'; body.appendChild(c1);
    const f1 = h('div'); c1.appendChild(f1); NG.Fig(f1,{els:NG.U.baseScene({A:s1.A,B:s1.B,axes:true}).els, maxH:360});
    const sel = h('select'); sel.style.cssText='padding:10px;border-radius:10px;background:var(--panel2);color:var(--text);border:1px solid var(--line2);margin:10px 0;max-width:100%';
    sel.innerHTML = '<option value="">— выбери тип —</option>' + NG.TYPE_ORDER.map(k=>`<option value="${k}">${NG.TYPES[k].name}</option>`).join('');
    c1.appendChild(sel);
    const T = NG.TYPES[t1type];
    const allProps = NG.shuffle(T.props.slice(0,4).map(s=>({s,ok:true})).concat(T.fprops.slice(0,3).map(s=>({s,ok:false}))), Date.now()%1000);
    c1.appendChild(h('p','muted','Отметь верные свойства:'));
    const chips = h('div','chips'); c1.appendChild(chips);
    allProps.forEach(it=>{ const c=h('button','chip',it.s); c.type='button'; c.onclick=()=>c.classList.toggle('sel'); it.el=c; chips.appendChild(c); });
    const c2 = h('div','card'); c2.innerHTML = `<h4>Задача 2. Найди НВ отрезка и углы α, β</h4><p class="mono">A(${t2.A.x}; ${t2.A.y}; ${t2.A.z}), B(${t2.B.x}; ${t2.B.y}; ${t2.B.z})</p>`; body.appendChild(c2);
    const f2 = h('div'); c2.appendChild(f2); NG.Fig(f2,{els:NG.U.baseScene({A:t2.A,B:t2.B,axes:true}).els, maxH:360});
    const M = NG.measure(t2.A,t2.B);
    const ans = h('div','answer', `<label>|AB|, мм<input data-f="nv" inputmode="decimal"></label><label>α, °<input data-f="a" inputmode="decimal"></label><label>β, °<input data-f="b" inputmode="decimal"></label>`); c2.appendChild(ans);
    const sub = h('button','btn pri','Сдать работу'); sub.type='button'; body.appendChild(sub);
    const out = h('div'); body.appendChild(out);
    sub.onclick = ()=>{
      clearInterval(timer);
      let pts = 0;
      const typeOk = sel.value===t1type; if (typeOk) pts++;
      let propsOk = true;
      allProps.forEach(it=>{ const s=it.el.classList.contains('sel'); it.el.classList.remove('sel'); if (s&&it.ok) it.el.classList.add('ok'); else if (s&&!it.ok){ it.el.classList.add('bad'); propsOk=false; } else if (!s&&it.ok){ it.el.classList.add('miss'); propsOk=false; } });
      if (propsOk) pts++;
      const chk=(id,val,tol)=>{ const i=$(`input[data-f="${id}"]`,ans), v=parseFloat((i.value||'').replace(',','.')); const g=isFinite(v)&&Math.abs(v-val)<=tol; i.classList.toggle('ok',g); i.classList.toggle('bad',!g); return g; };
      const r2 = [chk('nv',M.NV,Math.max(2,M.NV*.04)), chk('a',M.a,3), chk('b',M.b,3)];
      pts += r2.filter(Boolean).length;
      out.innerHTML = `<div class="idea ${pts>=4?'good':'warn'}"><b>Итог: ${pts} из 5.</b> Задача 1: тип ${typeOk?'✅':'❌ ('+T.name+')'}, свойства ${propsOk?'✅':'❌'}. Задача 2: НВ ${r2[0]?'✅':'❌'} (≈ ${fmt(M.NV)} мм), α ${r2[1]?'✅':'❌'} (≈ ${fmt(M.a,0)}°), β ${r2[2]?'✅':'❌'} (≈ ${fmt(M.b,0)}°).</div><h3>Разбор задачи 1</h3><div class="card"><p><b>${T.name}</b>. ${T.sign}</p><p><b>Свойства:</b> ${T.props.join('; ')}.</p></div><h3>Разбор задачи 2</h3>`;
      const sHost = h('div'); out.appendChild(sHost);
      NG.Player(sHost, NG.solveNV(clone(t2)).steps);
      sub.disabled = true;
    };
  }
};

/* ---------- шпаргалка и карточки ---------- */
W.cheat = function(el){
  const rows = NG.TYPE_ORDER.filter(k=>k!=='gd').map(k=>{ const T=NG.TYPES[k]; return `<tr><td><b>${k==='ga'?'Общего положения':T.name}</b></td><td>${k==='ga'?'Ни одна проекция не ∥ и не ⊥ оси x':T.sign}</td><td>${T.nv}</td><td>${k==='ga'?'Восходящая / нисходящая; все проекции короче НВ; 0° < α, β, γ < 90°':T.props.slice(2).join('; ')}</td></tr>`; }).join('');
  el.innerHTML = `<div class="card"><div class="tscroll"><table class="t"><tr><th>Прямая</th><th>Признак на КЧ</th><th>Где НВ</th><th>Свойства</th></tr>${rows}</table></div></div>
  <div class="card"><h4>Метод прямоугольного треугольника</h4><div class="tscroll"><table class="t"><tr><th>Угол</th><th>I катет</th><th>II катет</th><th>Откуда II катет</th></tr>
  <tr><td class="c-ang">α (П₁)</td><td class="c-p1">A₁B₁</td><td class="c-dd">Δz</td><td>фронтальная проекция, по вертикали</td></tr>
  <tr><td class="c-ang">β (П₂)</td><td class="c-p2">A₂B₂</td><td class="c-dd">Δy</td><td>горизонтальная проекция, по вертикали</td></tr>
  <tr><td class="c-ang">γ (П₃)</td><td class="c-p3">A₃B₃</td><td class="c-dd">Δx</td><td>между линиями связи, по горизонтали</td></tr></table></div>
  <p>Гипотенуза = <b class="c-nv">НВ</b>. Угол наклона — <b>между проекцией и гипотенузой</b>. Δ — координата, которой нет у проекции.</p></div>`;
};
W.flash = function(el){
  const g = h('div','flash'); el.appendChild(g);
  NG.FLASH.forEach(([q,a],i)=>{
    const c = h('button','fc',`<div class="fc-in"><div class="fc-f"><small>Вопрос ${i+1}</small><b>${q}</b><span class="muted" style="margin-top:auto;font-size:12px">нажми, чтобы перевернуть</span></div><div class="fc-b"><small>Ответ</small>${a}</div></div>`);
    c.type='button'; c.onclick=()=>c.classList.toggle('flip'); g.appendChild(c);
  });
};

/* ---------- монтирование ---------- */
const holders = $$('[data-w]');
if (window.IntersectionObserver){
  const io = new IntersectionObserver(es=>es.forEach(e=>{ if (e.isIntersecting){ mount(e.target); io.unobserve(e.target); } }), {rootMargin:'400px 0px'});
  holders.forEach(x=>io.observe(x));
} else holders.forEach(mount);
/* переход по якорю к ленивому разделу */
window.addEventListener('hashchange',()=>{ const s=$(location.hash); if (s) $$('[data-w]',s).forEach(mount); });
NG.mountAll = ()=>holders.forEach(mount);
})();
