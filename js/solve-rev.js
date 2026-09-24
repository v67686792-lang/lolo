/* Обратные задачи (недостающая проекция по НВ/углу) и задача про треугольник ABC. */
(function(){
'use strict';
const NG = window.NG, G = NG.G, fmt = NG.fmt;
const {PR, COL, DC, ANG, PL, PLN, DWORD, DEG, nk, b} = NG.K;
const {awayDir, chooseN, sideFor, axesEls, baseScene, measureEls} = NG.U;

/* prob: {A,B, given:[...], unknown:'B2'|'B1'|'A1'|'A2', aplane:1|2 (угол) или 'nv', val} */
NG.solveReverse = function(prob){
  const base = baseScene(prob);
  const {S, nm} = base;
  const U = prob.unknown;
  const uName = U[0], o = +U[1];
  const kName = uName===nm[0] ? nm[1] : nm[0];
  const m = 3 - o;
  const Pm = {1:[S.a1,S.b1],2:[S.a2,S.b2]}[m];
  const key = n=>n===nm[0]?'a':'b';
  const pt = (n,k)=>S[key(n)+k];
  const Km = pt(kName,m), Um = pt(uName,m), Ko = pt(kName,o);
  const UoX = Um[0];
  const isNV = prob.aplane==='nv';
  const k = isNV ? m : prob.aplane;
  const steps=[];
  const AB = nm[0]+nm[1];
  const pn = kk=>`${nk(nm[0],kk)}${nk(nm[1],kk)}`;
  const known = prob.given.map(g=>nk(g[0],+g[1]));
  const Uo = nk(uName,o);
  const valTxt = isNV ? `|${AB}| = ${fmt(prob.val)} мм` : `${ANG[k]} = ∠(${AB}, ${PL[k]}) = ${prob.val}°`;
  steps.push({title:'Дано', els:base.els, html:`<p>Известны: ${known.join(', ')} и ${b(isNV?'nv':'ang',valTxt)}.</p><p>Найти недостающую проекцию <b>${Uo}</b>. Сколько решений?</p>${prob.coords?`<p class="muted">Координаты известных точек даны в описании задачи — перерисуй условие на лист.</p>`:''}`});
  const Lm = G.dist(Pm[0],Pm[1]);
  const res = {sol:[]};
  const oCol = COL[o];

  if (isNV || k===m){
    const Dn = 'Δ'+DC[m];
    const d = isNV ? Math.sqrt(Math.max(0, prob.val*prob.val - Lm*Lm)) : Lm*Math.tan(prob.val/DEG);
    const NVv = isNV ? prob.val : Lm/Math.cos(prob.val/DEG);
    const u = G.norm(G.sub(Um,Km));
    const n = chooseN(u,m);
    const a0 = G.add(Km,G.mul(n,d));
    const K0 = kName+'₀';
    steps.push({title:'Анализ', hl:[{t:'seg',a:Pm[0],b:Pm[1],c:COL[m],glow:true}],
      html:`<p>${isNV?'Известна НВ':'Угол '+ANG[k]+' — с '+PL[k]}, а на ${b(COL[m],PLN[m]+' проекции')} отрезок [${pn(m)}] есть целиком → строим прямоугольный треугольник прямо на ней.</p><p>Известно: I катет ${b(COL[m],'['+pn(m)+']')} ${isNV?'и гипотенуза '+b('nv','|'+AB+'|'):'и угол '+b('ang',ANG[k])}. Найдём II катет ${b('dd',Dn)} — разность ${DWORD[DC[m]]}. Он и даст ${Uo}.</p>`});
    const s2 = [{t:'seg',a:Km,b:G.add(Km,G.mul(n,d+8)),c:'aux',w:'aux'},{t:'rt',v:Km,a:Um,b:a0,c:'aux'}];
    if (isNV){
      const t0 = G.at2(G.sub(a0,Um));
      s2.push({t:'arc',o:Um,r:NVv,t1:t0-0.2,t2:t0+0.2,c:'nv'});
    } else {
      s2.push({t:'seg',a:Um,b:G.add(Um,G.mul(G.norm(G.sub(a0,Um)),NVv+6)),c:'aux',w:'aux'});
      s2.push({t:'ang',v:Um,a:Km,b:a0,c:'ang',n:ANG[k]+' = '+prob.val+'°'});
    }
    s2.push({t:'pt',p:a0,n:K0,c:'nv',lp:awayDir(a0,[Km,Um])});
    steps.push({title:'Строим треугольник', els:s2,
      html: isNV ? `<p>В ${nk(kName,m)} ставим перпендикуляр к ${pn(m)}.</p><p>Циркулем радиусом ${b('nv','|'+AB+'| = '+fmt(NVv)+' мм')} из ${nk(uName,m)} делаем засечку на перпендикуляре → точка ${K0}.</p>`
        : `<p>В ${nk(kName,m)} ставим перпендикуляр к ${pn(m)}.</p><p>Из ${nk(uName,m)} откладываем транспортиром угол ${b('ang',ANG[k]+' = '+prob.val+'°')} от проекции. Луч пересечёт перпендикуляр в точке ${K0}.</p>`});
    const right = G.dot(G.norm(G.sub(Um,Km)),[1,0])>0;
    steps.push({title:`Получили ${Dn}`, els:[{t:'seg',a:Km,b:a0,c:'dd'},{t:'poly',pts:[Km,Um,a0],c:'nv',op:.09},{t:'seg',a:a0,b:Um,c:'nv',w:'nv'},
        {t:'txt',p:G.lerp(Km,a0,.5),dp:[right?-10:10, 4],n:Dn+' ≈ '+fmt(d),c:'dd',anc:right?'end':'start',size:12.5}],
      html:`<p>Катет ${b('dd',`|${nk(kName,m)}${K0}| = ${Dn} ≈ ${fmt(d)} мм`)} — вот на сколько ${m===1?'выше или ниже':'ближе или дальше'} точка ${uName}, чем ${kName}.</p>${isNV?'':`<p>Заодно гипотенуза даёт НВ: ${b('nv','|'+AB+'| ≈ '+fmt(NVv)+' мм')}.</p>`}`});
    const foot = [UoX, Ko[1]];
    const sg = Math.sign(foot[0]-Ko[0])||1;
    const s4=[{t:'seg',a:Ko,b:[foot[0]+sg*5,foot[1]],c:'aux',w:'aux'}];
    const sols=[[UoX,Ko[1]-d],[UoX,Ko[1]+d]];
    sols.forEach(q=>{ const a=[foot[0]+sg*3.5,foot[1]], b2=[q[0]+sg*3.5,q[1]]; s4.push({t:'dim',a,b:b2,c:'dd',n:Dn,side:sideFor(a,b2,[sg,0])}); });
    steps.push({title:`Переносим ${Dn} на линию связи`, els:s4,
      html:`<p>На ${b(oCol,PLN[o]+' проекции')} ${Dn} — это разница по вертикали. Проводим горизонталь через ${nk(kName,o)} до линии связи точки ${uName}.</p><p>От неё откладываем ${b('dd',Dn)} <b>вверх и вниз</b>.</p>`});
    const s5=[];
    sols.forEach((q,i)=>{
      s5.push({t:'seg',a:Ko,b:q,c:oCol,dash:i===1});
      s5.push({t:'pt',p:q,n:Uo+(i?'′':''),c:oCol,lp:[sg,i?0.6:-0.6]});
    });
    let note = '';
    if (prob.axes){
      const bad = sols.filter(q=> o===2 ? q[1]>0 : q[1]<0).length;
      if (bad) note = `<div class="idea warn">Одна из точек оказалась по другую сторону оси x — формально это тоже решение, но точка уже не в I четверти.</div>`;
    }
    steps.push({title:'Ответ: два решения', els:s5,
      html:`<p>Точка ${uName} могла быть ${m===1?'выше':'ближе'} точки ${kName} на ${Dn} или ${m===1?'ниже':'дальше'} на столько же → <b>2 решения</b>: ${Uo} и ${Uo}′.</p>${note}${prob.note||''}`});
    res.sol = sols; res.count = 2; res.d = d; res.NV = NVv;
  } else {
    const Dn = 'Δ'+DC[k];
    const d = Math.abs(Pm[0][1]-Pm[1][1]);
    const Lk = d/Math.tan(prob.val/DEG);
    const NVv = d/Math.sin(prob.val/DEG);
    const h = Math.abs(UoX-Ko[0]);
    steps.push({title:'Анализ', hl:[{t:'seg',a:Pm[0],b:Pm[1],c:COL[m],glow:true}],
      html:`<p>Угол ${b('ang',ANG[k])} — с ${PL[k]}, значит треугольник должен стоять на ${b(COL[k],PLN[k]+' проекции')}. А её-то и нет!</p><p>Зато из ${b(COL[m],PLN[m]+' проекции')} можно взять второй катет ${b('dd',Dn)}. По катету и углу построим треугольник сбоку и узнаем, <b>какой длины</b> должна быть ${PLN[k]} проекция.</p>`});
    steps.push({title:`Берём ${Dn}`, els:measureEls(k,S,d,Dn+' ≈ '+fmt(d)),
      html:`<p>${b('dd',Dn)} — разность ${DWORD[DC[k]]}. Она видна на ${PLN[m]} проекции как разница по вертикали: ${b('dd',Dn+' ≈ '+fmt(d)+' мм')}.</p>`});
    const xs = [S.a1[0],S.b1[0],S.a2[0],S.b2[0]], ys=[S.a1[1],S.b1[1],S.a2[1],S.b2[1]];
    const X0 = Math.max(...xs)+20, Y0 = Math.max(...ys);
    const Pp=[X0,Y0], Q=[X0,Y0-d], R=[X0+Lk,Y0];
    const dimA=[Pp[0],Pp[1]+6], dimB=[R[0],R[1]+6];
    steps.push({title:'Вспомогательный треугольник', els:[
        {t:'seg',a:Pp,b:Q,c:'dd'},{t:'txt',p:G.lerp(Pp,Q,.5),dp:[-7,4],n:Dn,c:'dd',anc:'end',size:12.5},
        {t:'seg',a:Pp,b:[R[0]+6,R[1]],c:'aux',w:'aux'},{t:'rt',v:Pp,a:Q,b:R,c:'aux'},
        {t:'poly',pts:[Pp,Q,R],c:'nv',op:.09},{t:'seg',a:Q,b:R,c:'nv',w:'nv'},
        {t:'ang',v:R,a:Pp,b:Q,c:'ang',n:ANG[k]+' = '+prob.val+'°'},
        {t:'dim',a:dimA,b:dimB,c:COL[k],n:`|${pn(k)}| ≈ ${fmt(Lk)}`,side:sideFor(dimA,dimB,[0,1])}],
      html:`<p>На свободном месте: вертикальный катет ${b('dd',Dn)}, от его нижнего конца — горизонтальная линия.</p><p>Из верхнего конца проводим гипотенузу так, чтобы угол при горизонтальном катете был ${b('ang',ANG[k]+' = '+prob.val+'°')}.</p><p>Горизонтальный катет — нужная длина ${b(COL[k],'|'+pn(k)+'| ≈ '+fmt(Lk)+' мм')}.</p>`});
    let sols=[];
    if (Lk > h + 0.4){ const s=Math.sqrt(Lk*Lk-h*h); sols=[[UoX,Ko[1]-s],[UoX,Ko[1]+s]]; }
    else if (Lk > h - 0.4){ sols=[[UoX,Ko[1]]]; }
    let t1,t2;
    if (sols.length===2){
      const a1=G.at2(G.sub(sols[0],Ko)), a2=G.at2(G.sub(sols[1],Ko));
      let dd=a2-a1; while(dd>Math.PI) dd-=2*Math.PI; while(dd<-Math.PI) dd+=2*Math.PI;
      t1 = a1 - Math.sign(dd)*0.15; t2 = a1 + dd + Math.sign(dd)*0.15;
    } else { const tDir = G.at2([UoX-Ko[0],0]); t1=tDir-0.45; t2=tDir+0.45; }
    steps.push({title:'Засечка циркулем', els:[{t:'arc',o:Ko,r:Lk,t1,t2,c:COL[o]}],
      html:`<p>Из ${nk(kName,o)} проводим дугу радиусом ${b(COL[k],'|'+pn(k)+'| ≈ '+fmt(Lk)+' мм')} до линии связи точки ${uName}.</p><p>Расстояние от ${nk(kName,o)} до этой линии связи — ${fmt(h)} мм. Если радиус больше — 2 точки, равен — 1, меньше — ни одной.</p>`});
    const s6=[];
    const sg = Math.sign(UoX-Ko[0])||1;
    sols.forEach((q,i)=>{ s6.push({t:'seg',a:Ko,b:q,c:oCol,dash:i===1}); s6.push({t:'pt',p:q,n:Uo+(i?'′':''),c:oCol,lp:[sg,i?0.6:-0.6]}); });
    const cnt = sols.length;
    const maxAng = Math.atan2(d,h)*DEG;
    steps.push({title: cnt===2?'Ответ: два решения':cnt===1?'Ответ: одно решение':'Ответ: решений нет', els:s6,
      html: (cnt===2 ? `<p>Дуга пересекла линию связи в двух точках → <b>2 решения</b>: ${Uo} и ${Uo}′.</p><p>Заодно гипотенуза вспомогательного треугольника — ${b('nv','|'+AB+'| ≈ '+fmt(NVv)+' мм')}.</p>`
        : cnt===1 ? `<p>Дуга только касается линии связи → <b>1 решение</b>.</p>`
        : `<p>Радиус (${fmt(Lk)} мм) меньше расстояния до линии связи (${fmt(h)} мм) — дуга до неё не достаёт → <b>решений нет</b>.</p><p>При таких проекциях угол ${ANG[k]} не может быть больше ≈ ${fmt(maxAng,0)}°.</p>`) + (prob.note||'')});
    res.sol = sols; res.count = cnt; res.d=d; res.Lk=Lk; res.h=h; res.NV=NVv; res.maxAng=maxAng;
  }
  res.steps = steps; res.base = base;
  return res;
};

/* ---------------- треугольник ABC: наименьшая сторона ---------------- */
NG.solveTri = function(prob){
  const N = ['A','B','C'], P3 = {A:prob.A,B:prob.B,C:prob.C};
  const S = {}; N.forEach(n=>{ S[n+1]=PR[1](P3[n]); S[n+2]=PR[2](P3[n]); });
  const els = axesEls([prob.A,prob.B,prob.C], false);
  N.forEach(n=>els.push({t:'seg',a:S[n+1],b:S[n+2],c:'link',w:'link'}));
  els.push({t:'poly',pts:N.map(n=>S[n+1]),c:'p1',op:.07},{t:'poly',pts:N.map(n=>S[n+2]),c:'p2',op:.07});
  [['A','B'],['B','C'],['C','A']].forEach(([p,q])=>{ els.push({t:'seg',a:S[p+1],b:S[q+1],c:'p1'}); els.push({t:'seg',a:S[p+2],b:S[q+2],c:'p2'}); });
  const cen1=[0,0], cen2=[0,0]; N.forEach(n=>{ cen1[0]+=S[n+1][0]/3; cen1[1]+=S[n+1][1]/3; cen2[0]+=S[n+2][0]/3; cen2[1]+=S[n+2][1]/3; });
  N.forEach(n=>{ els.push({t:'pt',p:S[n+1],n:n+'₁',c:'p1',lp:awayDir(S[n+1],[cen1])}); els.push({t:'pt',p:S[n+2],n:n+'₂',c:'p2',lp:awayDir(S[n+2],[cen2])}); });
  const cs = P=>[P.x,P.y,P.z].map(v=>fmt(v)).join('; ');
  const steps=[{title:'Дано', els, html:`<p>Дан треугольник ABC (две проекции).</p><p class="mono">A(${cs(prob.A)})&nbsp; B(${cs(prob.B)})&nbsp; C(${cs(prob.C)})</p><p>Найти: какая сторона <b>наименьшая</b>, и для неё — углы ${b('ang','α')} и ${b('ang','β')}.</p>`}];
  steps.push({title:'План', html:`<p>1) Находим НВ каждой стороны. Удобно: I катет — горизонтальная проекция стороны, II катет — Δz (с фронтальной).</p><p>2) Если сторона — прямая уровня (одна проекция ∥ x), её НВ видна сразу.</p><p>3) Сравниваем, берём наименьшую и ищем её α и β.</p>`});
  const sides = [['A','B'],['B','C'],['A','C']];
  const low = Math.max(...N.map(n=>S[n+1][1]));
  let X = Math.min(...N.map(n=>S[n+1][0]));
  const rowY = low + 22 + Math.max(...sides.map(([p,q])=>Math.abs(P3[p].z-P3[q].z)));
  const info = {};
  sides.forEach(([p,q])=>{
    const Mv = NG.measure(P3[p],P3[q]); const nmS = p+q;
    info[nmS] = Mv;
    const st = {title:`Сторона ${nmS}`, els:[], hl:[]};
    if (Mv.dz < 0.35){
      st.hl.push({t:'seg',a:S[p+1],b:S[q+1],c:'nv',glow:true});
      st.html = `<p>${p}₂${q}₂ ∥ оси x → ${nmS} — <b>горизонталь</b>. НВ видна сразу на П₁: ${b('nv',`|${nmS}| = |${p}₁${q}₁| ≈ ${fmt(Mv.NV)} мм`)}.</p><p>И сразу α = 0°.</p>`;
    } else {
      const Pp=[X,rowY], Q=[X+Mv.L1,rowY], R=[X,rowY-Mv.dz];
      Mv.tri={Pp,Q,R};
      measureEls(1,{a2:S[p+2],b2:S[q+2]},Mv.dz,'Δz').forEach(e=>st.hl.push(e));
      st.els.push({t:'seg',a:Pp,b:Q,c:'p1'},{t:'seg',a:Pp,b:R,c:'dd'},{t:'rt',v:Pp,a:Q,b:R,c:'aux'},{t:'poly',pts:[Pp,Q,R],c:'nv',op:.08},{t:'seg',a:R,b:Q,c:'nv',w:'nv'},
        {t:'txt',p:G.lerp(Pp,Q,.5),dp:[0,16],n:`|${p}₁${q}₁|`,c:'p1',size:12},{t:'txt',p:R,dp:[4,-8],n:`|${nmS}| ≈ ${fmt(Mv.NV)}`,c:'nv',size:12,anc:'start',val:true});
      st.html = Mv.dy < 0.35 ? `<p>${p}₁${q}₁ ∥ оси x → ${nmS} — <b>фронталь</b>, НВ видна сразу на П₂: ${b('nv',`|${nmS}| = |${p}₂${q}₂| ≈ ${fmt(Mv.NV)} мм`)}. Для единообразия построим и треугольник (он пригодится для α).</p>`
        : `<p>Строим сбоку треугольник: I катет = ${b('p1',`|${p}₁${q}₁|`)} (переносим циркулем), II катет = ${b('dd','Δz ≈ '+fmt(Mv.dz)+' мм')} (разность высот ${p} и ${q} — с фронтальной проекции).</p><p>Гипотенуза: ${b('nv',`|${nmS}| ≈ ${fmt(Mv.NV)} мм`)}.</p>`;
      X += Mv.L1 + 18;
    }
    steps.push(st);
  });
  const arr = Object.keys(info).sort((a,c)=>info[a].NV-info[c].NV);
  const mn = arr[0], Mm = info[mn];
  steps.push({title:'Какая наименьшая?', html:`<table class="t"><tr><th>сторона</th><th>НВ, мм</th></tr>${arr.map(s=>`<tr><td>${s}</td><td>${fmt(info[s].NV)}</td></tr>`).join('')}</table><p style="margin-top:8px">Наименьшая — <b>${mn}</b>.</p>`});
  const [p,q] = mn.split('');
  const aEls=[];
  if (Mm.tri) aEls.push({t:'ang',v:Mm.tri.Q,a:Mm.tri.Pp,b:Mm.tri.R,c:'ang',n:'α ≈ '+fmt(Mm.a,0)+'°'});
  steps.push({title:`α для ${mn}`, els:aEls, html: Mm.dz<0.35 ? `<p>${mn} — горизонталь → ${b('ang','α = 0°')}.</p>` : `<p>Треугольник для ${mn} уже построен на горизонтальной проекции. Угол между катетом |${p}₁${q}₁| и гипотенузой: ${b('ang','α ≈ '+fmt(Mm.a,0)+'°')}.</p>`});
  const bEls=[];
  if (Mm.dy>0.35){
    const Pp=[Math.min(...N.map(n=>S[n+1][0])), rowY+22+Mm.dy], Q=[Pp[0]+Mm.L2,Pp[1]], R=[Pp[0],Pp[1]-Mm.dy];
    bEls.push({t:'seg',a:Pp,b:Q,c:'p2'},{t:'seg',a:Pp,b:R,c:'dd'},{t:'rt',v:Pp,a:Q,b:R,c:'aux'},{t:'poly',pts:[Pp,Q,R],c:'nv',op:.08},{t:'seg',a:R,b:Q,c:'nv',w:'nv'},{t:'ang',v:Q,a:Pp,b:R,c:'ang',n:'β ≈ '+fmt(Mm.b,0)+'°'},
      {t:'txt',p:G.lerp(Pp,Q,.5),dp:[0,16],n:`|${p}₂${q}₂|`,c:'p2',size:12},{t:'txt',p:G.lerp(Pp,R,.5),dp:[-8,4],n:'Δy',c:'dd',size:12,anc:'end'});
  }
  steps.push({title:`β для ${mn}`, els:bEls, html: Mm.dy<0.35 ? `<p>${mn} — фронталь → ${b('ang','β = 0°')}.</p>` : `<p>Сбоку треугольник для П₂: I катет ${b('p2',`|${p}₂${q}₂|`)}, II катет ${b('dd','Δy ≈ '+fmt(Mm.dy)+' мм')} (разность глубин — с горизонтальной проекции). Угол при проекции: ${b('ang','β ≈ '+fmt(Mm.b,0)+'°')}.</p>`});
  steps.push({title:'Ответ', html:`<p>Наименьшая сторона — <b>${mn}</b>: ${b('nv','|'+mn+'| ≈ '+fmt(Mm.NV)+' мм')}, ${b('ang','α ≈ '+fmt(Mm.a,0)+'°')}, ${b('ang','β ≈ '+fmt(Mm.b,0)+'°')}.</p>`});
  return {steps, info, min:mn, M:Mm};
};
})();
