"""
Сборка реалистичного бойца для game/start.html.

Тело, кожа (фото-текстуры), глаза, брови — MakeHuman/MPFB2 (CC0); одежда,
плитник, берцы, перчатки — ассеты сообщества MakeHuman (CC0 / CC-BY, см.
game/assets/soldier/CREDITS.md). Шлем FAST, гарнитура, панама, балаклава,
стрижка и нашивка строятся здесь же по размерам головы модели.

Модель ставится в T-позу скелета игры (руки по ±X, ладони вниз, пальцы
прямые, ноги вертикально), веса костей MakeHuman переносятся на кости
GSkel, результат пишется в OUT/soldier.json + soldier.bin + tex/*.

Запуск (Python 3.13 + bpy 5.2.2, см. README.md):
    SOLDIER_ART=/path/to/cache  python build.py game/assets/soldier
"""
import os, sys, json, math, time
import numpy as np
import bpy
HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.environ.get('SOLDIER_ART', os.path.join(HERE, '.cache'))
OUT = os.path.abspath(sys.argv[-1])
def run(name): exec(open(os.path.join(HERE, name)).read(), globals())
run('mpfb_boot.py')
# ------------------------------------------------------------- человек
import bpy, os, math, mathutils, time, numpy as np
from mathutils import Vector, Matrix
T0=time.time()
TG = LocationService.get_mpfb_data('targets')
md = TargetService.get_default_macro_info_dict()
md.update({'gender':1.0,'age':0.5,'muscle':0.72,'weight':0.56,'height':0.555,'proportions':0.8})
md['race']={'caucasian':1.0,'african':0.0,'asian':0.0}
bm = HumanService.create_human(macro_detail_dict=md)
bm.name='Human'
def tgt(rel, w):
    TargetService.load_target(bm, os.path.join(TG, rel + '.target.gz'), weight=w)
for rel,w in [('head/head-square',0.35),('chin/chin-prominent-incr',0.25),('chin/chin-width-incr',0.3),
              ('cheek/l-cheek-bones-incr',0.3),('cheek/r-cheek-bones-incr',0.3),('nose/nose-hump-incr',0.15),
              ('eyebrows/eyebrows-trans-down',0.2),('neck/neck-scale-horiz-incr',0.35),('neck/neck-scale-depth-incr',0.25),
              ('torso/torso-vshape-incr',0.35),('torso/measure-shoulder-dist-incr',0.25)]:
    tgt(rel,w)
def A(sub, f): 
    p = AssetService.find_asset_absolute_path(f, asset_subdir=sub); assert p, f; return p
HumanService.set_character_skin(A('skins','young_caucasian_male.mhmat'), bm, skin_type='GAMEENGINE')
HumanService.add_builtin_rig(bm, 'game_engine')
arm = bm.parent
assets = [('eyes','high-poly.mhclo','Eyes'),('eyebrows','eyebrow001.mhclo','Eyebrows'),('eyelashes','eyelashes02.mhclo','Eyelashes'),
  ('clothes','elvs_male_shirt_untucked_bd1.mhclo','Clothes'),('clothes','cortu_cargo_pants.mhclo','Clothes'),
  ('clothes','mindfront_tactical_vest_male.mhclo','Clothes'),('clothes','mindfront_shoes_biker_boots_male.mhclo','Clothes'),
  ('clothes','toigo_gloves_short.mhclo','Clothes')]
for sub,f,t in assets:
    HumanService.add_mhclo_asset(A(sub,f), bm, asset_type=t, material_type='GAMEENGINE', subdiv_levels=0)
print('assets', time.time()-T0)

# -------------------------------------------------------------- T-поза
run('pose.py')
tpose(bpy.data.objects['Human.rig'])
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith('Human'):
        m = o.modifiers.new('Sub', 'SUBSURF'); m.levels = m.render_levels = 1
# ------------------------------------------------------------- экспорт
run('export.py'); run('textures.py'); run('headgear.py')
arm = bpy.data.objects['Human.rig']
off = -(arm.matrix_world @ arm.pose.bones['pelvis'].head)[1]
J = joints(arm, off)
BONES = list(J.keys()) + ['jaw']
BI = {b:i for i,b in enumerate(BONES)}
ob = lambda n: bpy.data.objects['Human.' + n] if n else bpy.data.objects['Human']
def head_keep(co, W):
    return (W[:, BI['head']] + W[:, BI['neck']]) > 0.35
spec = [('skin', None, head_keep, 1), ('eye','high-poly',None,0), ('brow','eyebrow001',None,0), ('lash','eyelashes02',None,0),
        ('shirt','elvs_male_shirt_untucked_bd1',None,1), ('pants','cortu_cargo_pants',None,2),
        ('vest','mindfront_tactical_vest_male',None,0), ('boot','mindfront_shoes_biker_boots_male',None,0), ('glove','toigo_gloves_short',None,1)]
meshes = {}
for name, on, keep, sub in spec:
    m = mesh_arrays(ob(on), BI, keep, sub); m['group'] = name; meshes[name] = m
    print(name, len(m['pos']), len(m['index'])//3)
def geo_arrays(gs, bone='head'):
    P=[]; T=[]; UV=[]
    for g in gs:
        assert len(g.UV) == len(g.P), (len(g.UV), len(g.P))
        base = len(P); P += g.P; UV += g.UV
        for f in g.F:
            f = [base+k for k in f]
            if len(f) == 4: T += [(f[0],f[1],f[2]),(f[0],f[2],f[3])]
            else: T.append(tuple(f))
    P = np.array(P, np.float64); T = np.array(T, np.int64)
    fn = np.cross(P[T[:,1]]-P[T[:,0]], P[T[:,2]]-P[T[:,0]])
    good = np.linalg.norm(fn,axis=1) > 1e-12
    T = T[good]; fn = fn[good]
    N = np.zeros_like(P)
    for k in range(3): np.add.at(N, T[:,k], fn)
    N /= np.linalg.norm(N,axis=1,keepdims=True)+1e-12
    # сглаживание по совпадающим позициям (шов развёртки), острые рёбра остаются
    key = np.round(P*2e4).astype(np.int64); uk, inv = np.unique(key, axis=0, return_inverse=True)
    order = np.argsort(inv); grp = np.split(order, np.cumsum(np.bincount(inv))[:-1])
    N2 = N.copy()
    for g in grp:
        if len(g) < 2: continue
        for i in g:
            m = g[(N[g] @ N[i]) > 0.64]; v = N[m].sum(0); l = np.linalg.norm(v)
            if l > 1e-9: N2[i] = v/l
    n = len(P)
    return dict(pos=P.astype(np.float32), nrm=N2.astype(np.float32), uv=np.array(UV, np.float32),
                si=np.tile(np.array([[BI[bone],0,0,0]],np.uint8),(n,1)), sw=np.tile(np.array([[255,0,0,0]],np.uint8),(n,1)),
                index=T.reshape(-1).astype(np.uint32))
# роговица (UV в сером кружке в углу) — отдельный прозрачный меш
ey = meshes['eye']; tri = ey['index'].reshape(-1,3)
isc = (ey['uv'][:,0] > 0.84) & (ey['uv'][:,1] < 0.16)
ct = isc[tri].all(1)
meshes['cornea'] = dict(ey, index=tri[ct].reshape(-1).astype(np.uint32), group='cornea')
ey['index'] = tri[~ct].reshape(-1).astype(np.uint32)
print('cornea tris', ct.sum(), 'eye tris', (~ct).sum())
H = Head(meshes['skin']['pos'], meshes['eye']['pos'])
hg, surf, _, _ = helmet(H)
hg.update(headset(H, surf))
hg['chin'] = chinstrap(H, surf, None)
bh = boonie(H)
GRP = {'helmet': ([hg['helmet']], {'head':'helmet'}), 'headHard': ([hg['helmetHard'], hg['headset']], {'head':'helmet'}),
       'headGear': ([hg['helmetLoop'], hg['chin']], {'head':'helmet'}),
       'headRubber': ([hg['helmetRubber'], hg['headsetPad'], hg['headsetRubber']], {'head':'helmet'}),
       'hat': ([bh['hat'], bh['hatBand']], {'head':'boonie'})}
for g,(lst,when) in GRP.items():
    m = geo_arrays(lst); m['group'] = g; m['when'] = when; m['double'] = True; meshes[g] = m; print(g, len(m['pos']))
# нашивка подразделения на груди плитника
vp = meshes['vest']['pos']
band = vp[(np.abs(vp[:,0]) < 0.03) & (vp[:,2] > 1.28) & (vp[:,2] < 1.46)]
zc = float(band[np.argmin(band[:,1]), 2]) if len(band) else 1.36
pg = Geo(); NUp = 8
pts = np.zeros((NUp+1, NUp+1, 3))
for j in range(NUp+1):
    for i in range(NUp+1):
        x = -0.036 + 0.072*i/NUp; z = zc - 0.032 + 0.064*j/NUp
        near = vp[(np.abs(vp[:,0]-x) < 0.012) & (np.abs(vp[:,2]-z) < 0.012)]
        y = float(near[:,1].min()) - 0.0025 if len(near) else float(band[:,1].min()) - 0.003
        pts[j,i] = (x, y, z)
pg.grid(pts, flip=True)
pm = geo_arrays([pg], 'chest')
pm['uv'] = np.array([[(i % (NUp+1))/NUp, (i // (NUp+1))/NUp] for i in range(len(pm['pos']))], np.float32)
pm['group'] = 'patch'; pm['double'] = True; meshes['patch'] = pm
sk0 = meshes['skin']
mp, mtri = balaclava(H, sk0['pos'], sk0['nrm'], sk0['index'].reshape(-1,3))
meshes['mask'] = dict(pos=mp.astype(np.float32), nrm=sk0['nrm'], uv=sk0['uv'].copy(), si=sk0['si'], sw=sk0['sw'],
                      index=mtri.reshape(-1).astype(np.uint32), group='mask', when={'mask': True}, double=True)
HAIRW = hair_weight(H, sk0['pos'])
TEX = OUT + '/tex'; os.makedirs(TEX, exist_ok=True)
sk = meshes['skin']; W0 = 2048
box, sk['uv'] = crop_uv(sk['uv'], W0, W0)
sk['tex'] = {'map': save(add_hair(skin_albedo(box), sk['uv'], sk['index'].reshape(-1,3), HAIRW), TEX, 'skin_a.jpg', 90),
             'normalMap': save(load('skins/mindfront_aksel_skin/Aksel_Skin_NRM.png').crop(box), TEX, 'skin_n.jpg', 90),
             'roughnessMap': save(load('skins/mindfront_aksel_skin/Aksel_Skin_SPEC.png', 'L').crop(box), TEX, 'skin_s.jpg', 85)}
meshes['eye']['tex'] = {'map': save(load('eyes/materials/bobby_03_diffuse_hazel_eyes/makehuman_eye_diffuse_hazel.png'), TEX, 'eye_a.jpg', 90, 512)}
meshes['brow']['tex'] = {'map': save(load('eyebrows/eyebrow001/eyebrow001.png', 'RGBA'), TEX, 'brow.png', size=256)}
meshes['lash']['tex'] = {'map': save(load('eyelashes/eyelashes02/eyelashes02.png', 'RGBA'), TEX, 'lash.png', size=256)}
meshes['shirt']['tex'] = {'map': save(load('clothes/elvs_male_shirt_untucked_bd1/shirttietex1.png'), TEX, 'shirt_a.jpg', 90)}
meshes['pants']['tex'] = {'map': save(load('clothes/cortu_cargo_pants/cargo_pants_diff.png'), TEX, 'pants_a.jpg', 88, 1024),
                          'normalMap': save(load('clothes/cortu_cargo_pants/cargo_pants_norm.png'), TEX, 'pants_n.jpg', 90, 2048)}
V='clothes/mindfront_tactical_vest_male/'
meshes['vest']['tex'] = {'map': save(vest_albedo(load(V+'Tactical_Vest.png', 'RGBA')), TEX, 'vest_a.jpg', 88, 2048),
                         'normalMap': save(load(V+'Tactical_Vest_NRM.png'), TEX, 'vest_n.jpg', 90, 2048),
                         'roughnessMap': save(load(V+'Tactical_Vest_SPEC.png','L'), TEX, 'vest_s.jpg', 85, 1024)}
Bt='clothes/mindfront_shoes_biker_boots_male/'
meshes['boot']['tex'] = {'map': save(load(Bt+'Shoes_Biker_Boots.png'), TEX, 'boot_a.jpg', 88, 1024),
                         'normalMap': save(load(Bt+'Shoes_Biker_Boots_NRM.png'), TEX, 'boot_n.jpg', 90, 1024),
                         'roughnessMap': save(load(Bt+'Shoes_Biker_Boots_SPEC.png','L'), TEX, 'boot_s.jpg', 85, 512)}
meshes['glove']['tex'] = {'map': save(load('clothes/toigo_gloves_short/Gloves03UV.png'), TEX, 'glove_a.jpg', 88)}
P0 = arm.pose.bones; Wm0 = arm.matrix_world
# --- средний линейный цвет текстуры по области развёртки (фон атласа не учитывается)
from PIL import ImageDraw as _D, Image as _I2
def uv_mean(m, file):
    im = _I2.open(os.path.join(TEX, file)).convert('RGB').resize((512,512))
    mask = _I2.new('L', (512,512), 0); d = _D.Draw(mask)
    uv = m['uv']; tri = m['index'].reshape(-1,3)
    for t in tri[::max(1, len(tri)//20000)]:
        d.polygon([(float(uv[k,0])*512, (1-float(uv[k,1]))*512) for k in t], fill=255)
    a = (np.asarray(im, np.float32)/255)**2.2; w = np.asarray(mask, np.float32)/255
    return [float((a[...,c]*w).sum()/max(w.sum(),1)) for c in range(3)]
for k in ('vest','boot','glove','shirt','pants'):
    meshes[k]['tex']['mean'] = uv_mean(meshes[k], meshes[k]['tex']['map'])
# --- верх голенища облегает ногу (байкерский ботинок слишком широкий)
bo0 = meshes['boot']['pos']; btop = float(bo0[:,2].max())
for side in ('l','r'):
    kn = Wm0 @ P0['calf_'+side].head; an = Wm0 @ P0['foot_'+side].head
    sel = np.where(np.sign(bo0[:,0]) == np.sign(kn.x))[0]
    z = bo0[sel,2]; t = np.clip((z - an.z)/(kn.z - an.z), 0, 1)[:,None]
    c = np.array([an.x, an.y])[None]*(1-t) + np.array([kn.x, kn.y])[None]*t
    k = 1 - 0.16*ss((z - (btop - 0.13))/0.11)
    bo0[sel,:2] = c + (bo0[sel,:2] - c)*k[:,None]
# --- штанины заправлены в берцы, над голенищем — напуск
P = arm.pose.bones; Wm = arm.matrix_world
pa, bo = meshes['pants']['pos'], meshes['boot']['pos']
top = float(bo[:,2].max())
for side in ('l','r'):
    kn = Wm @ P['calf_'+side].head; an = Wm @ P['foot_'+side].head
    sel_b = (np.sign(bo[:,0]) == np.sign(kn.x)); sel_p = (np.sign(pa[:,0]) == np.sign(kn.x))
    def center(z):
        t = np.clip((z - an.z) / (kn.z - an.z), 0, 1)[:,None]
        return np.array([an.x, an.y])[None] * (1-t) + np.array([kn.x, kn.y])[None] * t
    b = bo[sel_b]; cb = center(b[:,2]); rb = np.linalg.norm(b[:,:2]-cb,axis=1); ab = np.arctan2(b[:,1]-cb[:,1], b[:,0]-cb[:,0])
    rtop = np.percentile(rb[b[:,2] > top-0.02], 95)
    idx = np.where(sel_p)[0]; p = pa[idx]; cp = center(p[:,2]); d = p[:,:2]-cp; r = np.linalg.norm(d,axis=1)+1e-9; ap = np.arctan2(d[:,1], d[:,0])
    nr = r.copy()
    for i in range(len(p)):
        z = p[i,2]
        if z < top - 0.004:
            m = (np.abs(b[:,2]-z) < 0.012) & (np.abs(np.angle(np.exp(1j*(ab-ap[i])))) < 0.5)
            if m.any(): nr[i] = min(r[i], np.percentile(rb[m], 15) - 0.004)
        elif z < top + 0.05:
            u = (z - top) / 0.05
            nr[i] = max(r[i] * (1 + 0.04*np.sin(np.pi*u)), (rtop + 0.004) * (1 - u) + r[i]*u)
    pa[idx,:2] = cp + d/r[:,None]*nr[:,None]
# суставы-ориентиры (не кости): середина глаз и макушка
e = meshes['eye']['pos']; J['eyes'] = to3(e.mean(0), off)
sp = meshes['skin']['pos']; J['top'] = to3(sp[np.argmax(sp[:,2])], off)
# шероховатость из карт блеска: блестящее -> гладкое
from PIL import Image as _I
for f, lo, hi in (('skin_s.jpg', 0.38, 0.72), ('vest_s.jpg', 0.55, 0.95), ('boot_s.jpg', 0.55, 0.92)):
    a = np.asarray(_I.open(os.path.join(TEX, f)).convert('L'), np.float32) / 255
    a = a / max(np.percentile(a, 99), 1e-3)
    r = hi - (hi - lo) * np.clip(a, 0, 1)
    _I.fromarray((r * 255).astype(np.uint8)).save(os.path.join(TEX, f), quality=88)
# подошва ботинок ниже нуля: поднимаем всю модель
yoff = -float(min(to3(v, off)[1] for v in meshes['boot']['pos']))
for k in J: J[k] = (J[k][0], J[k][1] + yoff if k != 'root' else 0, J[k][2])
n = write_pack(OUT + '/soldier', meshes, {'yoff': yoff, 'bones': BONES, 'joints': {k: [round(float(x),5) for x in v] for k,v in J.items()}}, off)
print('bytes', n)
