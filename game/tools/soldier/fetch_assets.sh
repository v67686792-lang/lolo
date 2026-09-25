#!/usr/bin/env bash
# Скачивает MPFB2 и паки ассетов MakeHuman в $SOLDIER_ART (по умолчанию ./.cache)
# и ставит Python 3.13 + bpy 5.2.2 в $SOLDIER_ART/venv.
set -euo pipefail
ART="${SOLDIER_ART:-$(cd "$(dirname "$0")" && pwd)/.cache}"
mkdir -p "$ART/dl" "$ART/mh"
cd "$ART"
[ -d mpfb2 ] || git clone -q --depth 1 https://github.com/makehumancommunity/mpfb2
PACKS="makehuman_system_assets/makehuman_system_assets_cc0.zip skins02/skins02_cc0.zip
equipment03/equipment03_cc-by.zip pants01/pants01_cc0.zip system_eye_materials01/system_eye_materials01_cc0.zip
shirts02/shirts02_ccby.zip shoes03/shoes03_ccby.zip gloves01/gloves01_cc0.zip"
for p in $PACKS; do
  f="dl/$(basename "$p")"
  [ -s "$f" ] || curl -sfL -o "$f" "https://files.makehumancommunity.org/asset_packs/$p" \
    || curl -sfL -o "$f" "https://files2.makehumancommunity.org/asset_packs/$p"
  (cd mh && unzip -qo "../$f")
done
if [ ! -x venv/bin/python ]; then
  uv venv -q -p 3.13 venv
  uv pip install -q -p venv/bin/python bpy==5.2.2 numpy pillow
fi
echo "ready: SOLDIER_ART=$ART $ART/venv/bin/python build.py <out>"
