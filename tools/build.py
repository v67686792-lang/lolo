#!/usr/bin/env python3
"""Собирает index.html + css/js в один автономный файл nachertalka.html."""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')

def inline_css(m):
    css = (root / m.group(1)).read_text(encoding='utf-8')
    return '<style>\n' + css + '\n</style>'

def inline_js(m):
    js = (root / m.group(1)).read_text(encoding='utf-8')
    if '</script' in js:
        raise SystemExit(f'{m.group(1)} contains </script')
    return '<script>\n' + js + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
out = root / 'nachertalka.html'
out.write_text(html, encoding='utf-8')
print(f'{out.name}: {len(html)//1024} KB')
