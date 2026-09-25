# Головные уборы в координатах Blender (Z вверх, лицо -Y), по мешу головы.
import numpy as np, math
TAU = 2*math.pi
def ss(x): x = np.clip(x, 0, 1); return x*x*(3-2*x)
class Geo:
    def __init__(s): s.P=[]; s.F=[]; s.UV=[]
    def grid(s, pts, wrap_u=False, flip=False):
        """pts: (NV+1, NU+1, 3) -> quads"""
        pts = np.asarray(pts, np.float64); nv, nu = pts.shape[0]-1, pts.shape[1]-1
        base = len(s.P); s.P.extend(pts.reshape(-1,3).tolist())
        # UV в метрах по длине дуги: ткань ложится без растяжения
        du = np.concatenate([np.zeros((nv+1,1)), np.cumsum(np.linalg.norm(np.diff(pts,axis=1),axis=2),axis=1)],1)
        dv = np.concatenate([np.zeros((1,nu+1)), np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=2),axis=0)],0)
        s.UV.extend(np.stack([du, dv], -1).reshape(-1,2).tolist())
        cols = nu if wrap_u else nu+1
        if wrap_u:  # последняя колонка совпадает с первой
            pass
        for j in range(nv):
            for i in range(nu):
                a = base + j*(nu+1) + i; b = a+1; c = a+nu+2; d = a+nu+1
                s.F.append((a,d,c,b) if flip else (a,b,c,d))
    def tube(s, path, radius, n=10, caps=True, up=np.array([0,0,1.0])):
        """radius: число или (ширина, толщина) — плоская лента; может быть функцией t"""
        path = np.asarray(path, float); rings = []
        for i in range(len(path)):
            t = path[min(i+1,len(path)-1)] - path[max(i-1,0)]; t /= np.linalg.norm(t)+1e-12
            u = up - t*np.dot(up,t)
            if np.linalg.norm(u) < 1e-6: u = np.array([1.0,0,0]) - t*t[0]
            u /= np.linalg.norm(u); v = np.cross(t,u)
            r = radius(i/(len(path)-1)) if callable(radius) else radius
            rw, rh = (r, r) if np.isscalar(r) else r
            rings.append([path[i] + u*math.cos(a)*rw + v*math.sin(a)*rh for a in np.linspace(0,TAU,n+1)])
        s.grid(np.array(rings))
        if caps:
            for k, sg in ((0,1),(len(rings)-1,-1)):
                c = len(s.P); s.P.append(path[k].tolist())
                r0 = len(s.P); s.P.extend(np.array(rings[k][:-1]).tolist())
                s.UV.extend([[0,0]]*(1+len(rings[k])-1))
                for i in range(n):
                    a, b = r0+i, r0+(i+1)%n
                    s.F.append((c,b,a) if sg>0 else (c,a,b))
    def slab(s, S, NU, NV, t0, t1):
        """S(u,v)->(p,n); толщина от t0 до t0+t1(u,v); все стороны закрыты"""
        U = np.linspace(0,1,NU+1); V = np.linspace(0,1,NV+1)
        P = np.zeros((NV+1,NU+1,3)); N = np.zeros_like(P); T0 = np.zeros((NV+1,NU+1)); T1 = np.zeros_like(T0)
        for j,v in enumerate(V):
            for i,u in enumerate(U):
                p,n = S(u,v); P[j,i]=p; N[j,i]=n
                T0[j,i] = t0(u,v) if callable(t0) else t0; T1[j,i] = t1(u,v) if callable(t1) else t1
        top = P + N*(T0+T1)[...,None]; bot = P + N*T0[...,None]
        s.grid(top); s.grid(bot, flip=True)
        s.grid(np.stack([bot[:,0], top[:,0]],1), flip=False); s.grid(np.stack([bot[:,-1], top[:,-1]],1), flip=True)
        s.grid(np.stack([bot[0], top[0]],0), flip=True); s.grid(np.stack([bot[-1], top[-1]],0), flip=False)
    def box(s, c, ax, half):
        """ax: 3 оси (строки), half: полуразмеры"""
        c = np.asarray(c,float); ax = np.asarray(ax,float); base=len(s.P)
        s.UV.extend([[ (k&1)*half[0]*2, ((k>>1)&1)*half[1]*2 ] for k in range(8)])
        for k in range(8):
            sg = np.array([1 if k&1 else -1, 1 if k&2 else -1, 1 if k&4 else -1])
            s.P.append((c + (ax.T @ (sg*np.asarray(half)))).tolist())
        for f in ((0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)):
            s.F.append(tuple(base+i for i in f))

class Head:
    """Измерения головы по мешу кожи (Blender)."""
    def __init__(s, pos, eye_pos):
        s.pos = pos; s.E = eye_pos.mean(0)
        up = pos[pos[:,2] > s.E[2] + 0.02]
        s.top = pos[:,2].max()
        s.C = np.array([0.0, (up[:,1].min()+up[:,1].max())/2, s.E[2] + 0.012])
        s.front = up[:,1].min(); s.back = up[:,1].max(); s.half_w = np.abs(up[:,0]).max()
        # радиальный профиль черепа по направлениям (для зазора)
        d = pos - s.C; r = np.linalg.norm(d,axis=1); s.dirs = d/r[:,None]; s.r = r
    def radial(s, dirs, cone=0.10):
        """макс. радиус головы в конусе вокруг каждого направления"""
        out = np.zeros(len(dirs))
        for i,dv in enumerate(dirs):
            m = s.dirs @ dv > math.cos(cone)
            out[i] = s.r[m].max() if m.any() else 0
        return out

def helmet(H):
    g_shell, g_hard, g_loop, g_rub = Geo(), Geo(), Geo(), Geo()
    C = H.C; E = H.E
    NU, NV = 96, 30
    th = np.linspace(-math.pi, math.pi, NU+1)   # 0 — лицо (-Y), ±pi — затылок
    def rim_z(t):  # высота края шлема по азимуту
        a = abs(t)
        pts = [(0,0.024),(0.45,0.022),(0.85,0.018),(1.08,0.046),(1.35,0.054),(1.75,0.052),(2.05,0.022),(2.5,-0.018),(math.pi,-0.032)]
        for k in range(len(pts)-1):
            if a <= pts[k+1][0]:
                u = (a-pts[k][0])/(pts[k+1][0]-pts[k][0]); u = u*u*(3-2*u)
                return E[2] + pts[k][1]*(1-u) + pts[k+1][1]*u
        return E[2] + pts[-1][1]
    def dir_at(t, phi):
        return np.array([math.sin(phi)*math.sin(-t)*-1, -math.sin(phi)*math.cos(t), math.cos(phi)])
    # направление: t=0 -> -Y (лицо); t>0 -> +X (левая сторона персонажа)
    def d(t, phi): return np.array([math.sin(phi)*math.sin(t), -math.sin(phi)*math.cos(t), math.cos(phi)])
    # сначала радиусы на плотной сетке направлений
    PH = np.zeros((NV+1, NU+1)); R = np.zeros_like(PH)
    for i,t in enumerate(th):
        # phi на крае: ищем угол, при котором точка на ~голове выходит на высоту rim
        lo, hi = 0.2, 2.6
        for _ in range(30):
            m = (lo+hi)/2; p = C + d(t,m)*0.13
            if p[2] > rim_z(t): lo = m
            else: hi = m
        for j in range(NV+1):
            v = j/NV; PH[j,i] = (lo+hi)/2 * v
    dirs = np.array([d(th[i], PH[j,i]) for j in range(NV+1) for i in range(NU+1)])
    rad = H.radial(dirs, 0.12).reshape(NV+1, NU+1)
    # оболочка гладкая: радиус — сглаженный профиль + зазор под подвесную систему
    base = np.maximum(rad + 0.020, 0.0)
    for _ in range(40):
        b2 = base.copy()
        b2[1:-1,:] = (base[:-2,:] + base[2:,:] + np.roll(base,1,1)[1:-1,:] + np.roll(base,-1,1)[1:-1,:] + 4*base[1:-1,:]) / 8
        b2[0,:] = b2[1,:].mean()
        base = np.maximum(b2, rad + 0.015)
    base[:, -1] = base[:, 0]
    outer = np.array([[C + d(th[i],PH[j,i])*base[j,i] for i in range(NU+1)] for j in range(NV+1)])
    nrm = np.array([[d(th[i],PH[j,i]) for i in range(NU+1)] for j in range(NV+1)])
    T = 0.0075
    inner = outer - nrm*T
    g_shell.grid(outer, flip=True); g_shell.grid(inner, flip=False)
    # кант края — резиновая трубка
    rim = outer[-1] - nrm[-1]*T*0.5
    g_rub.tube(rim, 0.0052, n=10, caps=False)
    S = lambda u,v: (lambda i,j: (outer[j,i], nrm[j,i]))(int(round(u*NU)) % (NU+1), int(round(v*NV)))
    def surf(t, v):
        """точка/нормаль на внешней поверхности по азимуту t и доле v от макушки к краю"""
        i = (t + math.pi)/TAU*NU; i0 = int(math.floor(i)) % NU; fi = i - math.floor(i)
        j = v*NV; j0 = min(int(j), NV-1); fj = j - j0
        p = (outer[j0,i0]*(1-fi) + outer[j0,i0+1]*fi)*(1-fj) + (outer[j0+1,i0]*(1-fi) + outer[j0+1,i0+1]*fi)*fj
        n = (nrm[j0,i0]*(1-fi) + nrm[j0,i0+1]*fi)*(1-fj) + (nrm[j0+1,i0]*(1-fi) + nrm[j0+1,i0+1]*fi)*fj
        return p, n/np.linalg.norm(n)
    edge = lambda u,v,w=0.12: 0.35 + 0.65*float(ss(min(u,1-u,v,1-v)/w))
    # рельсы ARC по бокам
    for sd in (1,-1):
        g_hard.slab(lambda u,v: surf(sd*(0.62 + u*1.55), 0.78 + v*0.14), 40, 3, 0.0, lambda u,v: 0.0085*edge(u,v,0.06))
        # прорези в рельсе: тёмные вставки
        for k in range(7):
            u0 = 0.08 + k*0.13
            g_rub.slab(lambda u,v: surf(sd*(0.62 + (u0+u*0.05)*1.55), 0.80 + v*0.08), 2, 1, 0.0082, 0.0012)
    # крепление ПНВ спереди
    g_hard.slab(lambda u,v: surf(-0.30 + u*0.60, 0.60 + v*0.28), 10, 6, 0.0, lambda u,v: 0.011*edge(u,v,0.2))
    g_hard.slab(lambda u,v: surf(-0.12 + u*0.24, 0.66 + v*0.14), 4, 3, 0.011, 0.006)
    # липучки: верх и затылок
    g_loop.slab(lambda u,v: surf(-0.55 + u*1.10, 0.10 + v*0.34), 16, 6, 0.0, lambda u,v: 0.0022*edge(u,v,0.1))
    g_loop.slab(lambda u,v: surf(math.pi - 0.55 + u*1.10, 0.38 + v*0.30), 16, 6, 0.0, lambda u,v: 0.0022*edge(u,v,0.1))
    for sd in (1,-1):
        g_loop.slab(lambda u,v: surf(sd*(1.00 + u*0.55), 0.40 + v*0.28), 8, 5, 0.0, lambda u,v: 0.0022*edge(u,v,0.1))
    # аккумуляторный отсек противовеса на затылке
    p, n = surf(math.pi, 0.62); ax = [np.array([1.0,0,0]), np.cross(n,[1.0,0,0]), n]
    ax[1] /= np.linalg.norm(ax[1]); g_hard.box(p + n*0.013, ax, (0.034, 0.022, 0.013))
    return {'helmet': g_shell, 'helmetHard': g_hard, 'helmetLoop': g_loop, 'helmetRubber': g_rub}, surf, outer, nrm

def headset(H, surf, mic_side=1):
    g_cup, g_pad, g_rub = Geo(), Geo(), Geo()
    for sd in (1,-1):
        # ухо: самые боковые вершины на высоте глаз
        m = (np.abs(H.pos[:,2] - (H.E[2]-0.02)) < 0.03) & (np.sign(H.pos[:,0]) == sd)
        ear = H.pos[m][np.argmax(np.abs(H.pos[m][:,0]))]
        c = np.array([ear[0] + sd*0.018, ear[1] + 0.004, ear[2] + 0.002])
        ax = np.array([[0,1.0,0],[0,0,1.0],[sd,0,0]])
        NU, NV = 28, 10
        cup = []
        for j in range(NV+1):
            v = j/NV; ring=[]
            for i in range(NU+1):
                a = i/NU*TAU
                rr = (0.036 if v < 0.75 else 0.036*math.sqrt(max(0,1-((v-0.75)/0.25)**2)*0.9+0.1))
                ring.append(c + ax[0]*math.cos(a)*rr*0.86 + ax[1]*math.sin(a)*rr + ax[2]*(0.004 + v*0.030))
            cup.append(ring)
        g_cup.grid(np.array(cup))
        # амбушюра
        pad = []
        for j in range(9):
            b = j/8*TAU; ring=[]
            for i in range(NU+1):
                a = i/NU*TAU; R0 = 0.030 + 0.007*math.cos(b)
                ring.append(c + ax[0]*math.cos(a)*R0*0.86 + ax[1]*math.sin(a)*R0 + ax[2]*(0.004 + 0.008*math.sin(b) - 0.004))
            pad.append(ring)
        g_pad.grid(np.array(pad))
        # кронштейн к рельсу
        top = c + ax[1]*0.030 + ax[2]*0.028
        rp, rn = surf(sd*1.5, 0.84)
        path = [top, top + np.array([0,0,0.012]), rp + rn*0.012 + np.array([0,0,-0.004]), rp + rn*0.006]
        g_rub.tube(path, (0.006, 0.0022), n=8)
        if sd == mic_side:
            p0 = c + ax[0]*-0.028 + ax[2]*0.02
            mouth = np.array([H.E[0]*0 + sd*0.02, H.front + 0.005, H.E[2] - 0.085])
            mid = p0*0.5 + mouth*0.5 + np.array([0, -0.01, -0.01])
            pts = [p0, p0*0.7 + mid*0.3, mid, mid*0.4 + mouth*0.6, mouth]
            g_rub.tube(pts, 0.0022, n=8)
            g_pad.tube([mouth + np.array([sd*0.004,0,0]), mouth - np.array([sd*0.012,0,0])], 0.0055, n=12)
    return {'headset': g_cup, 'headsetPad': g_pad, 'headsetRubber': g_rub}

def chinstrap(H, surf, over):
    g = Geo()
    chin = H.pos[np.argmin(H.pos[:,2] - 0.4*np.abs(H.pos[:,0]) + 0*H.pos[:,1] + 1e3*(np.abs(H.pos[:,0])>0.03))]
    for sd in (1,-1):
        rp, rn = surf(sd*0.95, 0.99)
        jaw = H.pos[(np.sign(H.pos[:,0])==sd)]
        jz = jaw[(np.abs(jaw[:,1] - (H.front + 0.07)) < 0.015)]
        low = jz[np.argmin(jz[:,2])] if len(jz) else chin
        pts = [rp - rn*0.004, rp*0.55 + low*0.45 + np.array([sd*0.014, 0, 0]), low + np.array([sd*0.008, 0, -0.004]),
               chin*0.5 + low*0.5 + np.array([0,0,-0.012]), chin + np.array([0, 0.004, -0.012])]
        g.tube(smooth_chain(pts,2), (0.0125, 0.0018), n=6, caps=True, up=np.array([sd,0,0.0]))
    return g

def smooth_chain(pts, it=2):
    pts = [np.asarray(p,float) for p in pts]
    for _ in range(it):
        out = [pts[0]]
        for a,b in zip(pts[:-1], pts[1:]): out += [a*0.75+b*0.25, a*0.25+b*0.75]
        out.append(pts[-1]); pts = out
    return pts

def balaclava(H, pos, nrm, tri):
    """Трикотаж по голове: там, где кожа вогнута (глазницы, под носом, у ушей),
       ткань перекидывается мостом; на выпуклостях — облегает с зазором."""
    nv = len(pos)
    nb = [set() for _ in range(nv)]
    for a,b,c in tri: nb[a].update((b,c)); nb[b].update((a,c)); nb[c].update((a,b))
    nbl = [np.fromiter(x, int) for x in nb]
    sm = pos.copy()
    for _ in range(18):
        sm = np.array([sm[l].mean(0) if len(l) else sm[i] for i,l in enumerate(nbl)])*0.6 + sm*0.4
    lift = np.einsum('ij,ij->i', sm - pos, nrm)
    off = np.maximum(0.0034, lift + 0.0012)
    # губы и нос: ткань натянута, в складки не заходит
    out = pos + nrm*off[:,None]
    E = H.E
    cen = (out[tri].mean(1))
    dx = cen[:,0]/0.050; dz = (cen[:,2] - (E[2] + 0.004))/0.0185
    slit = (np.abs(dx)**3 + np.abs(dz)**3 < 1) & (cen[:,1] < E[1] + 0.03)
    return out, tri[~slit]

def boonie(H):
    g_hat, g_band = Geo(), Geo()
    C, E = H.C, H.E
    a = H.half_w + 0.030; b = (H.back - H.front)/2 + 0.032; cy = (H.back + H.front)/2
    NU = 96; th = np.linspace(-math.pi, math.pi, NU+1)
    z0 = lambda t: E[2] + 0.050 - 0.030*(1-math.cos(t))/2
    ztop = H.top + 0.040
    def plan(t, k=1.0):
        c, s_ = math.cos(t), math.sin(t)
        e = 2/2.6
        return np.array([a*k*np.sign(s_)*abs(s_)**e, cy - b*k*np.sign(c)*abs(c)**e])
    rng = np.random.default_rng(7)
    ph = rng.uniform(0, TAU, 4)
    wob = lambda t: 0.004*math.sin(3*t+ph[0]) + 0.003*math.sin(5*t+ph[1])
    # тулья: от ленты вверх, чуть сужается, скругление к плоскому верху
    rows = []
    NV = 22
    for j in range(NV+1):
        v = j/NV; ring = []
        for t in th:
            zb = z0(t)
            if v < 0.72:
                w = v/0.72; z = zb + (ztop - 0.022 - zb)*w; k = 1.0 - 0.07*w
            else:
                w = (v-0.72)/0.28; ang = w*math.pi/2
                z = ztop - 0.022 + 0.022*math.sin(ang); k = (1.0-0.07)*math.cos(ang)*0.95 + 0.0001
            xy = plan(t, k) + np.array([0, 0])
            wb = wob(t)*(1-v)
            ring.append([xy[0]*(1+wb), xy[1], z + 0.002*math.sin(7*t + 3*v)])
        rows.append(ring)
    rows = np.array(rows)
    g_hat.grid(rows, flip=True)
    inner = rows.copy(); inner[...,:2] = (rows[...,:2] - [0,cy])*0.985 + [0,cy]; inner[...,2] -= 0.002
    g_hat.grid(inner, flip=False)
    # поля: наружу и вниз, волна ткани
    BR = []
    NB = 8
    for j in range(NB+1):
        v = j/NB; ring = []
        for t in th:
            base = plan(t, 1.0); dirv = base - [0, cy]; dirv /= np.linalg.norm(dirv)
            w = 0.066 + 0.006*math.sin(2*t+ph[2])
            droop = 0.020 + 0.010*math.sin(3*t+ph[3]) + 0.006*math.sin(5*t+ph[1])
            r = v*w; z = z0(t) - droop*(v**1.6) + 0.0015*math.sin(40*v)*0
            ring.append([base[0] + dirv[0]*r, base[1] + dirv[1]*r, z])
        BR.append(ring)
    BR = np.array(BR)
    top = BR + [0,0,0.0015]; bot = BR - [0,0,0.0015]
    g_hat.grid(top, flip=True); g_hat.grid(bot, flip=False)
    g_hat.grid(np.stack([bot[-1], top[-1]],0), flip=True)
    # прострочка полей: концентрические валики
    for v0 in (0.35, 0.55, 0.75, 0.92):
        j = v0*NB; j0 = int(j); f = j - j0
        line = BR[j0]*(1-f) + BR[min(j0+1,NB)]*f + [0,0,0.0018]
        g_band.tube(line, (0.0012, 0.0006), n=4, caps=False)
    # лента с петлями для маскировки
    band = []
    for jj in range(3):
        v = jj/2; ring=[]
        for t in th:
            xy = plan(t, 1.0 + 0.012); ring.append([xy[0], xy[1], z0(t) + 0.004 + v*0.026])
        band.append(ring)
    band = np.array(band); g_band.grid(band, flip=True)
    return {'hat': g_hat, 'hatBand': g_band}

def hair_weight(H, pos):
    """1 там, где растут волосы (короткая стрижка), по азимуту вокруг головы."""
    d = pos - H.C
    t = np.arctan2(d[:,0], -d[:,1])          # 0 — лицо
    a = np.abs(t); dz = pos[:,2] - H.E[2]
    T = np.array([[0,0.072],[0.55,0.068],[0.9,0.058],[1.15,0.050],[1.30,0.010],[1.42,0.030],[1.62,0.034],[1.85,0.020],[2.2,-0.030],[2.7,-0.055],[math.pi,-0.068]])
    h = np.interp(a, T[:,0], T[:,1])
    w = ss((dz - h)/0.008)
    # уши без волос
    ear = (np.abs(pos[:,0]) > H.half_w*0.93) & (dz > -0.05) & (dz < 0.03)
    w[ear] = 0
    return w
