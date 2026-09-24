/* Конструктор оформления: карточки перетаскиваются (или нажимаются) в блоки «Дано» и «Алгоритм». */
(function(){
'use strict';
const NG = window.NG;

NG.store = NG.store || {
  get(k, d){ try { const v = localStorage.getItem('ng-geo:'+k); return v==null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem('ng-geo:'+k, JSON.stringify(v)); } catch(e){} if (NG.onStore) NG.onStore(k,v); }
};

function hash(s){ let h=2166136261; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
NG.rng = function(seed){ let a = typeof seed==='number'?seed:hash(String(seed)); return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; };
function shuffle(arr, seed){ const r=NG.rng(seed), a=arr.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
NG.shuffle = shuffle;

const ZN = {given:'Дано', algo:'Алгоритм'};

NG.Constructor = function(host, cards, opts){
  opts = opts || {};
  const byId = {}; cards.forEach(c=>byId[c.id]=c);
  const st = {bank: shuffle(cards.map(c=>c.id), opts.key||'k'), given:[], algo:[], active:'given', checked:false, marks:{}};
  const root = document.createElement('div'); root.className='cons';
  host.appendChild(root);
  root.innerHTML = `<div class="cons-top"><h4>🧩 Собери оформление сам</h4><span class="muted" style="font-size:13px">Нажми на карточку — она уйдёт в выделенный блок. Тяни за ⋮⋮, чтобы переставлять.</span></div>
    <div class="cons-grid">
      <div class="zone" data-z="given"><div class="zone-h">Дано <em></em></div><div class="zlist" data-z="given"></div></div>
      <div class="zone" data-z="algo"><div class="zone-h">Алгоритм <em></em></div><div class="zlist" data-z="algo"></div></div>
    </div>
    <div class="bank-wrap"><div class="zone-h">Карточки <em>есть лишние — не всё надо брать!</em></div><div class="bank zlist" data-z="bank"></div></div>
    <div class="cons-foot"><button class="btn pri sm chk" type="button">Проверить</button><button class="btn sm hint" type="button">Подсказка</button><button class="btn sm show" type="button">Показать ответ</button><button class="btn sm rst" type="button">Сбросить</button></div>
    <div class="verdict"></div>`;
  const Z = z=>root.querySelector(`.zlist[data-z="${z}"]`);
  const verdict = root.querySelector('.verdict');

  root.querySelectorAll('.zone').forEach(zn=>zn.querySelector('.zone-h').addEventListener('click',()=>{ st.active = zn.dataset.z; render(); }));

  function moveTo(id, z, idx){
    ['bank','given','algo'].forEach(k=>{ const i=st[k].indexOf(id); if (i>=0) st[k].splice(i,1); });
    const L = st[z];
    if (idx==null || idx>L.length) idx = L.length;
    L.splice(idx,0,id);
    st.checked=false; st.marks={}; verdict.className='verdict';
    render();
  }

  function cardEl(id, z, i){
    const c = byId[id];
    const el = document.createElement('div');
    el.className = 'ccard'; el.dataset.id = id;
    const mk = st.checked ? st.marks[id] : null;
    if (mk) el.classList.add(mk);
    const inZone = z!=='bank';
    const sym = mk==='ok'?'✓':mk==='bad'?'✗':mk==='pos'?'↕':'';
    const btns = inZone ? '<div class="cbtns"><button type="button" data-a="up" title="Выше">↑</button><button type="button" data-a="dn" title="Ниже">↓</button><button type="button" data-a="x" title="Убрать">✕</button></div>' : '';
    el.innerHTML = `<span class="hdl" aria-hidden="true">⋮⋮</span><div class="ctext">${mk?`<span class="mark">${sym}</span>`:''}${z==='algo'?`<span class="cno">${i+1})</span>`:''}${c.text}<div class="cwhy"></div></div>${btns}`;
    if (mk){
      let why = c.why;
      if (mk==='bad' && c.ok && c.zone!==z) why = `Верно, но это для блока «${ZN[c.zone]}».`;
      else if (mk==='bad') why = 'Лишняя: ' + c.why;
      else if (mk==='pos') why = 'Верная мысль, но стоит не на своём месте. ' + (opts.orderHint||'Порядок: сначала тип прямой, потом для каждого угла — I катет → II катет → гипотенуза → угол.');
      el.querySelector('.cwhy').textContent = why;
    }
    el.querySelector('.ctext').addEventListener('click', ()=>{ if (!inZone) moveTo(id, st.active); });
    el.querySelectorAll('.cbtns button').forEach(bt=>bt.addEventListener('click', e=>{
      e.stopPropagation();
      const L = st[z], k = L.indexOf(id);
      if (bt.dataset.a==='x') moveTo(id,'bank');
      else if (bt.dataset.a==='up' && k>0) moveTo(id,z,k-1);
      else if (bt.dataset.a==='dn' && k<L.length-1) moveTo(id,z,k+1);
    }));
    el.querySelector('.hdl').addEventListener('pointerdown', e=>startDrag(e, id, el));
    return el;
  }
  function render(){
    ['given','algo','bank'].forEach(z=>{
      const L = Z(z); L.innerHTML='';
      st[z].forEach((id,i)=>L.appendChild(cardEl(id,z,i)));
      if (!st[z].length){ const e=document.createElement('div'); e.className='zempty'; e.textContent = z==='bank' ? 'Все карточки разобраны.' : (st.active===z ? 'Нажимай на карточки снизу — они попадут сюда.' : 'Нажми на заголовок, чтобы выбрать этот блок.'); L.appendChild(e); }
    });
    root.querySelectorAll('.zone').forEach(zn=>{ const on = zn.dataset.z===st.active; zn.classList.toggle('act', on); zn.querySelector('em').textContent = on ? '● сюда добавляются карточки' : 'нажми, чтобы выбрать'; });
  }

  /* перетаскивание мышью и пальцем — за ручку ⋮⋮ */
  let drag = null;
  function startDrag(e, id, el){
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width = r.width+'px';
    document.body.appendChild(ghost);
    drag = {id, ghost, dx:e.clientX-r.left, dy:e.clientY-r.top, target:null, idx:null};
    el.style.opacity = .35;
    moveGhost(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, {once:true});
    window.addEventListener('pointercancel', onUp, {once:true});
  }
  function moveGhost(e){ drag.ghost.style.left=(e.clientX-drag.dx)+'px'; drag.ghost.style.top=(e.clientY-drag.dy)+'px'; }
  function onMove(e){
    if (!drag) return;
    moveGhost(e);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    root.querySelectorAll('.zone,.bank').forEach(z=>z.classList.remove('over'));
    let list = under && under.closest ? under.closest('.zlist') : null;
    if (!list){ const zn = under && under.closest ? under.closest('.zone') : null; if (zn) list = zn.querySelector('.zlist'); }
    if (!list || !root.contains(list)){ drag.target=null; return; }
    (list.closest('.zone')||list).classList.add('over');
    const kids = [...list.querySelectorAll('.ccard')].filter(k=>k.dataset.id!==drag.id);
    let idx = kids.length;
    for (let i=0;i<kids.length;i++){ const rr=kids[i].getBoundingClientRect(); if (e.clientY < rr.top+rr.height/2){ idx=i; break; } }
    drag.target = list.dataset.z; drag.idx = idx;
    if (e.clientY < 60) window.scrollBy(0,-12); else if (e.clientY > window.innerHeight-60) window.scrollBy(0,12);
  }
  function onUp(){
    window.removeEventListener('pointermove', onMove);
    root.querySelectorAll('.zone,.bank').forEach(z=>z.classList.remove('over'));
    if (!drag) return;
    drag.ghost.remove();
    const d = drag; drag = null;
    if (d.target) moveTo(d.id, d.target, d.idx); else render();
  }

  function check(){
    const marks = {};
    st.given.forEach(id=>{ const c=byId[id]; marks[id] = (c.ok && c.zone==='given') ? 'ok' : 'bad'; });
    const ra = NG.checkAlgo(st.algo, cards);
    Object.assign(marks, ra.marks);
    const missG = cards.filter(c=>c.zone==='given'&&c.ok&&!st.given.includes(c.id));
    const miss = missG.length + ra.missing.length;
    const vals = Object.values(marks);
    const bad = vals.filter(m=>m==='bad').length, pos = vals.filter(m=>m==='pos').length;
    st.checked = true; st.marks = marks;
    render();
    if (!bad && !pos && !miss){
      verdict.className='verdict show good';
      verdict.innerHTML = '🎉 <b>Всё верно!</b> Именно так и оформляй в тетради. Прочитай пояснения под карточками — это объяснение каждой строчки.';
      if (opts.key) NG.store.set('cons:'+opts.key, true);
      if (opts.onSolved) opts.onSolved();
    } else {
      verdict.className='verdict show bad';
      const parts=[];
      if (bad) parts.push(`<b class="c-bad">✗ ${bad}</b> — лишние или не в том блоке`);
      if (pos) parts.push(`<b class="c-warn">↕ ${pos}</b> — верные, но не на своём месте`);
      if (miss) parts.push(`<b>${miss}</b> — ещё не хватает (остались в карточках)`);
      verdict.innerHTML = parts.join('<br>') + '<div class="muted" style="margin-top:6px;font-size:13px">Под каждой карточкой — объяснение. Исправь и проверь ещё раз.</div>';
    }
  }
  function hint(){
    const missG = cards.filter(c=>c.zone==='given'&&c.ok&&!st.given.includes(c.id));
    const ra = NG.checkAlgo(st.algo, cards);
    const wrong = st.given.concat(st.algo).find(id=>{ const c=byId[id]; return !c.ok || (st.given.includes(id)&&c.zone!=='given') || (st.algo.includes(id)&&c.zone!=='algo'); });
    verdict.className='verdict show bad';
    if (wrong) verdict.innerHTML = `💡 Присмотрись к карточке «${byId[wrong].text}» — она здесь лишняя или не в том блоке.`;
    else if (missG.length) verdict.innerHTML = `💡 В «Дано» не хватает: «${missG[0].text}».`;
    else if (ra.missing.length){ const c = ra.missing.slice().sort((a,b)=>a.go-b.go||a.r-b.r)[0]; verdict.innerHTML = `💡 В алгоритме не хватает: «${c.text}».`; }
    else verdict.innerHTML = '💡 Все нужные карточки на месте — нажми «Проверить», чтобы проверить порядок.';
  }
  function showAns(){
    st.bank = cards.filter(c=>!c.ok).map(c=>c.id);
    st.given = cards.filter(c=>c.ok&&c.zone==='given').map(c=>c.id);
    st.algo = NG.checkAlgo([], cards).canon.slice();
    check();
    verdict.className='verdict show good';
    verdict.innerHTML = '👀 Вот правильное оформление. Потом попробуй собрать сам — нажми «Сбросить».';
  }
  root.querySelector('.chk').onclick = check;
  root.querySelector('.hint').onclick = hint;
  root.querySelector('.show').onclick = showAns;
  root.querySelector('.rst').onclick = ()=>{ st.bank = shuffle(cards.map(c=>c.id), (opts.key||'k')+Math.random()); st.given=[]; st.algo=[]; st.checked=false; st.marks={}; verdict.className='verdict'; render(); };
  render();
  return {root};
};
})();
