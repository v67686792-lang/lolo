/* Решатель: по координатам отрезка строит пошаговое решение (элементы чертежа + объяснения)
   и набор карточек для конструктора «Дано / Алгоритм». */
(function(){
'use strict';
const NG = window.NG, G = NG.G, fmt = NG.fmt;
const SUB = ['₀','₁','₂','₃'];
const DEG = 180/Math.PI;
const PR = {1:P=>[-P.x,P.y], 2:P=>[-P.x,-P.z], 3:P=>[P.y,-P.z]};
const COL = {1:'p1',2:'p2',3:'p3'};
const DC = {1:'z',2:'y',3:'x'};
const ANG = {1:'α',2:'β',3:'γ'};
const PL = {1:'П₁',2:'П₂',3:'П₃'};
const PLN = {1:'горизонтальной',2:'фронтальной',3:'профильной'};
const DWORD = {z:'высот (расстояний до П₁)', y:'глубин (расстояний до П₂)', x:'широт (расстояний до П₃)'};
const nk = (n,k)=> n + SUB[k];
const b = (cls, s)=> `<b class="c-${cls}">${s}</b>`;
const sub = s=> `<sub>${s}</sub>`;
NG.K = {SUB, PR, COL, DC, ANG, PL, PLN, DWORD, DEG, nk, b, sub};
NG.nk = nk;

/* ---------------- тип прямой ---------------- */
NG.classify = function(A,B){
  const e=0.35, sx=Math.abs(A.x-B.x)<e, sy=Math.abs(A.y-B.y)<e, sz=Math.abs(A.z-B.z)<e;
  if (sx&&sy) return 'hp'; if (sx&&sz) return 'fp'; if (sy&&sz) return 'pp';
  if (sz) return 'h'; if (sy) return 'f'; if (sx) return 'p';
  return ((A.y-B.y)*(A.z-B.z) < 0) ? 'ga' : 'gd';
};

/* ---------------- величины ---------------- */
NG.measure = function(A,B){
  const dx=Math.abs(A.x-B.x), dy=Math.abs(A.y-B.y), dz=Math.abs(A.z-B.z);
  const NV=Math.hypot(dx,dy,dz), L1=Math.hypot(dx,dy), L2=Math.hypot(dx,dz), L3=Math.hypot(dy,dz);
  const a=Math.atan2(dz,L1)*DEG, bb=Math.atan2(dy,L2)*DEG, g=Math.atan2(dx,L3)*DEG;
  return {dx,dy,dz,NV,L1,L2,L3,a,b:bb,g, L:{1:L1,2:L2,3:L3}, D:{1:dz,2:dy,3:dx}, ang:{1:a,2:bb,3:g}};
};

/* ---------------- вспомогательное ---------------- */
function awayDir(p, others){
  let d=[0,0];
  others.forEach(o=>{ const v=G.sub(p,o), l=G.len(v); if (l>0.4) d=G.add(d,G.mul(v,1/l)); });
  if (G.len(d)<0.25) d=[-1,-0.5];
  return G.norm(d);
}
function mergePts(list){
  const out=[];
  list.forEach(q=>{
    const m = out.find(o=>G.dist(o.p,q.p)<0.6);
    if (m){ m.n += '≡'+q.n; m.others = m.others.concat(q.others); }
    else out.push({p:q.p, n:q.n, c:q.c, others:q.others.slice()});
  });
  return out.map(o=>({t:'pt', p:o.p, n:o.n, c:o.c, lp: awayDir(o.p, o.others.filter(x=>G.dist(x,o.p)>0.6))}));
}
function chooseN(u, k){
  let n = G.perp(u);
  const flip=()=>{ n=[-n[0],-n[1]]; };
  if (k===1){ if (Math.abs(n[1])>0.3){ if (n[1]<0) flip(); } else if (n[0]<0) flip(); }
  else if (k===2){ if (Math.abs(n[1])>0.3){ if (n[1]>0) flip(); } else if (n[0]>0) flip(); }
  else { if (Math.abs(n[0])>0.3){ if (n[0]<0) flip(); } else if (n[1]>0) flip(); }
  return n;
}
function outText(mid, centroid, text, c){
  const o = G.norm(G.sub(mid, centroid));
  return {t:'txt', p:mid, dp:[o[0]*16, o[1]*16+4], n:text, c, val:true, anc: o[0]<-.3?'end':(o[0]>.3?'start':'middle'), size:12.5};
}
function sideFor(a,b2,out){ const n=G.perp(G.norm(G.sub(b2,a))); return G.dot(n,out)>=0?1:-1; }

/* оси */
function axesEls(pts3d, show3){
  const els=[];
  const xs = pts3d.map(P=>-P.x), ys=pts3d.map(P=>P.y), zs=pts3d.map(P=>P.z);
  const Xmin = Math.min(...xs) - 12;
  const ymax = Math.max(...ys, 10), zmax = Math.max(...zs, 10);
  const right = show3 ? ymax + 14 : 10;
  els.push({t:'seg', a:[Xmin,0], b:[right,0], c:'axis', w:'axis'});
  els.push({t:'txt', p:[Xmin,0], dp:[-5,5], n:'x', c:'axis', anc:'end', size:15});
  if (show3){
    els.push({t:'seg', a:[0,-(zmax+14)], b:[0,ymax+14], c:'axis', w:'axis'});
    els.push({t:'txt', p:[0,-(zmax+14)], dp:[-6,6], n:'z', c:'axis', anc:'end', size:15});
    els.push({t:'txt', p:[0,ymax+14], dp:[-7,4], n:'y', c:'axis', anc:'end', size:15});
    els.push({t:'txt', p:[right,0], dp:[2,-6], n:'y′', c:'axis', anc:'end', size:15});
    els.push({t:'seg', a:[0,0], b:[ymax+10,ymax+10], c:'link', w:'link'});
    els.push({t:'txt', p:[0,0], dp:[-5,-5], n:'O', c:'axis', anc:'end', size:13});
  }
  return els;
}

/* базовый чертёж условия */
function baseScene(prob){
  const nm = prob.names || ['A','B'];
  const {A,B} = prob;
  const given = prob.given || ['A1','B1','A2','B2'];
  const has = s=>given.includes(s);
  const S = {a1:PR[1](A), b1:PR[1](B), a2:PR[2](A), b2:PR[2](B), a3:PR[3](A), b3:PR[3](B)};
  const els = [];
  if (prob.axes) els.push(...axesEls([A,B], prob.show3));
  if (has('A1')&&has('A2')) els.push({t:'seg',a:S.a1,b:S.a2,c:'link',w:'link'});
  if (has('B1')&&has('B2')) els.push({t:'seg',a:S.b1,b:S.b2,c:'link',w:'link'});
  (prob.links||[]).forEach(L=>{ const X=L.p==='A'?S.a1[0]:S.b1[0]; els.push({t:'seg',a:[X,L.y0],b:[X,L.y1],c:'link',w:'link'}); });
  if (has('A1')&&has('B1') && G.dist(S.a1,S.b1)>0.5) els.push({t:'seg',a:S.a1,b:S.b1,c:'p1'});
  if (has('A2')&&has('B2') && G.dist(S.a2,S.b2)>0.5) els.push({t:'seg',a:S.a2,b:S.b2,c:'p2'});
  const L = [];
  const add=(key,p,n,c,oth)=>{ if (has(key)) L.push({p,n,c,others:oth}); };
  add('A2',S.a2,nk(nm[0],2),'p2',[S.b2,S.a1]);
  add('B2',S.b2,nk(nm[1],2),'p2',[S.a2,S.b1]);
  add('A1',S.a1,nk(nm[0],1),'p1',[S.b1,S.a2]);
  add('B1',S.b1,nk(nm[1],1),'p1',[S.a1,S.b2]);
  const pts = mergePts(L);
  if (prob.lp) pts.forEach(p=>{ const k = Object.keys(prob.lp).find(k=>p.n.indexOf(k)===0); if (k) p.lp = prob.lp[k]; });
  els.push(...pts);
  return {els, S, nm, given};
}

/* где брать Δ: элементы-подсказки */
function measureEls(k, S, d, label, yPos){
  const els=[];
  if (k===3){
    const below = yPos!=null;
    const y = below ? yPos : Math.min(S.a2[1], S.b2[1], S.a1[1], S.b1[1]) - 9;
    const fa = below ? S.a1 : S.a2, fb = below ? S.b1 : S.b2, ext = below ? 3 : -3;
    els.push({t:'seg',a:fa,b:[fa[0],y+ext],c:'aux',w:'ext'});
    els.push({t:'seg',a:fb,b:[fb[0],y+ext],c:'aux',w:'ext'});
    const a=[S.a2[0],y], b2=[S.b2[0],y];
    els.push({t:'dim',a,b:b2,c:'dd',n:label,side:sideFor(a,b2,[0,below?1:-1])});
    return els;
  }
  const p = k===1 ? S.a2 : S.a1, q = k===1 ? S.b2 : S.b1;
  if (Math.abs(p[0]-q[0]) < 0.6){
    els.push({t:'seg',a:p,b:q,c:'dd',glow:true});
    const off = k===1 ? 7 : -7;
    const a=[p[0]+off,p[1]], b2=[q[0]+off,q[1]];
    els.push({t:'dim',a,b:b2,c:'dd',n:label,side:sideFor(a,b2,[off,0])});
    return els;
  }
  let base;
  if (k===1){ base = p[1]>q[1]?p:q; } else { base = p[1]<q[1]?p:q; }
  const oth = base===p?q:p;
  const sg = Math.sign(oth[0]-base[0]) || 1;
  const foot=[oth[0], base[1]];
  els.push({t:'seg',a:base,b:[foot[0]+sg*5,foot[1]],c:'aux',w:'aux'});
  const a=[foot[0]+sg*3.5, foot[1]], b2=[oth[0]+sg*3.5, oth[1]];
  els.push({t:'dim',a,b:b2,c:'dd',n:label,side:sideFor(a,b2,[sg,0])});
  return els;
}

/* прямоугольный треугольник на проекции k */
function triangleEls(k, pa, pb, d, NV, angVal, nm){
  const u = G.norm(G.sub(pb,pa));
  const n = chooseN(u,k);
  const a0 = G.add(pa, G.mul(n,d));
  const A0 = nm[0]+'₀';
  const cen = [(pa[0]+pb[0]+a0[0])/3,(pa[1]+pb[1]+a0[1])/3];
  const s3 = [
    {t:'seg',a:pa,b:G.add(pa,G.mul(n,d+6)),c:'aux',w:'aux'},
    {t:'rt',v:pa,a:pb,b:a0,c:'aux'},
    {t:'seg',a:pa,b:a0,c:'dd',w:'main'},
    {t:'pt',p:a0,n:A0,c:'nv',lp:awayDir(a0,[pa,pb])}
  ];
  const s4 = [
    {t:'poly',pts:[pa,pb,a0],c:'nv',op:.09},
    {t:'seg',a:a0,b:pb,c:'nv',w:'nv'},
    outText(G.lerp(a0,pb,.5), cen, '|AB| ≈ '+fmt(NV), 'nv')
  ];
  const s5 = [{t:'ang',v:pb,a:pa,b:a0,c:'ang',n:ANG[k]+' ≈ '+fmt(angVal,0)+'°'}];
  return {s3,s4,s5,a0,A0};
}

NG.U = {awayDir, mergePts, chooseN, outText, sideFor, axesEls, baseScene, measureEls, triangleEls};
})();
