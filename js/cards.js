/* Карточки «Дано / Алгоритм» для конструктора оформления. */
(function(){
'use strict';
const NG = window.NG, fmt = NG.fmt;
const {DC, ANG, PL, PLN, DWORD, nk, sub} = NG.K;
let cid = 0;
const C = (zone, text, ok, why, g, r, go)=>({id:'c'+(++cid), zone, text, ok, why, g:g||'', r:r||0, go:go||0});

NG.cardsNV = function(prob, sol){
  const nm = prob.names||['A','B']; const AB = nm[0]+nm[1];
  const find = sol.find, type = sol.type;
  const pn = k=>`${nk(nm[0],k)}${nk(nm[1],k)}`;
  const g = [], a = [];
  g.push(C('given',`[${AB}] (${pn(1)}, ${pn(2)})`,true,'Условие: отрезок задан двумя проекциями.'));
  g.push(C('given',`|${AB}| — ?`,true,'Натуральную величину ищем вместе с углами.'));
  find.forEach(k=>g.push(C('given',`${ANG[k]} = ∠(${AB}, ${PL[k]}) — ?`,true,`Спрашивают угол с ${PL[k]}.`)));
  [1,2,3].filter(k=>!find.includes(k)).slice(0,1).forEach(k=>g.push(C('given',`${ANG[k]} = ∠(${AB}, ${PL[k]}) — ?`,false,`Угол с ${PL[k]} в этой задаче не спрашивают.`)));
  g.push(C('given',`|${AB}| = |${pn(1)}|`,false,'Этого нет в условии. Так было бы только у горизонтали.'));
  const bez = !prob.axes;
  if (type==='ga'||type==='gd'){
    a.push(C('algo','Прямая общего положения → НВ и углы ищем методом прямоугольного треугольника',true,'Первым делом определяем тип прямой: ни одна проекция не ∥ и не ⊥ оси x.','T',0,0));
    find.forEach(k=>{
      const D='Δ'+DC[k], c=DC[k];
      if (k===3 && bez){
        a.push(C('algo',`Катет — Δx = x${sub(nm[0])} − x${sub(nm[1])} (расстояние между линиями связи)`,true,'Для П₃ второй катет — разность широт Δx.','G3',0,1));
        a.push(C('algo',`Гипотенуза — уже найденная |${AB}| (засечка циркулем)`,true,'Профильной проекции нет, поэтому треугольник строим по катету Δx и гипотенузе.','G3',0,1));
        a.push(C('algo',`Второй катет получился = |${pn(3)}|`,true,`В треугольнике для П₃ катеты — |${pn(3)}| и Δx.`,'G3',1,1));
        a.push(C('algo',`γ — угол между гипотенузой и катетом |${pn(3)}| (напротив Δx)`,true,'Угол наклона — между проекцией и гипотенузой.','G3',2,1));
        return;
      }
      let r0 = 0;
      if (k===3){ a.push(C('algo',`Строим профильную проекцию ${pn(3)} (через линию 45°)`,true,'Для угла γ нужен треугольник на П₃, а значит сама проекция на П₃.','G3',0,1)); r0=1; }
      a.push(C('algo',`I катет — [${pn(k)}]`,true,`Треугольник для ${PL[k]} строим на ${PLN[k]} проекции.`,'G'+k,r0,1));
      a.push(C('algo',`II катет — ${D} = ${c}${sub(nm[0])} − ${c}${sub(nm[1])}`,true,`Для ${PL[k]} второй катет — разность ${DWORD[c]}.`,'G'+k,r0,1));
      a.push(C('algo',`|${nm[0]}₀${nk(nm[1],k)}| = |${AB}| (гипотенуза)`,true,'Гипотенуза — натуральная величина.','G'+k,r0+1,1));
      a.push(C('algo',`${ANG[k]} = ∠(${pn(k)}, ${nm[0]}₀${nk(nm[1],k)}) = ∠(${AB}, ${PL[k]})`,true,'Угол между проекцией и гипотенузой = угол наклона к этой плоскости проекций.','G'+k,r0+2,1));
    });
    [1,2,3].filter(k=>!find.includes(k)).forEach(k=>{
      a.push(C('algo',`II катет — Δ${DC[k]} = ${DC[k]}${sub(nm[0])} − ${DC[k]}${sub(nm[1])}`,false,`Δ${DC[k]} нужен только для угла ${ANG[k]} с ${PL[k]}, а его здесь не ищут.`));
    });
    a.push(C('algo',`|${pn(1)}| = |${AB}| — НВ видна сразу`,false,'Так только у горизонтали (A₂B₂ ∥ x). У прямой общего положения любая проекция короче отрезка.'));
    a.push(C('algo','II катет откладываем вдоль проекции (на её продолжении)',false,'Катеты взаимно перпендикулярны: Δ откладываем перпендикулярно проекции.'));
    a.push(C('algo','Угол наклона — между II катетом (Δ) и гипотенузой',false,'Это угол напротив проекции, он равен 90° минус угол наклона. Нужен угол между проекцией и гипотенузой.'));
    if (!find.includes(3)) a.push(C('algo','γ = 0°, т.к. прямая ∥ П₃',false,'Это верно только для профильной прямой. У нас прямая общего положения.'));
  } else if (type==='p'){
    a.push(C('algo','Проекции на одной линии связи → профильная прямая (∥ П₃), γ = 0°',true,'x_A = x_B: прямая параллельна П₃.','T',0,0));
    [1,2].filter(k=>find.includes(k)).forEach(k=>{
      const D='Δ'+DC[k], c=DC[k], other = k===1?2:1;
      a.push(C('algo',`I катет — [${pn(k)}]`,true,`Для ${PL[k]} — ${PLN[k]} проекция.`,'G'+k,0,1));
      a.push(C('algo',`II катет — ${D} = ${c}${sub(nm[0])} − ${c}${sub(nm[1])} (= длина ${pn(other)})`,true,`У профильной прямой ${D} — это вся длина ${pn(other)}.`,'G'+k,0,1));
      a.push(C('algo',`|${nm[0]}₀${nk(nm[1],k)}| = |${AB}|`,true,'Гипотенуза — НВ.','G'+k,1,1));
      a.push(C('algo',`${ANG[k]} = ∠(${pn(k)}, ${nm[0]}₀${nk(nm[1],k)})`,true,'Угол между проекцией и гипотенузой.','G'+k,2,1));
    });
    if (find.includes(1)&&find.includes(2)) a.push(C('algo','Проверка: α + β = 90°',true,'У профильной прямой γ = 0°, поэтому α + β = 90°.','Z',0,9));
    a.push(C('algo',`|${pn(2)}| = |${AB}|, раз проекция вертикальна`,false,'Вертикальность ничего не даёт: A₂B₂ — это только Δz, отрезок ещё уходит в глубину.'));
    a.push(C('algo','Прямая общего положения',false,'Проекции ⊥ оси x (на одной линии связи) — это частное положение: профильная прямая.'));
    a.push(C('algo','γ = 90°',false,'Профильная прямая ∥ П₃, значит γ = 0°.'));
    a.push(C('algo',`II катет — Δx = x${sub(nm[0])} − x${sub(nm[1])}`,false,'Здесь Δx = 0 — точки на одной линии связи.'));
  } else if (type==='h'||type==='f'){
    const kk = type==='h'?1:2, ok2 = type==='h'?2:1;
    a.push(C('algo', type==='h' ? `${pn(2)} ∥ Ox → горизонталь h (∥ П₁)` : `${pn(1)} ∥ Ox → фронталь f (∥ П₂)`, true,'Одна проекция ∥ оси x → прямая уровня.','T',0,0));
    a.push(C('algo',`|${pn(kk)}| = |${AB}| — НВ без построений`,true,'Прямая уровня проецируется в НВ на плоскость, которой параллельна.','N',0,1));
    find.forEach(k=>{
      if (k===kk) a.push(C('algo',`${ANG[k]} = 0°`,true,`Прямая ∥ ${PL[k]}.`,'A'+k,0,2));
      else a.push(C('algo',`${ANG[k]} = ∠(${pn(kk)}, ${k===3?(kk===1?'Oy':'Oz'):'Ox'})`,true,'Угол между НВ-проекцией и осью.','A'+k,0,2));
    });
    a.push(C('algo',`Строим прямоугольный треугольник на ${pn(kk)}`,false,'Не нужно: второй катет был бы 0 — НВ уже видна.'));
    a.push(C('algo',`|${pn(ok2)}| = |${AB}|`,false,`НВ на ${PL[kk]}, а не на ${PL[ok2]}.`));
    a.push(C('algo',`${ANG[ok2]} = 0°`,false,`Прямая не ∥ ${PL[ok2]}.`));
  } else {
    const kk = {hp:1,fp:2,pp:3}[type];
    a.push(C('algo',`Проецирующая прямая (⊥ ${PL[kk]})`,true,NG.TYPES[type].sign,'T',0,0));
    a.push(C('algo',`НВ видна на ${[1,2,3].filter(k=>k!==kk).map(k=>PL[k]).join(' и ')}`,true,'Прямая ∥ двум другим плоскостям.','N',0,1));
    a.push(C('algo',`${ANG[kk]} = 90°, остальные углы 0°`,true,'Перпендикулярна одной плоскости, параллельна двум.','A',0,2));
    a.push(C('algo','Метод прямоугольного треугольника',false,'Не нужен: НВ видна сразу.'));
  }
  return g.concat(a);
};

NG.cardsRev = function(prob, sol){
  const nm = prob.names||['A','B']; const AB=nm[0]+nm[1];
  const U = prob.unknown, uName=U[0], o=+U[1], kName = uName===nm[0]?nm[1]:nm[0], m=3-o;
  const isNV = prob.aplane==='nv', k = isNV?m:prob.aplane;
  const pn = kk=>`${nk(nm[0],kk)}${nk(nm[1],kk)}`;
  const Uo = nk(uName,o);
  const out=[];
  out.push(C('given',`[${AB}] (${pn(m)}, ${nk(kName,o)})`,true,'Условие: одна проекция целиком и одна точка другой.'));
  out.push(C('given', isNV?`|${AB}| = ${fmt(prob.val)} мм`:`${ANG[k]} = ∠(${AB}, ${PL[k]}) = ${prob.val}°`,true,'Данная величина.'));
  out.push(C('given',`${Uo} — ?`,true,'Ищем недостающую проекцию.'));
  out.push(C('given','Сколько решений — ?',true,'В этих задачах всегда спрашивают число решений.'));
  out.push(C('given', isNV?`${ANG[k]} = ${prob.val}°`:`|${AB}| — дано`,false,'Этого нет в условии.'));
  const Dm='Δ'+DC[m], Dk='Δ'+DC[k];
  if (isNV || k===m){
    out.push(C('algo',`I катет — [${pn(m)}]`,true,`${isNV?'НВ':'Угол с '+PL[k]} → треугольник на ${PLN[m]} проекции.`,'S',0,0));
    out.push(C('algo', isNV?`Засечка из ${nk(uName,m)} радиусом |${AB}| на перпендикуляре в ${nk(kName,m)} → ${kName}₀`:`Из ${nk(uName,m)} угол ${ANG[k]} до перпендикуляра в ${nk(kName,m)} → ${kName}₀`,true,'Так строим прямоугольный треугольник по известным данным.','S',1,0));
    out.push(C('algo',`|${nk(kName,m)}${kName}₀| = ${Dm} (II катет)`,true,`Второй катет — разность ${DWORD[DC[m]]}.`,'S',2,0));
    out.push(C('algo',`На линии связи ${uName} откладываем ${Dm} вверх и вниз от уровня ${nk(kName,o)} → ${Uo}, ${Uo}′`,true,`${Dm} виден на ${PLN[o]} проекции как разница по вертикали.`,'S',3,0));
    out.push(C('algo','Ответ: 2 решения',true,'Точка может быть с любой стороны на расстоянии Δ.','S',4,0));
    out.push(C('algo',`${Dm} откладываем от точки ${nk(uName,m)}`,false,`${Dm} переносим на ${PLN[o]} проекцию, от уровня ${nk(kName,o)}.`));
    out.push(C('algo',`I катет — [${pn(o)}]`,false,`Проекции ${pn(o)} ещё нет — её мы и ищем.`));
    out.push(C('algo','Ответ: 1 решение',false,'Δ можно отложить и вверх, и вниз — решений два.'));
  } else {
    out.push(C('algo',`${Dk} берём с ${PLN[m]} проекции`,true,`Для угла с ${PL[k]} нужен ${Dk}, он виден на ${PLN[m]} проекции.`,'S',0,0));
    out.push(C('algo',`Сбоку строим треугольник по катету ${Dk} и углу ${ANG[k]} → второй катет = |${pn(k)}|`,true,`Треугольник для ${PL[k]}: катеты |${pn(k)}| и ${Dk}.`,'S',1,0));
    out.push(C('algo',`Дуга из ${nk(kName,o)} радиусом |${pn(k)}| до линии связи ${uName}`,true,'Длина проекции известна — остаётся найти, где её конец на линии связи.','S',2,0));
    const cnt = sol.count;
    out.push(C('algo',`Ответ: ${cnt===2?'2 решения':cnt===1?'1 решение':'решений нет'}`,true,'Число точек пересечения дуги и линии связи.','S',3,0));
    out.push(C('algo',`I катет — [${pn(m)}], угол ${ANG[k]} при нём`,false,`На ${PLN[m]} проекции строится угол с ${PL[m]}, а не с ${PL[k]}.`));
    out.push(C('algo',`Ответ: ${cnt===2?'1 решение':'2 решения'}`,false,'Посчитай точки пересечения дуги с линией связи.'));
  }
  return out;
};

NG.cardsTri = function(){
  const out=[];
  out.push(C('given','△ABC (A₁B₁C₁, A₂B₂C₂)',true,'Условие.'));
  out.push(C('given','Наименьшая сторона — ?',true,'Что ищем.'));
  out.push(C('given','α, β наименьшей стороны — ?',true,'Что ищем.'));
  out.push(C('given','|AB| = |A₁B₁|',false,'Не дано.'));
  out.push(C('algo','НВ каждой стороны: I катет — её горизонтальная проекция, II катет — Δz',true,'Стандартный треугольник на П₁.','S',0,0));
  out.push(C('algo','Сторона — прямая уровня → НВ видна сразу',true,'Экономит построения.','S',0,0));
  out.push(C('algo','Сравниваем НВ → наименьшая сторона',true,'Сравнивать можно только натуральные величины.','S',1,0));
  out.push(C('algo','α — угол между горизонтальной проекцией и гипотенузой',true,'Треугольник на П₁ даёт α.','S',2,0));
  out.push(C('algo','β: I катет — фронтальная проекция, II катет — Δy',true,'Треугольник на П₂ даёт β.','S',2,0));
  out.push(C('algo','Наименьшая сторона — та, у которой короче проекции',false,'Проекции искажены по-разному — сравнивать можно только НВ.'));
  out.push(C('algo','β — из того же треугольника, что и α',false,'β — угол с П₂, нужен треугольник на фронтальной проекции.'));
  return out;
};

/* проверка порядка: группы (go) и ранги (r); карточки с равными значениями можно менять местами */
NG.checkAlgo = function(seq, cards){
  const byId = {}; cards.forEach(c=>byId[c.id]=c);
  const correct = cards.filter(c=>c.zone==='algo' && c.ok);
  const pos = {}; seq.forEach((id,i)=>pos[id]=i);
  const groups = {};
  correct.forEach(c=>{ (groups[c.g] = groups[c.g]||{go:c.go, items:[]}).items.push(c); });
  const first = g=>Math.min(...groups[g].items.map(c=>pos[c.id]!=null?pos[c.id]:1e9));
  const gorder = Object.keys(groups).sort((a,b)=> groups[a].go-groups[b].go || first(a)-first(b));
  const canon = [];
  gorder.forEach(g=>groups[g].items.slice().sort((a,b)=> a.r-b.r || ((pos[a.id]!=null?pos[a.id]:1e9)-(pos[b.id]!=null?pos[b.id]:1e9))).forEach(c=>canon.push(c.id)));
  const good = c=>c && c.ok && c.zone==='algo';
  const userOk = seq.filter(id=>good(byId[id]));
  const canonP = canon.filter(id=>pos[id]!=null);
  const n=userOk.length, m=canonP.length, L=[];
  for (let i=0;i<=n;i++){ L.push(new Array(m+1).fill(0)); }
  for (let i=n-1;i>=0;i--) for (let j=m-1;j>=0;j--) L[i][j] = userOk[i]===canonP[j] ? L[i+1][j+1]+1 : Math.max(L[i+1][j], L[i][j+1]);
  const inL = new Set(); let i=0,j=0;
  while(i<n&&j<m){ if (userOk[i]===canonP[j]){ inL.add(userOk[i]); i++; j++; } else if (L[i+1][j]>=L[i][j+1]) i++; else j++; }
  const marks = {};
  seq.forEach(id=>{ const c=byId[id]; marks[id] = !good(c) ? 'bad' : (inL.has(id) ? 'ok' : 'pos'); });
  const missing = correct.filter(c=>pos[c.id]==null);
  return {marks, missing, canon};
};
})();
