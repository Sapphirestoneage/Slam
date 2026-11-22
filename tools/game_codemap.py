#!/usr/bin/env python3
"""
PURPOSE  Write game/CODE-MAP.md from the game source code.
USAGE    python3 tools/game_codemap.py
INPUT    game/index.html (the load order) and the script files that it loads.
OUTPUT   game/CODE-MAP.md. Do not edit that file by hand. Run this tool again.
WHY      The game uses classic scripts with one global scope. This map shows each file and its size.
         It also finds the weak patterns that the code had before 2026-11-22, so they do not come back:
         a function that a later file replaces, a function with two declarations, an action (ACT) that
         a later place replaces, and a catch block that drops its error.
"""
import re, os, datetime

G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'game')
html = open(os.path.join(G, 'index.html'), encoding='utf8').read()
order = re.findall(r'<script src="([a-z0-9/]+\.js)(?:\?v=[0-9a-z]+)?"', html)
src = {f: open(os.path.join(G, f), encoding='utf8').read() for f in order}
allsrc = '\n'.join(src.values())
short = lambda f: f

# Top-level function declarations. Prettier puts each one at the start of a line.
decl, places = {}, {}
for f in order:
    for m in re.finditer(r'(?m)^(?:async )?function\s+([A-Za-z_$][\w$]*)', src[f]):
        decl.setdefault(m.group(1), f)
        places.setdefault(m.group(1), []).append(f)

def purpose(s):
    m = re.search(r'PURPOSE\s+(.*?)\n\s+(?:INPUT|OUTPUT|DEPENDS ON|RULES|STATE|SOURCE)\b', s[:6000], re.S)
    if m:
        t = re.sub(r'\s+', ' ', m.group(1)).strip()
    else:
        m = re.search(r'/\*+\s*(.*?)\*/', s, re.S)
        if not m or m.start() > 400:
            return ''
        t = re.sub(r'\s+', ' ', m.group(1)).strip(' =*')
        t = re.sub(r'^[a-z0-9]+\.js:\s*', '', t)
    parts = t.split('. ')
    # A first sentence of less than 30 characters says too little. Add the second sentence.
    t = (parts[0] if len(parts[0]) >= 30 or len(parts) == 1 else parts[0] + '. ' + parts[1]).strip().rstrip('.')
    return (t[:150] + '...') if len(t) > 150 else t

# 1. A later file puts a new function in the place of a function: "name = function (", "name = (...) =>", "name = otherName;"
wraps, rows = {}, []
for f in order:
    s = src[f]
    rep = []
    for m in re.finditer(r'(?m)^[ \t]*([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(function\b|\([^()\n]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>|[A-Za-z_$][\w$]*;)', s):
        n = m.group(1)
        if n not in decl or n in rep or m.group(2) in ('false;', 'true;', 'null;', 'undefined;'):
            continue
        # A line that comes after a line with a comma at its end is one part of a "const a = 1, b = 2" list: a local name.
        before = s[:m.start()].rstrip()
        if before.endswith(',') or before.endswith('(') or re.search(r'(?:const|let|var)$', before):
            continue
        rep.append(n)
        wraps.setdefault(n, []).append(f)
    lines = s.split('\n')
    rows.append((f, len(lines), len(re.findall(r'(?m)^(?:async )?function\s', s)), sum(1 for l in lines if len(l) > 300),
                 len(re.findall(r'catch\s*(?:\([^)]*\))?\s*\{\s*\}', s)) + len(re.findall(r'\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)', s)), purpose(s)))

# 2. A function with two declarations. The last one that the browser loads wins.
twice = {n: fs for n, fs in places.items() if len(fs) > 1}

# 3. An action (ACT) that is set in more than one place. The last one that the browser loads wins.
acts = {}
for f in order:
    s = src[f]
    for blk in re.finditer(r'(?ms)^([ \t]*)Object\.assign\(ACT, \{\n(.*?)^\1\}\);', s):
        ind = blk.group(1) + '  '
        for m in re.finditer(r'(?m)^' + ind + r'(?:async )?([A-Za-z_$][\w$]*)(?::|\()', blk.group(2)):
            acts.setdefault(m.group(1), []).append(f)
    m0 = re.search(r'(?ms)^const ACT = \{\n(.*?)^\};', s)
    if m0:
        for m in re.finditer(r'(?m)^  (?:async )?([A-Za-z_$][\w$]*)(?::|\()', m0.group(1)):
            acts.setdefault(m.group(1), []).append(f)
    for m in re.finditer(r'(?m)^[ \t]*ACT\.([A-Za-z_$][\w$]*)\s*=[^=]', s):
        acts.setdefault(m.group(1), []).append(f)
actmulti = {k: v for k, v in acts.items() if len(v) > 1}

unused = sorted(k for k in decl if len(re.findall(r'(?<![\w$])' + re.escape(k) + r'(?![\w$])', allsrc)) == 1)

# A function with no caller can stay when a comment directly above it starts with "NO CALLER IN THIS REPOSITORY" and gives the reason.
def kept_note(n):
    m = re.search(r'(?m)^/\* NO CALLER IN THIS REPOSITORY\. (.*?) \*/\n(?:async )?function ' + re.escape(n) + r'\b', src[decl[n]])
    return m.group(1) if m else ''
unused_notes = {n: kept_note(n) for n in unused}
no_note = [n for n in unused if not unused_notes[n]]

o = []
o.append('# SLAM the Game: code map\n')
o.append('This file is generated. Do not edit it. Run `python3 tools/game_codemap.py`.\n')
o.append(f'Date: {datetime.date.today().isoformat()}. Files: {len(order)}. Lines: {sum(r[1] for r in rows):,}. '
         f'Top-level functions: {len(decl)}. Replaced functions: {len(wraps)}, in {sum(len(v) for v in wraps.values())} places. '
         f'Functions with two declarations: {len(twice)}. Hidden errors: {sum(r[4] for r in rows)}.\n')
o.append('## 1. Files in load order\n')
o.append('The browser loads the files in this order. A file can use all names from the files above it.\n')
o.append('| # | File | Lines | Functions | Lines > 300 chars | Hidden errors | Purpose |')
o.append('|---|------|------:|----------:|------------------:|--------------:|---------|')
for i, r in enumerate(rows, 1):
    o.append(f'| {i} | `{r[0]}` | {r[1]:,} | {r[2]} | {r[3]} | {r[4]} | {r[5] or "No header comment."} |')
o.append('\n"Hidden errors" is the number of `catch` blocks that are empty. An empty block drops the error with no record.\n')
o.append('## 2. Replaced functions\n')
o.append('A replaced function is a function that a later file puts a new function in the place of. '
         'Before 2026-11-22 the game had 61 of these, in 113 places. Now each base function calls its parts by name. '
         'The target for this table is: no rows.\n')
if wraps:
    o.append('| Function | Defined in | Replaced in (load order) | Layers |')
    o.append('|----------|------------|--------------------------|-------:|')
    for n, fs in sorted(wraps.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        o.append(f'| `{n}` | `{decl[n]}` | {", ".join("`" + x + "`" for x in fs)} | {len(fs)} |')
else:
    o.append('No rows: no function is replaced.')
o.append('\n### Functions with two declarations\n')
o.append('When two top-level functions have the same name, the one that the browser loads last wins, and the other one never runs. '
         'This is a defect each time. The target is: no rows.\n')
if twice:
    o.append('| Function | Declared in |')
    o.append('|----------|-------------|')
    for n, fs in sorted(twice.items()):
        o.append(f'| `{n}` | {", ".join("`" + x + "`" for x in fs)} |')
else:
    o.append('No rows.')
o.append('\n### Actions (ACT) that are set in more than one place\n')
o.append('`ACT[name]` runs when the player taps a button with `data-a="name"`. '
         f'{len(actmulti)} of {len(acts)} actions are set in more than one place. The last place wins. '
         'Most later places keep the earlier action, call it, and add to it. To read one action, read all places in its row, in order.\n')
o.append('| Action | Set in (load order) | Places |')
o.append('|--------|---------------------|-------:|')
for n, fs in sorted(actmulti.items(), key=lambda kv: (-len(kv[1]), kv[0])):
    o.append(f'| `{n}` | {", ".join("`" + x + "`" for x in fs)} | {len(fs)} |')
o.append('\n## 3. Functions with no caller\n')
o.append('These names occur one time in the game source. A function can stay only when a comment above it starts with '
         '`NO CALLER IN THIS REPOSITORY` and gives the reason. Functions without that comment go to `game/unused/`. '
         'The target is: no function without a reason.\n')
if unused:
    o.append('| Function | File | Reason to keep it |')
    o.append('|----------|------|-------------------|')
    for n in unused:
        o.append(f'| `{n}` | `{decl[n]}` | {unused_notes[n] or "NO REASON GIVEN. Examine this function."} |')
    o.append('')
else:
    o.append('None.\n')
open(os.path.join(G, 'CODE-MAP.md'), 'w', encoding='utf8').write('\n'.join(o))
print('files', len(order), 'wraps', len(wraps), sum(len(v) for v in wraps.values()), 'twice', len(twice), 'act', len(actmulti), 'no caller', len(unused), 'with no reason', len(no_note),
      'hidden errors', sum(r[4] for r in rows), 'no header', sum(1 for r in rows if not r[5]))
