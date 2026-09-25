# Подключение MPFB2 к bpy и импорт его сервисов. Расширение и ассеты
# MakeHuman берутся из $SOLDIER_ART (см. fetch_assets.sh).
import bpy, os, sys, shutil, importlib, addon_utils
_ext = bpy.utils.user_resource('EXTENSIONS', path='user_default', create=True)
if not os.path.exists(os.path.join(_ext, 'mpfb')):
    shutil.copytree(os.path.join(ART, 'mpfb2', 'src', 'mpfb'), os.path.join(_ext, 'mpfb'))
    bpy.utils.refresh_script_paths()
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
def imp(pkg, key):
    for m in list(sys.modules):
        if m.endswith(pkg): return getattr(importlib.import_module(m), key)
    raise ImportError(pkg)
HumanService = imp('mpfb.services.humanservice', 'HumanService')
AssetService = imp('mpfb.services.assetservice', 'AssetService')
TargetService = imp('mpfb.services.targetservice', 'TargetService')
ObjectService = imp('mpfb.services.objectservice', 'ObjectService')
LocationService = imp('mpfb.services.locationservice', 'LocationService')
# ассеты MakeHuman — в пользовательский каталог данных MPFB
_data = LocationService.get_user_data()
os.makedirs(_data, exist_ok=True)
for _d in os.listdir(os.path.join(ART, 'mh')):
    _l = os.path.join(_data, _d)
    if not os.path.exists(_l): os.symlink(os.path.join(ART, 'mh', _d), _l)
