import bpy, math
from mathutils import Vector, Matrix, Quaternion
def tpose(arm):
    """Руки строго по ±X, ладони вниз, пальцы прямые; ноги вертикально."""
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    P = arm.pose.bones
    W = arm.matrix_world
    def upd(): bpy.context.view_layer.update()
    def head(n): return W @ P[n].head
    def tail(n): return W @ P[n].tail
    def aim(n, d, roll_fn=None):
        pb = P[n]
        M = W @ pb.matrix
        cur = (M.to_3x3() @ Vector((0,1,0))).normalized()
        q = cur.rotation_difference(d.normalized())
        R = q.to_matrix().to_4x4()
        loc = M.translation.copy()
        M2 = Matrix.Translation(loc) @ R @ Matrix.Translation(-loc) @ M
        pb.matrix = W.inverted() @ M2
        upd()
    def twist(n, axis, ang):
        pb = P[n]; M = W @ pb.matrix; loc = M.translation.copy()
        R = Quaternion(axis.normalized(), ang).to_matrix().to_4x4()
        pb.matrix = W.inverted() @ (Matrix.Translation(loc) @ R @ Matrix.Translation(-loc) @ M); upd()
    for s, S in ((1,'l'),(-1,'r')):
        d = Vector((s,0,0))
        for n in ('upperarm_','lowerarm_','hand_'): aim(n+S, d)
        # ладонь вниз: нормаль ладони = cross(вдоль пальцев, поперёк) * s
        a = (head('middle_01_'+S) - head('hand_'+S)).normalized()
        b = (head('index_01_'+S) - head('pinky_01_'+S)).normalized()
        nrm = a.cross(b) * s
        nrm_p = (nrm - d * nrm.dot(d)).normalized()
        ang = nrm_p.angle(Vector((0,0,-1)))
        sgn = 1 if nrm_p.cross(Vector((0,0,-1))).dot(d) > 0 else -1
        twist('lowerarm_'+S, d, sgn*ang*0.5)
        twist('hand_'+S, d, sgn*ang*0.5)
        # пальцы: вдоль горизонтальной проекции направления «запястье -> костяшка»
        hw = head('hand_'+S)
        for f in ('index','middle','ring','pinky'):
            k = head(f+'_01_'+S)
            fd = k - hw; fd.z = 0; fd.normalize()
            fd = (fd + d*1.5).normalized()
            for i in ('01','02','03'): aim(f+'_'+i+'_'+S, fd)
        # большой палец: вдоль руки, на 22° вперёд (-Y) и на 12° вниз
        td = Vector((s*math.cos(math.radians(22)), -math.sin(math.radians(22)), 0))
        td = (td*math.cos(math.radians(12)) + Vector((0,0,-math.sin(math.radians(12))))).normalized()
        for i in ('01','02','03'): aim('thumb_'+i+'_'+S, td)
        # ноги вертикально
        for n in ('thigh_','calf_'): aim(n+S, Vector((0,0,-1)))
    bpy.ops.object.mode_set(mode='OBJECT')
