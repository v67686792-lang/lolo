import bpy, json, struct, numpy as np, os
from mathutils import Vector
# game_engine -> скелет игры (GSkel); доли для разделённых весов
MAP = {'pelvis':{'hips':1},'spine_01':{'spine':1},'spine_02':{'spine':0.5,'chest':0.5},'spine_03':{'chest':1},
       'neck_01':{'neck':1},'head':{'head':1}}
for s,S in (('l','L'),('r','R')):
    MAP.update({f'clavicle_{s}':{f'clav{S}':1},f'upperarm_{s}':{f'shoulder{S}':1},f'lowerarm_{s}':{f'elbow{S}':1},
                f'hand_{s}':{f'wrist{S}':1},f'thigh_{s}':{f'hip{S}':1},f'calf_{s}':{f'knee{S}':1},
                f'foot_{s}':{f'ankle{S}':1},f'ball_{s}':{f'toe{S}':1}})
    for f in ('index','middle','ring','pinky','thumb'):
        for i in (1,2,3): MAP[f'{f}_0{i}_{s}'] = {f'{f}{S}{i}':1}
def to3(v, off):  # Blender Z-up, лицо -Y  ->  three Y-up, лицо -Z
    return (-v[0], v[2], v[1] + off)
def joints(arm, off):
    W = arm.matrix_world; P = arm.pose.bones
    h = lambda n: to3(W @ P[n].head, off); t = lambda n: to3(W @ P[n].tail, off)
    J = {'root': (0,0,0)}
    J['hips'] = (0, h('pelvis')[1], 0)
    J['spine'] = h('spine_01'); J['chest'] = h('spine_03'); J['neck'] = h('neck_01'); J['head'] = h('head')
    for s,S in (('l','L'),('r','R')):
        J['clav'+S]=h('clavicle_'+s); J['shoulder'+S]=h('upperarm_'+s); J['elbow'+S]=h('lowerarm_'+s)
        J['wrist'+S]=h('hand_'+s)
        w=J['wrist'+S]; sx = 1 if w[0]>0 else -1
        J['palm'+S]=(w[0]+sx*0.028, w[1], w[2])
        for f in ('index','middle','ring','pinky','thumb'):
            for i in (1,2,3): J[f'{f}{S}{i}'] = h(f'{f}_0{i}_{s}')
            J[f'{f}{S}4'] = t(f'{f}_03_{s}')
        J['hip'+S]=h('thigh_'+s); J['knee'+S]=h('calf_'+s); J['ankle'+S]=h('foot_'+s); J['toe'+S]=h('ball_'+s)
    return J
def mesh_arrays(obj, bone_index, keep_fn=None, subdiv=0):
    dg = bpy.context.evaluated_depsgraph_get()
    for m in obj.modifiers:
        if m.type=='SUBSURF': m.levels = subdiv
    dg.update()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh(preserve_all_data_layers=True, depsgraph=dg)
    me.calc_loop_triangles()
    nv = len(me.vertices)
    co = np.zeros(nv*3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1,3)
    M = np.array(obj.matrix_world, np.float32)
    co = co @ M[:3,:3].T + M[:3,3]
    nr = np.zeros(nv*3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1,3) @ M[:3,:3].T
    nr /= np.linalg.norm(nr,axis=1,keepdims=True)+1e-9
    # веса
    gnames = [g.name for g in obj.vertex_groups]
    W = np.zeros((nv, len(bone_index)), np.float32)
    for vi, v in enumerate(me.vertices):
        for g in v.groups:
            gm = MAP.get(gnames[g.group]) if g.group < len(gnames) else None
            if not gm or g.weight <= 0: continue
            for b, k in gm.items(): W[vi, bone_index[b]] += g.weight * k
    keep = np.ones(nv, bool) if keep_fn is None else keep_fn(co, W)
    tri = np.zeros(len(me.loop_triangles)*3, np.int32); me.loop_triangles.foreach_get('loops', tri); tri = tri.reshape(-1,3)
    lv = np.zeros(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
    uvl = me.uv_layers.active
    uv = np.zeros(len(me.loops)*2, np.float32)
    if uvl: uvl.data.foreach_get('uv', uv)
    uv = uv.reshape(-1,2)
    tv = lv[tri]
    tri = tri[keep[tv].all(1)]
    loops = tri.reshape(-1)
    key = np.stack([lv[loops].astype(np.float64), np.round(uv[loops,0]*8192), np.round(uv[loops,1]*8192)],1)
    uk, inv = np.unique(key, axis=0, return_inverse=True)
    first = np.zeros(len(uk), np.int64); first[inv[::-1]] = np.arange(len(loops))[::-1]
    lsel = loops[first]; vsel = lv[lsel]
    ev.to_mesh_clear()
    # топ-4 веса
    Wv = W[vsel]; idx = np.argsort(-Wv, axis=1)[:, :4]; wv = np.take_along_axis(Wv, idx, 1)
    s = wv.sum(1, keepdims=True); bad = s[:,0] <= 1e-6
    wv = np.where(bad[:,None], np.array([[1,0,0,0]],np.float32), wv/np.maximum(s,1e-6))
    idx[bad] = bone_index['hips']
    wq = np.round(wv*255).astype(np.int32); wq[:,0] += 255 - wq.sum(1)
    return dict(pos=co[vsel], nrm=nr[vsel], uv=uv[lsel], si=idx.astype(np.uint8), sw=wq.clip(0,255).astype(np.uint8),
                index=inv.reshape(-1).astype(np.uint32))
def write_pack(path, meshes, meta, off):
    blob = bytearray(); hdr = {'meshes': [], **meta}
    yo = meta.get('yoff', 0)
    def put(a):
        nonlocal blob
        while len(blob) % 4: blob += b'\0'
        o = len(blob); blob += a.tobytes(); return [o, a.size]
    for name, m in meshes.items():
        p = np.stack([-m['pos'][:,0], m['pos'][:,2] + yo, m['pos'][:,1] + off],1).astype(np.float32)
        n = np.stack([-m['nrm'][:,0], m['nrm'][:,2], m['nrm'][:,1]],1)
        nq = np.round(n*32767).clip(-32767,32767).astype(np.int16)
        ix = m['index'].astype(np.uint16) if len(p) < 65536 else m['index']
        e = {'name': name, 'group': m.get('group', name), 'count': int(len(p)),
             'pos': put(p.astype(np.float32)), 'nrm': put(nq), 'uv': put(m['uv'].astype(np.float32)),
             'si': put(m['si']), 'sw': put(m['sw']), 'index': put(ix), 'index32': bool(ix.dtype == np.uint32),
             'bmin': p.min(0).tolist(), 'bmax': p.max(0).tolist()}
        for k in ('tex','when','double'):
            if k in m: e[k] = m[k]
        hdr['meshes'].append(e)
    open(path + '.bin','wb').write(bytes(blob))
    json.dump(hdr, open(path + '.json','w'), indent=1)
    return len(blob)
