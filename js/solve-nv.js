/* Решение «натуральная величина + углы наклона» — пошагово. */
(function(){
'use strict';
const NG = window.NG, G = NG.G, fmt = NG.fmt;
const {COL, DC, ANG, PL, PLN, DWORD, nk, b, sub} = NG.K;
const {awayDir, mergePts, outText, sideFor, baseScene, measureEls, triangleEls} = NG.U;

NG.solveNV = function(prob){
  const {A,B} = prob;
  const M = NG.measure(A,B);
  const type = NG.classify(A,B);
  const find = (prob.find||[1,2]).slice().sort((p,q)=> ((p===3)-(q===3)) || p-q);
  const bez = !prob.axes;
  if (prob.axes && find.includes(3)) prob.show3 = true;
  const base = baseScene(prob);
  const {S, nm} = base;
  const P = {1:[S.a1,S.b1],2:[S.a2,S.b2],3:[S.a3,S.b3]};
  const pn = k=>`${nk(nm[0],k)}${nk(nm[1],k)}`;
  const AB = nm[0]+nm[1];
  const steps = [];
  const ax = bez ? ' (на безосном чертеже — не горизонтальна и не вертикальна)' : '';

  let given = `<p>Дан комплексный чертёж отрезка <b>[${AB}]</b> — две проекции: ${b('p1',pn(1))} и ${b('p2',pn(2))}.</p>`;
  if (prob.coords) given += `<p class="mono">${nm[0]}(${fmt(A.x)}; ${fmt(A.y)}; ${fmt(A.z)})&nbsp; ${nm[1]}(${fmt(B.x)}; ${fmt(B.y)}; ${fmt(B.z)})</p><p class="muted">Координаты (x; y; z) в мм. Перерисуй условие на лист в клетку (клетка = 5 мм) и строй вместе с разбором.</p>`;
  given += `<p>Найти: <b>|${AB}|</b>${find.map(k=>`, ${b('ang',ANG[k])} = ∠(${AB}, ${PL[k]})`).join('')}.</p>`;
  steps.push({title:'Дано', html:given, els:base.els});

  const T = NG.TYPES[type];
  const glowBoth = [];
  if (G.dist(S.a1,S.b1)>0.5) glowBoth.push({t:'seg',a:S.a1,b:S.b1,c:'p1',glow:true});
  if (G.dist(S.a2,S.b2)>0.5) glowBoth.push({t:'seg',a:S.a2,b:S.b2,c:'p2',glow:true});
  let nvKnown = false;
  const res = {NV:M.NV, type, ang:{}};

  if (type==='ga'||type==='gd'){
    steps.push({title:'Что это за прямая?', hl:glowBoth,
      html:`<p>${b('p1',pn(1))} не параллельна и не перпендикулярна оси x${ax}. ${b('p2',pn(2))} — тоже.</p><p>Значит, это <b>прямая общего положения</b> (${type==='ga'?'восходящая — проекции наклонены в одну сторону':'нисходящая — проекции наклонены в разные стороны'}). Натуральной величины нет ни на одной проекции — все они короче отрезка.</p><p>➜ Работаем <b>методом прямоугольного треугольника</b>.</p>`});
    find.forEach(k=>{
      if (k===3 && bez){ gammaHyp(); return; }
      if (k===3) buildP3();
      triSteps(k);
    });
  } else if (type==='p'){
    steps.push({title:'Что это за прямая?', hl:glowBoth,
      html:`<p>Обе проекции лежат на <b>одной вертикальной линии связи</b> → x${sub('A')} = x${sub('B')}.</p><p>Это <b>профильная прямая</b> (∥ П₃). Сразу пишем: ${b('ang','γ = 0°')}.</p><p>На П₁ и П₂ длина искажена, поэтому α и β ищем <b>методом прямоугольного треугольника</b> — как в задаче про [CD] на практике.</p>`});
    find.filter(k=>k!==3).forEach(k=>triSteps(k));
    res.ang[3]=0;
  } else if (type==='h'||type==='f'){
    const kk = type==='h'?1:2;
    const mid = G.lerp(P[kk][0],P[kk][1],.5);
    steps.push({title:'Что это за прямая?', hl:glowBoth.filter(e=>e.c===(kk===1?'p2':'p1')),
      html:`<p>${type==='h'?b('p2',pn(2))+' ∥ оси x → все точки на одной высоте. Это <b>горизонталь h</b> (∥ П₁).':b('p1',pn(1))+' ∥ оси x → все точки на одной глубине. Это <b>фронталь f</b> (∥ П₂).'}</p><p>Треугольник не нужен: прямая уровня сама показывает НВ на той плоскости, которой параллельна.</p>`});
    steps.push({title:'Натуральная величина', hl:[{t:'seg',a:P[kk][0],b:P[kk][1],c:'nv',glow:true}],
      els:[outText(mid, G.add(mid, kk===1?[0,-5]:[0,5]), '|AB| = '+fmt(M.NV), 'nv')],
      html:`<p>${b('nv',`|${pn(kk)}| = |${AB}| ≈ ${fmt(M.NV)} мм`)} — меряем прямо линейкой.</p>`});
    find.forEach(k=>{
      if (k===kk){ res.ang[k]=0; steps.push({title:`Угол ${ANG[k]}`, html:`<p>Прямая параллельна ${PL[k]} → ${b('ang',ANG[k]+' = 0°')}.</p>`}); return; }
      const v = P[kk][0], w = P[kk][1];
      const vert = k===3;
      const dirv = vert ? [0, Math.sign(w[1]-v[1])||1] : [Math.sign(w[0]-v[0])||1, 0];
      const ref = G.add(v, G.mul(dirv, (vert?Math.abs(w[1]-v[1]):Math.abs(w[0]-v[0]))+6));
      const val = M.ang[k]; res.ang[k]=val;
      steps.push({title:`Угол ${ANG[k]}`, els:[{t:'seg',a:v,b:ref,c:'aux',w:'aux'},{t:'ang',v:v,a:ref,b:w,c:'ang',n:ANG[k]+' ≈ '+fmt(val,0)+'°'}],
        html:`<p>Угол между ${b('p'+kk,pn(kk))} и ${vert?'вертикалью (осью '+(kk===1?'y':'z')+')':'осью x'} — это ${b('ang',`${ANG[k]} ≈ ${fmt(val,0)}°`)} (угол с ${PL[k]}).</p>`});
    });
  } else {
    const kk = {hp:1, fp:2, pp:3}[type];
    const nvOn = [1,2,3].filter(k=>k!==kk);
    steps.push({title:'Что это за прямая?', hl:glowBoth,
      html:`<p>${T.sign}</p><p>Это <b>${T.name.toLowerCase()}</b>. Она ⊥ ${PL[kk]}, а значит ∥ двум другим плоскостям.</p>`});
    steps.push({title:'Натуральная величина и углы', html:`<p>${b('nv','|'+AB+'| ≈ '+fmt(M.NV)+' мм')} — видна на ${nvOn.map(k=>PL[k]).join(' и ')}.</p><p>${[1,2,3].map(k=>`${ANG[k]} = ${k===kk?90:0}°`).join(', ')}.</p>`});
    [1,2,3].forEach(k=>res.ang[k]=k===kk?90:0);
  }

  find.forEach(k=>{ if (res.ang[k]==null) res.ang[k]=M.ang[k]; });
  const angTxt = find.map(k=>`${b('ang',ANG[k])} ≈ ${fmt(res.ang[k],0)}°`).join(', ');
  let chk = '';
  if (type==='ga'||type==='gd'||type==='p'){
    chk = `<div class="idea good">Проверки: НВ длиннее любой проекции (|${pn(1)}| ≈ ${fmt(M.L1)}, |${pn(2)}| ≈ ${fmt(M.L2)} < ${fmt(M.NV)}) ✓` +
      (find.includes(1)&&find.includes(2) ? (type==='p' ? '; α + β = 90° ✓ (так и должно быть у профильной прямой)' : `; α + β ≈ ${fmt(M.a+M.b,0)}° ≤ 90° ✓`) : '') + `</div>`;
  }
  steps.push({title:'Ответ', html:`<p>${b('nv',`|${AB}| ≈ ${fmt(M.NV)} мм`)}, ${angTxt}${type==='p'&&!find.includes(3)?', '+b('ang','γ = 0°'):''}.</p>${chk}${prob.note||''}`});
  res.steps = steps; res.M = M; res.find = find; res.base = base;
  return res;

  function triSteps(k){
    const [pa,pb] = P[k];
    const d = M.D[k], L = M.L[k], val = M.ang[k];
    const D = 'Δ'+DC[k];
    const tri = triangleEls(k, pa, pb, d, M.NV, val, nm);
    const Bk = nk(nm[1],k), Ak = nk(nm[0],k);
    const otherP = k===1?P[2]:P[1];
    const same = k!==3 && Math.abs(otherP[0][0]-otherP[1][0])<0.6;
    const where = k===1 ? `на ${b('p2','фронтальной проекции')} (там видны высоты)` : k===2 ? `на ${b('p1','горизонтальной проекции')} (там видны глубины)` : 'по горизонтали — это расстояние между линиями связи точек';
    const how = same ? `. Здесь обе точки на одной линии связи, поэтому ${D} — это просто <b>длина всей проекции ${pn(k===1?2:1)}</b>` : (k===3 ? '' : `: через одну точку проводим горизонтальную линию до линии связи другой — кусочек линии связи между ними и есть ${D}`);
    steps.push({title:`Угол ${ANG[k]} (к ${PL[k]}): I катет`, hl:[{t:'seg',a:pa,b:pb,c:COL[k],glow:true}],
      html:`<p>Угол с ${PL[k]} ищем на <b class="c-${COL[k]}">${PLN[k]} проекции</b>.</p><p>Первый катет — сама проекция ${b(COL[k],'['+pn(k)+']')} ≈ ${fmt(L)} мм.</p>`});
    let yBelow = null;
    if (k===3){
      yBelow = Math.max(S.a1[1],S.b1[1]);
      steps.forEach(st=>(st.els||[]).forEach(e=>{ if (e.p) yBelow=Math.max(yBelow,e.p[1]); if (e.a&&e.b&&e.t!=='seg') yBelow=Math.max(yBelow,e.a[1],e.b[1]); if (e.t==='seg'&&e.c!=='axis'&&e.c!=='link') yBelow=Math.max(yBelow,e.a[1],e.b[1]); }));
      yBelow += 10;
    }
    steps.push({title:`II катет — ${D}`, els:measureEls(k,S,d,D+' ≈ '+fmt(d),yBelow),
      html:`<p>Второй катет — ${b('dd',D)}: разность ${DWORD[DC[k]]} концов отрезка.</p><p>Берём его ${where}${how}.</p><p>${b('dd',`${D} ≈ ${fmt(d)} мм`)} — берём в циркуль.</p>`});
    steps.push({title:`Откладываем ${D} ⊥ ${pn(k)}`, els:tri.s3,
      html:`<p>В точке ${b(COL[k],Ak)} восстанавливаем <b>перпендикуляр</b> к ${pn(k)} и откладываем на нём ${b('dd',D)} → точка <b>${tri.A0}</b>.</p><p>Угол при ${Ak} прямой — треугольник прямоугольный.</p>`});
    steps.push({title:'Гипотенуза = натуральная величина', els:tri.s4,
      html: nvKnown ? `<p>Соединяем ${tri.A0} с ${Bk}. Это снова ${b('nv','|'+AB+'| ≈ '+fmt(M.NV)+' мм')} — должно совпасть с первым треугольником. Хорошая проверка точности чертежа.</p>`
        : `<p>Соединяем ${tri.A0} с ${Bk}. Гипотенуза ${b('nv',`|${tri.A0}${Bk}| = |${AB}| ≈ ${fmt(M.NV)} мм`)} — настоящая длина отрезка. Меряем линейкой.</p>`});
    steps.push({title:`Угол ${ANG[k]}`, els:tri.s5,
      html:`<p>Угол между проекцией ${pn(k)} и гипотенузой ${tri.A0}${Bk} (при вершине ${Bk}) — это угол наклона прямой к ${PL[k]}:</p><p>${b('ang',`${ANG[k]} = ∠(${pn(k)}, ${tri.A0}${Bk}) ≈ ${fmt(val,0)}°`)} — меряем транспортиром.</p>${!nvKnown?'<div class="idea">Угол наклона — всегда <b>между проекцией и гипотенузой</b>. Не между Δ и гипотенузой!</div>':''}`});
    nvKnown = true; res.ang[k]=val;
  }

  function buildP3(){
    const els=[];
    [[A,S.a1,S.a2,S.a3],[B,S.b1,S.b2,S.b3]].forEach(([Pt,p1,p2,p3])=>{
      const k45=[Pt.y,Pt.y];
      els.push({t:'seg',a:p1,b:k45,c:'aux',w:'aux'});
      els.push({t:'seg',a:k45,b:p3,c:'aux',w:'aux'});
      els.push({t:'seg',a:p2,b:p3,c:'aux',w:'aux'});
    });
    els.push({t:'seg',a:S.a3,b:S.b3,c:'p3'});
    els.push(...mergePts([{p:S.a3,n:nk(nm[0],3),c:'p3',others:[S.b3,S.a2]},{p:S.b3,n:nk(nm[1],3),c:'p3',others:[S.a3,S.b2]}]));
    steps.push({title:'Строим профильную проекцию', els,
      html:`<p>Для угла γ нужна проекция на ${b('p3','П₃')}.</p><p>Правило: ${nk(nm[0],3)} на одной горизонтали с ${nk(nm[0],2)} (та же высота z), а глубину y переносим с горизонтальной проекции через <b>линию 45°</b>: от ${nk(nm[0],1)} вправо до линии 45°, потом вверх. Так же строим ${nk(nm[1],3)} и соединяем.</p>`});
  }

  function gammaHyp(){
    const d = M.dx, L3 = M.L3;
    const allY=[S.a1[1],S.b1[1],S.a2[1],S.b2[1]];
    let maxX = Math.max(S.a1[0],S.b1[0],S.a2[0],S.b2[0]);
    let maxY = Math.max(...allY);
    steps.forEach(st=>(st.els||[]).forEach(e=>{
      if (e.p){ maxX=Math.max(maxX,e.p[0]); maxY=Math.max(maxY,e.p[1]); }
      if (e.b&&e.a){ maxX=Math.max(maxX,e.a[0],e.b[0]); maxY=Math.max(maxY,e.a[1],e.b[1]); }
    }));
    const X0 = maxX + 30;
    const Y0 = (Math.min(...allY)+Math.max(...allY))/2 + L3/2;
    const Pp=[X0,Y0], Q=[X0+d,Y0], Cc=[X0+d,Y0-L3];
    const tc = Math.atan2(Cc[1]-Pp[1], Cc[0]-Pp[0]);
    steps.push({title:'Угол γ: что нам нужно', els:measureEls(3,S,d,'Δx ≈ '+fmt(d), maxY+10),
      html:`<p>Треугольник для ${b('p3','П₃')}: катеты |${pn(3)}| и ${b('dd','Δx')}, гипотенуза |${AB}|.</p><p>Профильной проекции на чертеже нет, но ${b('nv','|'+AB+'|')} мы уже нашли, а ${b('dd','Δx')} — просто расстояние между линиями связи ${nm[0]} и ${nm[1]} (≈ ${fmt(d)} мм).</p><p>➜ Строим треугольник <b>по катету и гипотенузе</b>.</p>`});
    steps.push({title:'Строим треугольник сбоку', els:[
        {t:'dim',a:Pp,b:Q,c:'dd',n:'Δx',side:sideFor(Pp,Q,[0,1])},
        {t:'seg',a:Q,b:[Q[0],Cc[1]-6],c:'aux',w:'aux'},
        {t:'rt',v:Q,a:Pp,b:Cc,c:'aux'},
        {t:'arc',o:Pp,r:M.NV,t1:tc-0.22,t2:tc+0.12,c:'nv'},
        {t:'poly',pts:[Pp,Q,Cc],c:'nv',op:.09},
        {t:'seg',a:Pp,b:Cc,c:'nv',w:'nv'},
        outText(G.lerp(Pp,Cc,.5),[(Pp[0]+Q[0]+Cc[0])/3,(Pp[1]+Q[1]+Cc[1])/3],'|'+AB+'|','nv')],
      html:`<p>На свободном месте откладываем ${b('dd','Δx')}, в его конце ставим перпендикуляр.</p><p>Циркулем радиусом ${b('nv','|'+AB+'|')} из начала отрезка делаем засечку на перпендикуляре и соединяем.</p>`});
    steps.push({title:'Угол γ', els:[
        {t:'ang',v:Cc,a:Q,b:Pp,c:'ang',n:'γ ≈ '+fmt(M.g,0)+'°'},
        {t:'txt',p:G.lerp(Q,Cc,.5),dp:[8,4],n:'|'+pn(3)+'|',c:'p3',anc:'start',size:12}],
      html:`<p>Вертикальный катет — это длина профильной проекции ${b('p3','|'+pn(3)+'| ≈ '+fmt(L3)+' мм')}.</p><p>Угол между ним и гипотенузой (напротив Δx) — ${b('ang','γ ≈ '+fmt(M.g,0)+'°')}.</p><div class="idea">Другой способ, как на практике: провести оси, построить ${pn(3)} через линию 45° и треугольник на ${pn(3)} с катетом Δx. Ответ тот же.</div>`});
    res.ang[3] = M.g;
  }
};
})();
