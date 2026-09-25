import numpy as np, os
from PIL import Image, ImageFilter
MH = os.path.join(ART, 'mh')
def load(p, mode='RGB'): return Image.open(os.path.join(MH, p)).convert(mode)
def save(im, out, name, q=88, size=None):
    if size and max(im.size) > size:
        k = size / max(im.size); im = im.resize((max(1,round(im.size[0]*k)), max(1,round(im.size[1]*k))), Image.LANCZOS)
    p = os.path.join(out, name)
    if name.endswith('.png'): im.save(p, optimize=True)
    else: im.convert('RGB').save(p, quality=q, optimize=True, progressive=True)
    return os.path.basename(p)
def crop_uv(uv, W, H, pad=12):
    u0, v0 = uv.min(0); u1, v1 = uv.max(0)
    x0 = max(0, int(u0*W)-pad); x1 = min(W, int(np.ceil(u1*W))+pad)
    y0 = max(0, int((1-v1)*H)-pad); y1 = min(H, int(np.ceil((1-v0)*H))+pad)
    box = (x0, y0, x1, y1)
    nu = (uv[:,0]*W - x0) / (x1-x0); nv = ((uv[:,1]*H) - (H-y1)) / (y1-y0)
    return box, np.stack([nu, nv], 1).astype(np.float32)
def skin_albedo(box):
    base = np.asarray(load('skins/young_caucasian_male/young_lightskinned_male_diffuse.png').crop(box), np.float32)
    beard = load('skins/jartur69_middleage_slavic_male_with_genitals_and_beard/Jartur_mid_old_Slavic_Male_with_Genitals_and_Beard_lsdif_lighter.png').crop(box)
    b = np.asarray(beard, np.float32)
    blur = np.asarray(beard.filter(ImageFilter.GaussianBlur(24)), np.float32)
    # высокочастотная часть кожи «с бородой»: щетина, поры, волосы на скальпе
    ratio = np.clip(b / np.maximum(blur, 1), 0.3, 1.6)
    lum = ratio.mean(2, keepdims=True)
    darkfield = np.clip(np.asarray(beard.filter(ImageFilter.GaussianBlur(6)), np.float32).mean(2, keepdims=True) / np.maximum(blur.mean(2,keepdims=True),1), 0, 2)
    out = base * np.power(lum, 0.55)
    # лёгкое общее затемнение там, где у jartur борода/волосы (низкочастотно)
    bl = np.asarray(beard.filter(ImageFilter.GaussianBlur(10)), np.float32).mean(2, keepdims=True)
    ref = np.asarray(beard.filter(ImageFilter.GaussianBlur(60)), np.float32).mean(2, keepdims=True)
    shade = np.clip(bl / np.maximum(ref, 1), 0.5, 1.1)
    out *= np.power(shade, 0.35)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
def gray_detail(p, box=None):
    im = load(p)
    if box: im = im.crop(box)
    return im

def raster_attr(uv, tri, val, W, H):
    """растеризация вершинного атрибута в текстуру по UV (барицентрика)"""
    img = np.zeros((H, W), np.float32); cov = np.zeros((H, W), np.float32)
    px = uv[:,0]*W - 0.5; py = (1-uv[:,1])*H - 0.5
    for a,b,c in tri:
        xs = px[[a,b,c]]; ys = py[[a,b,c]]
        x0, x1 = max(0,int(np.floor(xs.min()))), min(W-1,int(np.ceil(xs.max())))
        y0, y1 = max(0,int(np.floor(ys.min()))), min(H-1,int(np.ceil(ys.max())))
        if x1 < x0 or y1 < y0: continue
        X, Y = np.meshgrid(np.arange(x0,x1+1), np.arange(y0,y1+1))
        d = (ys[1]-ys[2])*(xs[0]-xs[2]) + (xs[2]-xs[1])*(ys[0]-ys[2])
        if abs(d) < 1e-12: continue
        l0 = ((ys[1]-ys[2])*(X-xs[2]) + (xs[2]-xs[1])*(Y-ys[2]))/d
        l1 = ((ys[2]-ys[0])*(X-xs[2]) + (xs[0]-xs[2])*(Y-ys[2]))/d
        l2 = 1-l0-l1
        m = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        v = l0*val[a] + l1*val[b] + l2*val[c]
        img[Y[m], X[m]] = v[m]; cov[Y[m], X[m]] = 1
    return img, cov
def add_hair(im, uv, tri, w):
    W, Hh = im.size
    m, cov = raster_attr(uv, tri, w, W, Hh); m = np.nan_to_num(np.clip(m,0,1))
    m = np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32)/255
    a = np.asarray(im, np.float32)
    rng = np.random.default_rng(3)
    grain = rng.random((Hh, W)).astype(np.float32)
    grain = np.asarray(Image.fromarray((grain*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32)/255
    dens = np.clip(0.55 + (grain-0.5)*1.6, 0, 1) * m
    hair = np.array([34, 26, 20], np.float32)
    out = a*(1 - 0.82*dens[...,None]) + hair*0.82*dens[...,None]
    # синеватый подтон выбритой кожи головы
    out = out*(1 - 0.10*m[...,None]) + np.array([120,110,108],np.float32)*0.10*m[...,None]
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))

def vest_albedo(im):
    """Щели MOLLE в исходнике — дизеринговая полупрозрачная сетка поверх
       чёрного: после перекраски жилет читался решёткой. Заливаем щели целиком
       цветом окружающей кордуры в тени строп — сплошная панель с рядами лент."""
    rgba = np.asarray(im.convert('RGBA'), np.float32)
    a = rgba[..., :3]; al = rgba[..., 3] / 255
    def blur(x, r):
        return np.asarray(Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32)
    alb = blur(al * 255, 4) / 255
    region = np.clip((0.95 - alb) / 0.12, 0, 1)                 # 1 в щели
    good = (alb > 0.985).astype(np.float32)
    num = np.stack([blur(a[..., c] * good, 30) for c in range(3)], -1)
    den = blur(good * 255, 30)[..., None] / 255
    panel = num / np.maximum(den, 1e-3)
    rng = np.random.default_rng(5)
    weave = 1 + (blur(rng.random(al.shape) * 255, 0.8) / 255 - 0.5) * 0.18
    fill = panel * 0.70 * weave[..., None]
    out = a * (1 - region[..., None]) + fill * region[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
