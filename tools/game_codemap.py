#!/usr/bin/env python3
"""
PURPOSE  Write game/CODE-MAP.md from the game source code.
USAGE    python3 tools/game_codemap.py
INPUT    game/index.html (the load order) and game/*.js.
OUTPUT   game/CODE-MAP.md. Do not edit that file by hand. Run this tool again.
WHY      The game uses classic scripts with one global scope. A later file can
         replace a function from an earlier file. This map shows each file, its
         size, and each replaced function, so a reader can find all the layers.
"""
import re, os, datetime

G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
html = open(os.path.join(G, 'index.html'), encoding='utf8').read()
order = re.findall(r'<script src="([a-z0-9]+\.js)"', html)
src = {f: open(os.path.join(G, f), encoding='utf8').read() for f in order}
allsrc = '\n'.join(src.values())

decl = {}
for f in order:
    for m in re.finditer(r'(?m)^(?:async )?function\s+([A-Za-z_$][\w$]*)', src[f]):
        decl.setdefault(m.group(1), f)

def purpose(s):
    m = re.search(r'/\*+\s*(.*?)\*/', s, re.S)
    if not m or m.start() > 400:
        return ''
    t = re.sub(r'\s+', ' ', m.group(1)).strip(' =*')
    t = re.sub(r'^[a-z0-9]+\.js:\s*', '', t)
    t = t.split('. ')[0].strip()
    return (t[:150] + '...') if len(t) > 150 else t

wraps = {}
rows = []
for f in order:
    s = src[f]
    rep = []
    for m in re.finditer(r'(?<![\w.$])([A-Za-z_$][\w$]*)\s*=\s*function\s*\(', s):
        n = m.group(1)
        if n in decl and n not in rep:
            rep.append(n)
            wraps.setdefault(n, []).append(f)
    lines = s.split('\n')
    rows.append((f, len(lines), len(re.findall(r'(?m)^(?:async )?function\s', s)), sum(1 for l in lines if len(l) > 300),
                 len(re.findall(r'catch\s*\(e\)\s*\{\s*\}', s)), purpose(s), rep))

unused = sorted(k for k in decl if len(re.findall(r'(?<![\w$])' + re.escape(k) + r'(?![\w$])', allsrc)) == 1)

o = []
o.append('# SLAM the Game: code map\n')
o.append('This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.\n')
o.append(f'Date: {datetime.date.today().isoformat()}. Files: {len(order)}. Lines: {sum(r[1] for r in rows):,}. '
         f'Top-level functions: {len(decl)}. Replaced functions: {len(wraps)}, in {sum(len(v) for v in wraps.values())} places.\n')
o.append('## 1. Files in load order\n')
o.append('The browser loads the files in this order. A file can use all names from the files above it.\n')
o.append('| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |')
o.append('|---|------|------:|----------:|------------------:|--------------:|---------|')
for i, r in enumerate(rows, 1):
    o.append(f'| {i} | `{r[0]}` | {r[1]:,} | {r[2]} | {r[3]} | {r[4]} | {r[5] or "No header comment."} |')
o.append('\n"Hidden errors" is the number of `catch (e) {}` blocks that drop an error with no message.\n')
o.append('## 2. Replaced functions\n')
o.append('Each row shows one function, the file that defines it, and the later files that replace it. '
         'Each later file keeps the earlier function and adds to its result. To read one screen, read all files in its row, in order.\n')
o.append('| Function | Defined in | Replaced in (load order) | Layers |')
o.append('|----------|------------|--------------------------|-------:|')
for n, fs in sorted(wraps.items(), key=lambda kv: (-len(kv[1]), kv[0])):
    o.append(f'| `{n}` | `{decl[n]}` | {", ".join("`" + x + "`" for x in fs)} | {len(fs)} |')
o.append('\n## 3. Functions with no caller\n')
o.append('These names occur one time in the game source. Some are used only by the tests or by the private add-ons. Examine each one before removal.\n')
o.append(', '.join('`' + u + '`' for u in unused) + '\n')
open(os.path.join(G, 'CODE-MAP.md'), 'w', encoding='utf8').write('\n'.join(o))
print('files', len(order), 'wraps', len(wraps), sum(len(v) for v in wraps.values()), 'unused', len(unused),
      'hidden errors', sum(r[4] for r in rows), 'no header', sum(1 for r in rows if not r[5]))
