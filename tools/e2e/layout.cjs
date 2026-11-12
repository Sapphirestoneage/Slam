// The layout checker: the owner's repeat design complaints (DESIGN.md) as checks that fail.
// Serve the app (python3 -m http.server 8767), then: node tools/e2e/layout.cjs
// Visits every screen in walkthrough.cjs at 1440, 1280 and 390 wide, light and dark, for the Demo client and for a
// brand-new client made through the UI and Fast Track (batch 46: its Home before and after an age, the plan from an
// age), opens Details panels on the list screens, and runs nine checks:
//   level    boxes (and their labels) in one visual row start at the same top edge, within 2px
//   clipped  inputs, selects, buttons and cut-off text show in full
//   overflow no sideways scroll and nothing past the right edge
//   covered  toasts, bars and the Report this button sit over nothing interactive they do not belong to
//   askable  every What's missing item lands on a visible, enabled box (focus or a highlight around it)
//   column   (batch 19) in repeated rows (a table, or a list of same-looking rows) the same kind of control shares
//            its left and right edges, within 2px
//   sticky   (batch 19) a sticky header or footer that has left its place never sits over a row's controls (checked at
//            the top, the bottom, and with each long list part way up the screen)
//   unlabeled (batch 19) a button with no words has a name and a hover tip, and a picture everyone reads the same way
//   cramped  (batch 19) at least 6px between the controls of two adjacent rows
// Writes layout.json, report.md and up to 3 screenshots per check to LAYOUT_OUT (default: <tmp>/slam-layout, never the
// repo). Exit code 1 when any check fails. Env: SLAM_URL (default http://localhost:8767); LAYOUT_OFFLINE=1 or 0 forces
// the stand-ins for the blocked CDN and fonts on or off (default: on when the local ECharts file exists); ECHARTS: the
// local echarts.min.js; LAYOUT_QUICK=1 runs 1440 light only. While fixing: LAYOUT_ROUTES=budget,debt (part of the
// route), LAYOUT_WIDTHS=1280,390, LAYOUT_THEMES=light, LAYOUT_CLIENTS=New narrow the run.
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); } catch { ({ chromium } = require('playwright')); }

const BASE = process.env.SLAM_URL || 'http://localhost:8767';
const OUT = process.env.LAYOUT_OUT || path.join(os.tmpdir(), 'slam-layout');
const ECHARTS = process.env.ECHARTS || '/tmp/claude-0/-home-claude/5ae6d13c-3802-502b-b29a-86ed1541b542/scratchpad/ut/node_modules/echarts/dist/echarts.min.js';
const OFFLINE = process.env.LAYOUT_OFFLINE ? process.env.LAYOUT_OFFLINE === '1' : fs.existsSync(ECHARTS);
const QUICK = process.env.LAYOUT_QUICK === '1';
// The same screens as the walkthrough, read from it so the two lists never drift.
const ROUTES = (() => {
  const src = fs.readFileSync(path.join(__dirname, 'walkthrough.cjs'), 'utf8');
  const m = src.match(/const ROUTES = \[([\s\S]*?)\];/);
  return m[1].match(/'#\/[^']+'/g).map(s => s.slice(1, -1));
})();
const WIDTHS = process.env.LAYOUT_WIDTHS ? process.env.LAYOUT_WIDTHS.split(',').map(Number) : QUICK ? [1440] : [1440, 1280, 390];
const THEMES = process.env.LAYOUT_THEMES ? process.env.LAYOUT_THEMES.split(',') : QUICK ? ['light'] : ['light', 'dark'];
const ONLY = process.env.LAYOUT_ROUTES ? process.env.LAYOUT_ROUTES.split(',') : null; // batch 19: a few screens while fixing them
const CLIENTS = process.env.LAYOUT_CLIENTS ? process.env.LAYOUT_CLIENTS.split(',') : ['Demo', 'New', 'Shift', 'Start']; // batch 51: Shift, a client with shift rows (the dancer persona)
const CHECKS = ['level', 'clipped', 'overflow', 'covered', 'askable', 'column', 'sticky', 'unlabeled', 'cramped'];
const STILL = ['level', 'clipped', 'overflow', 'column', 'unlabeled', 'cramped']; // what a scan of a screen at rest runs
const SHOTS_PER_CHECK = 3;

const failures = [];
const ignored = { clippedWithTitle: 0, srOnly: 0, coveredByPopover: 0 };
const shots = Object.fromEntries(CHECKS.map(c => [c, []]));
const errors = [];

// ---------- in-page scan (runs inside the browser; must not use anything from Node) ----------
function scan(opt) {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const vis = el => !!el && el.isConnected && el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && (() => { const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1; })();
  const norm = s => String(s || '').replace(/\b[a-z0-9]{8,}(?=:)/gi, '<id>').replace(/\s+/g, ' ').trim();
  const desc = el => {
    const parts = [];
    for (let e = el, i = 0; e && e !== document.body && i < 4; e = e.parentElement, i++) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += `#${e.id}`;
      const cls = [...e.classList].filter(c => c !== 'glow').slice(0, 3);
      if (cls.length) s += `.${cls.join('.')}`;
      if (e.dataset?.focus) s += `[data-focus="${norm(e.dataset.focus)}"]`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const rectOf = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const labelOf = item => {
    const l = item.querySelector?.('.label, label:not(.field):not(.check) > span:first-child, legend, h3, strong');
    const t = (l?.textContent || item.getAttribute?.('aria-label') || item.textContent || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 60);
  };
  const add = (check, el, text, detail, extra = {}) => out.push({ check, selector: el ? desc(el) : '', text: text || '', detail, rect: el ? rectOf(el) : null, ...extra });

  // ----- level -----
  if (opt.checks.includes('level')) {
    const CTRL = 'label.field, .field, .seg, textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file])';
    const boxes = [...document.querySelectorAll(CTRL)].filter(b => !b.parentElement.closest('label.field, .field, .seg') && vis(b));
    const isRow = el => {
      if (el.tagName === 'TR') return true;
      const cs = getComputedStyle(el);
      if (cs.display.includes('grid')) return true;
      return cs.display.includes('flex') && !cs.flexDirection.startsWith('column');
    };
    const containers = new Set();
    for (const b of boxes) for (let p = b.parentElement; p && p !== document.body; p = p.parentElement) if (isRow(p)) containers.add(p);
    for (const c of containers) {
      const items = [];
      for (const child of c.children) {
        if (!vis(child)) continue;
        const inside = boxes.filter(b => b === child || child.contains(b));
        if (!inside.length || inside.length > 3) continue;
        const tops = [...new Set(inside.map(b => Math.round(b.getBoundingClientRect().top / 4)))];
        if (c.tagName === 'TR' && tops.length > 1) continue; // a cell with two boxes stacked (Institution over the name) is its own column
        const box = inside[0];
        const lab = child === box ? null : [...child.querySelectorAll('.label')].find(l => vis(l) && (l.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING));
        items.push({ child, box, ir: child.getBoundingClientRect(), br: box.getBoundingClientRect(), lab, lr: lab?.getBoundingClientRect() });
      }
      if (items.length < 2) continue;
      // Visual rows: items whose boxes overlap by half the smaller height and sit side by side.
      const parent = items.map((_, i) => i);
      const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i].ir, b = items[j].ir;
        const ov = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const side = a.right <= b.left + 2 || b.right <= a.left + 2;
        if (side && ov >= 0.5 * Math.min(a.height, b.height)) parent[find(i)] = find(j);
      }
      const groups = {};
      items.forEach((it, i) => (groups[find(i)] ??= []).push(it));
      for (const g of Object.values(groups)) {
        if (g.length < 2) continue;
        const tr = c.tagName === 'TR'; // a table row centres its cells: compare centre lines there, top edges elsewhere
        const tops = g.map(it => (tr ? it.br.top + it.br.height / 2 : it.br.top));
        const spread = Math.max(...tops) - Math.min(...tops);
        if (spread > 2) {
          const low = g[tops.indexOf(Math.max(...tops))];
          add('level', low.box, g.map(it => labelOf(it.child)).join(' | '),
            `box ${tr ? 'centres' : 'tops'} differ by ${Math.round(spread)}px in one row (${g.map((it, i) => `${labelOf(it.child) || '?'} @${Math.round(tops[i] - Math.min(...tops))}`).join(', ')})`, { container: desc(c) });
        }
        const labs = g.filter(it => it.lab);
        if (labs.length >= 2) {
          const lt = labs.map(it => it.lr.top);
          const ls = Math.max(...lt) - Math.min(...lt);
          if (ls > 2) {
            const low = labs.reduce((a, b) => (b.lr.top > a.lr.top ? b : a));
            add('level', low.lab, labs.map(it => it.lab.textContent.trim().slice(0, 40)).join(' | '), `label tops differ by ${Math.round(ls)}px in one row`, { container: desc(c), sub: 'label' });
          }
        }
      }
    }
  }

  // level, part two: helper text beside a box (not under it) that is taller than the box and pushes it down.
  if (opt.checks.includes('level')) {
    const CTRL = 'label.field, .field, .seg, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden])';
    for (const box of document.querySelectorAll(CTRL)) {
      if (box.parentElement.closest('label.field, .field, .seg') || !vis(box)) continue;
      const row = box.parentElement, cs = getComputedStyle(row);
      if (!cs.display.includes('flex') || cs.flexDirection.startsWith('column') || row.tagName === 'TD') continue;
      const br = box.getBoundingClientRect();
      const text = [...row.children].filter(k => k !== box && vis(k) && !k.querySelector(CTRL) && !k.matches(CTRL) && k.textContent.trim().length > 20);
      for (const t of text) {
        const tr = t.getBoundingClientRect();
        if (tr.height > br.height + 8 && br.top - tr.top > 2 && Math.min(tr.bottom, br.bottom) > Math.max(tr.top, br.top)) {
          add('level', box, `${labelOf(row)}`.slice(0, 60), `helper text beside the box ("${t.textContent.trim().slice(0, 40)}") is ${Math.round(tr.height)}px tall and pushes the box ${Math.round(br.top - tr.top)}px down; put it under the box`, { sub: 'pushed', container: desc(row) });
          break;
        }
      }
    }
  }

  // ----- clipped -----
  if (opt.checks.includes('clipped')) {
    const cv = document.createElement('canvas').getContext('2d');
    const textW = (el, text, pseudo) => { const cs = getComputedStyle(el, pseudo); cv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; return cv.measureText(text).width; };
    const inner = el => { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
    const full = el => (el.getAttribute('title') || el.dataset.tip || '');
    for (const el of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), textarea')) {
      if (!vis(el)) continue;
      if (el.value) { if (el.tagName === 'INPUT' && el.scrollWidth > el.clientWidth + 1) add('clipped', el, el.value, `value is ${el.scrollWidth - el.clientWidth}px wider than its box`); }
      else if (el.placeholder) { const w = textW(el, el.placeholder, '::placeholder'); const room = inner(el); if (w > room + 1) add('clipped', el, el.placeholder, `placeholder needs ${Math.ceil(w)}px, box has ${Math.floor(room)}px`); }
    }
    for (const el of document.querySelectorAll('select')) {
      if (!vis(el)) continue;
      const t = el.selectedOptions[0]?.textContent?.trim();
      if (!t) continue;
      const w = textW(el, t), room = inner(el) - 18; // the native arrow
      if (w > room + 1) add('clipped', el, t, `selected value needs ${Math.ceil(w)}px, box has ${Math.floor(room)}px beside the arrow`);
    }
    let btnIgn = 0;
    for (const el of document.querySelectorAll('button, .btn, a.btn')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el);
      const wide = el.scrollWidth > el.clientWidth + 1, tall = cs.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1;
      if (!wide && !tall) continue;
      const t = el.textContent.trim();
      if (!t) continue;
      if (full(el).includes(t) || (el.getAttribute('aria-label') || '').includes(t)) { btnIgn++; continue; }
      add('clipped', el, t.slice(0, 60), wide ? `text is ${el.scrollWidth - el.clientWidth}px wider than the button` : 'text is cut off at the bottom');
    }
    let ign = 0, srIgn = 0;
    for (const el of document.querySelectorAll('body *')) {
      if (el.matches('input, select, textarea, button, .btn, svg, svg *, canvas, img, table, tbody, thead, tr')) continue;
      const cs = getComputedStyle(el);
      const ell = cs.textOverflow === 'ellipsis';
      const hid = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      if (!ell && !hid) continue;
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!ell && !own) continue;
      if (!vis(el) || el.scrollWidth <= el.clientWidth + 1) continue;
      if (el.clientWidth <= 2 || el.clientHeight <= 2 || el.closest('.sr')) { srIgn++; continue; } // screen-reader-only text is hidden on purpose
      const t = el.textContent.replace(/\s+/g, ' ').trim();
      if (!t) continue;
      if (full(el) && full(el).replace(/\s+/g, ' ').includes(t)) { ign++; continue; }
      add('clipped', el, t.slice(0, 60), `text cut off: needs ${el.scrollWidth}px, shows ${el.clientWidth}px`);
    }
    out.ignoredWithTitle = ign + btnIgn;
    out.srOnly = srIgn;
  }

  // ----- overflow -----
  if (opt.checks.includes('overflow')) {
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) add('overflow', document.documentElement, '', `the page scrolls sideways: ${sw}px wide in a ${vw}px window`);
    // An element past the edge inside a box that clips or scrolls is not page overflow. A box that scrolls sideways
    // is reported once (rule 3), except the sub-tab strip, which scrolls on a phone by design.
    const holder = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' && p.getBoundingClientRect().right <= vw + 1) return p; } return null; };
    const strips = new Set();
    const bad = [...document.querySelectorAll('body *')].filter(el => {
      if (el.matches('svg *, option')) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right <= vw + 1) return false;
      if (getComputedStyle(el).position === 'fixed' && r.left >= vw) return false; // parked off the side on purpose
      if (!vis(el)) return false;
      const hd = holder(el);
      if (hd) { const ox = getComputedStyle(hd).overflowX; if ((ox === 'auto' || ox === 'scroll') && !hd.closest('.subtabs, .tabs, .topbar')) strips.add(hd); return false; }
      return true;
    });
    for (const el of bad) if (!bad.includes(el.parentElement)) add('overflow', el, el.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), `right edge at ${Math.round(el.getBoundingClientRect().right)}px in a ${vw}px window`);
    for (const st of strips) add('overflow', st, st.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), `this box scrolls sideways: ${st.scrollWidth}px of content in ${st.clientWidth}px`, { sub: 'inner' });
  }

  // ----- covered -----
  if (opt.checks.includes('covered')) {
    const INTER = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [tabindex="0"], h1, h2, h3, th';
    const overlays = [...document.querySelectorAll('body *')].filter(el => {
      if (!vis(el)) return false;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
      if (el.matches('[aria-modal="true"], .ft-overlay, .find-overlay') || el.closest('[aria-modal="true"]')) return false; // a modal covers the page on purpose
      if (cs.position === 'sticky' && !el.matches('.bulk-host, .bulk-bar')) return false; // sticky headers ride in flow; the bulk bar floats
      if (el.parentElement.closest('.toast, .pop, .report-this, .tracker, .parking-dock, .tabs, .bulk-host, .topbar, .subtabs')) return false;
      return true;
    });
    for (const ov of overlays) {
      const isPop = ov.matches('.pop');
      const o = ov.getBoundingClientRect();
      const seen = new Set();
      for (const el of document.querySelectorAll(INTER)) {
        if (ov.contains(el) || el.contains(ov) || !vis(el)) continue;
        const r = el.getBoundingClientRect();
        const x1 = Math.max(r.left, o.left), x2 = Math.min(r.right, o.right), y1 = Math.max(r.top, o.top), y2 = Math.min(r.bottom, o.bottom);
        if (x2 - x1 < 4 || y2 - y1 < 4) continue;
        const pt = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
        if (!pt || !ov.contains(pt)) continue;
        if (el.closest('.toast, .pop, .report-this, .tracker, .tabs, .topbar, .subtabs') && getComputedStyle(el.closest('.toast, .pop, .report-this, .tracker, .tabs, .topbar, .subtabs')).zIndex > getComputedStyle(ov).zIndex) continue;
        if (isPop) { out.coveredByPopover = (out.coveredByPopover || 0) + 1; continue; } // an open popover sits over the page by design
        const t = (el.textContent || el.getAttribute('aria-label') || el.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const key = `${desc(el)}|${t}`;
        if (seen.has(key)) continue;
        seen.add(key);
        add('covered', el, t, `${desc(ov).split(' > ').pop()} ("${ov.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}") sits over it ${opt.where || ''}`.trim(), { overlay: desc(ov) });
      }
    }
  }
  // ----- batch 19: the repeated rows of a table or list (column, cramped, sticky share them) -----
  // A table's rows are its tbody rows with real cells (not a group header, a note or an open Details panel). A list
  // outside a table is three or more siblings with the same tag and classes, stacked one under the other, each holding
  // a control. Each control has a kind (box, select, toggle, status, or a button by its class) and an ordinal among its
  // kind in its cell (tables) or row (lists): that pair is its column.
  const CTRLS = 'label.field, .field, input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), select, textarea, button, a.btn, .seg, [role=button]';
  const BTN_SIG = ['status-btn', 'caret', 'menu-btn', 'will-get', 'from-btn', 'use-typical', 'icon-btn', 'fold', 'pick', 'tag', 'math'];
  // Fixed-size controls share both edges; a button that shows its own words or a value (Use $120, a date) lines up on one.
  const BOTH = ['box', 'box.pct', 'box.note', 'select', 'status', 'button.caret', 'button.menu-btn', 'button.will-get', 'button.icon-btn', 'button.from-btn'];
  const kindOf = el => {
    if (el.matches('select') || (el.matches('.field') && el.querySelector('select'))) return 'select';
    if (el.matches('textarea') || el.querySelector?.('textarea')) return 'box.note'; // a note box is its own kind
    if (el.matches('label.field, .field, input, textarea')) return el.matches('.pct') || el.querySelector('.post') ? 'box.pct' : 'box';
    if (el.matches('.seg')) return 'toggle';
    if (el.matches('.status-btn')) return 'status';
    return `button.${BTN_SIG.find(c => el.classList.contains(c)) || 'btn'}`;
  };
  const KIND_WORD = k => ({ box: 'box', 'box.pct': 'percent box', 'box.note': 'note box', select: 'dropdown', toggle: 'toggle', status: 'status pill', 'button.caret': 'Details button', 'button.menu-btn': '... button', 'button.will-get': 'Will get it button', 'button.from-btn': 'From button' }[k] || k.replace('button.', '').replace(/^btn$/, 'button') + (k.startsWith('button.') && k !== 'button.btn' ? ' button' : ''));
  const ctrlsIn = el => [...el.querySelectorAll(CTRLS)].filter(c => vis(c) && !c.parentElement.closest('label.field, .field, .seg, button, a.btn, [role=button], .pop') && !c.closest('tr.more, .pop'));
  // A row of answer chips (tap picks, timing chips) is one answer, not a column: column leaves its chips out.
  const lined = c => !c.matches('.pick, .tag') && !c.closest('.picks, .tap-pick, .timing-chips, .day-grid');
  const rowSets = () => {
    if (rowsCache) return rowsCache;
    const sets = [];
    for (const t of document.querySelectorAll('table')) {
      if (!vis(t) || t.closest('.pop')) continue;
      const rows = [...t.querySelectorAll(':scope > tbody > tr')].filter(tr => vis(tr) && !tr.matches('.group, .more, .row-note') && ![...tr.cells].some(td => td.colSpan > 1));
      if (rows.length >= 2) sets.push({ kind: 'table', holder: t, rows: rows.map(tr => ({ el: tr, cells: [...tr.cells] })) });
    }
    const seen = new Set();
    for (const p of document.querySelectorAll('main *, .ft-box *')) {
      if (seen.has(p) || p.closest('table, .pop') || p.children.length < 3 || !vis(p)) continue;
      const sig = el => `${el.tagName}.${[...el.classList].filter(c => !['glow', 'selected', 'flash', 'open', 'on', 'done', 'left'].includes(c)).sort().join('.')}`;
      const byS = new Map();
      for (const k of p.children) if (vis(k)) { const s = sig(k); if (!byS.has(s)) byS.set(s, []); byS.get(s).push(k); }
      for (const [, kids] of byS) {
        if (kids.length < 3) continue;
        const rs = kids.map(k => k.getBoundingClientRect());
        const stacked = rs.every((r, i) => !i || (r.top >= rs[i - 1].bottom - 2 && Math.abs(r.left - rs[0].left) <= 2));
        if (!stacked) continue;
        const rows = kids.map(k => ({ el: k, cells: [k] })).filter(r => ctrlsIn(r.el).length);
        if (rows.length >= 2) { sets.push({ kind: 'list', holder: p, rows }); seen.add(p); }
      }
    }
    return (rowsCache = sets);
  };
  const rowName = el => ([...el.querySelectorAll('input:not([type=checkbox]):not([type=radio])')].find(i => i.value && !/^[\d,.$%-]+$/.test(i.value))?.value || el.querySelector('strong, .label')?.textContent || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  let rowsCache = null;

  // ----- column -----
  // The same kind of control in repeated rows shares its left and right edges, within 2px (DESIGN.md rule 1b).
  if (opt.checks.includes('column')) {
    for (const set of rowSets()) {
      const cols = new Map();
      for (const row of set.rows) {
        row.cells.forEach((cell, ci) => {
          const n = {};
          for (const c of ctrlsIn(cell).filter(lined)) {
            const k0 = kindOf(c), k = k0 === 'button.btn' ? `${k0}:${c.textContent.replace(/[\d$,.%·]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 24)}` : k0; // a plain button is matched by its words (Use $120 and Use $90 are one column; Park it and Add payoff are not)
            n[k] = (n[k] ?? -1) + 1;
            // A list outside a table (a form's rows, cards) is only compared between rows built the same way: the same
            // controls in the same order. A table compares by column.
            const key = `${set.kind === 'table' ? ci : ctrlsIn(row.el).filter(lined).map(kindOf).join(',')}|${k}|${n[k]}`;
            if (!cols.has(key)) cols.set(key, []);
            cols.get(key).push({ c, row, r: c.getBoundingClientRect() });
          }
        });
      }
      for (const [key, list] of cols) {
        if (list.length < 2) continue;
        const kind = key.split('|')[1].replace(/:.*$/, '');
        if (list.length < 2) continue;
        if (!BOTH.includes(kind) && ['left', 'right'].some(e => { const xs = list.map(it => it.r[e]); return Math.max(...xs) - Math.min(...xs) <= 2; })) continue;
        for (const edge of ['left', 'right']) {
          const xs = list.map(it => it.r[edge]);
          const spread = Math.max(...xs) - Math.min(...xs);
          if (spread <= 2) continue;
          // The odd one out: the edge the fewest rows share.
          const mode = xs.map(x => xs.filter(y => Math.abs(y - x) <= 2).length);
          const common = xs[mode.indexOf(Math.max(...mode))];
          const odd = list.reduce((a, it) => (Math.abs(it.r[edge] - common) > Math.abs(a.r[edge] - common) ? it : a));
          add('column', odd.c, `${rowName(odd.row.el)} · ${KIND_WORD(kind)}`, `the ${KIND_WORD(kind)} ${edge} edges differ by ${Math.round(spread)}px down the ${set.kind === 'table' ? 'table' : 'list'} (${list.slice(0, 6).map(it => `${rowName(it.row.el).slice(0, 18) || '?'} @${Math.round(it.r[edge] - common)}`).join(', ')}${list.length > 6 ? ', ...' : ''})`, { sub: `${key}|${edge}`, container: desc(set.holder) });
          break; // one line per column: the left edge, or the right when the left lines up
        }
      }
    }
  }

  // ----- cramped -----
  // Controls in adjacent rows need at least 6px of air between them (DESIGN.md rule 1c).
  if (opt.checks.includes('cramped')) {
    for (const set of rowSets()) {
      for (let i = 1; i < set.rows.length; i++) {
        const a = set.rows[i - 1], b = set.rows[i];
        if (set.kind === 'table' && a.el.nextElementSibling !== b.el) continue; // a Details panel or a note sits between them
        const ca = ctrlsIn(a.el).map(c => ({ c, r: c.getBoundingClientRect() })), cb = ctrlsIn(b.el).map(c => ({ c, r: c.getBoundingClientRect() }));
        let worst = null;
        for (const x of ca) for (const y of cb) {
          if (Math.min(x.r.right, y.r.right) - Math.max(x.r.left, y.r.left) < 4) continue;
          const gap = y.r.top - x.r.bottom;
          if (gap < 6 && (!worst || gap < worst.gap)) worst = { gap, x, y };
        }
        if (worst) add('cramped', worst.y.c, `${rowName(a.el)} / ${rowName(b.el)}`, `only ${Math.round(worst.gap)}px between the ${KIND_WORD(kindOf(worst.x.c))} above and the ${KIND_WORD(kindOf(worst.y.c))} below (6px at least)`, { container: desc(set.holder) });
      }
    }
  }

  // ----- unlabeled -----
  // A button with no words needs a name (aria-label) and a hover tip (title or data-tip), and its picture must be one
  // everyone reads the same way; anything else says what it does in words (DESIGN.md rule 8).
  if (opt.checks.includes('unlabeled')) {
    const KNOWN = ['dots', 'x', 'left', 'right', 'down', 'search', 'gear', 'info', 'plus', 'minus', 'trash', 'undo', 'redo', 'check'];
    for (const b of document.querySelectorAll('button, a.btn, [role=button]')) {
      if (!vis(b) || b.closest('.pop') && !vis(b.closest('.pop'))) continue;
      if (b.innerText.replace(/[\s›‹·]+/g, '')) continue; // it has visible words
      const name = (b.getAttribute('aria-label') || (b.getAttribute('aria-labelledby') && document.getElementById(b.getAttribute('aria-labelledby'))?.textContent) || '').trim();
      const tip = (b.getAttribute('title') || b.dataset.tip || '').trim();
      const glyph = b.querySelector('svg[data-icon]')?.getAttribute('data-icon') || (b.querySelector('svg, img') ? 'picture' : '');
      if (!glyph && !name) { add('unlabeled', b, '', 'an empty button: no words, no picture, no name'); continue; }
      if (!name || !tip) { add('unlabeled', b, name || tip || glyph, `a ${glyph || 'bare'} button with no ${!name ? 'name (aria-label)' : 'hover tip (title)'}`); continue; }
      if (!KNOWN.includes(glyph)) add('unlabeled', b, name, `a ${glyph} picture alone ("${name.slice(0, 40)}"): say what it does in words`, { sub: glyph });
    }
  }

  // ----- sticky -----
  // A sticky header or footer that has left its place in the page (it is stuck) sits over nothing a row holds: a stuck
  // footer never, a stuck header only where it floats below the bars above it (DESIGN.md rule 4).
  if (opt.checks.includes('sticky')) {
    const SKIP = '.topbar, .subtabs, .tabs, .toast, .pop, .report-this, .tracker, .parking-dock, .bulk-host, .ft-overlay, .find-overlay, [aria-modal="true"]';
    const bars = [...document.querySelectorAll('.topbar, .subtabs')].filter(vis).map(b => b.getBoundingClientRect()).filter(r => r.top < innerHeight / 3); // the bars stuck at the top
    const barsBottom = Math.max(0, ...bars.map(r => r.bottom));
    const stickies = [...document.querySelectorAll('body *')].filter(el => getComputedStyle(el).position === 'sticky' && vis(el) && !el.closest(SKIP) && !el.parentElement.closest('[style*="sticky"]'));
    const rowCtrls = rowSets().flatMap(s => s.rows.flatMap(row => ctrlsIn(row.el).map(c => ({ c, row }))));
    const done = new Set();
    for (const st of stickies) {
      // Stuck: where it is now differs from where it would sit in the page. A table cell's row keeps the in-page place.
      const now = st.getBoundingClientRect();
      let home;
      if (st.matches('td, th')) home = st.parentElement.getBoundingClientRect();
      else { const old = st.style.position; st.style.position = 'static'; home = st.getBoundingClientRect(); st.style.position = old; }
      if (Math.abs(now.top - home.top) <= 1) continue;
      const footer = now.top > home.top ? false : true; // pushed up from below its place: a footer
      const unit = st.matches('td, th') ? st.parentElement : st;
      if (done.has(unit)) continue;
      const u = st.matches('td, th') ? [...st.parentElement.children].reduce((r, c) => { const q = c.getBoundingClientRect(); return { top: Math.min(r.top, q.top), bottom: Math.max(r.bottom, q.bottom), left: Math.min(r.left, q.left), right: Math.max(r.right, q.right) }; }, { top: 1e9, bottom: -1e9, left: 1e9, right: -1e9 }) : now;
      if (!footer && u.top <= barsBottom + 2) continue; // a header riding flush under the bars: rows pass under it, as under the bars
      done.add(unit);
      for (const { c, row } of rowCtrls) {
        if (unit.contains(c)) continue;
        const r = c.getBoundingClientRect();
        const y1 = Math.max(r.top, u.top), y2 = Math.min(r.bottom, u.bottom), x1 = Math.max(r.left, u.left), x2 = Math.min(r.right, u.right);
        if (x2 - x1 < 4 || y2 - y1 < 4 || r.bottom <= barsBottom) continue;
        const pt = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
        if (!pt || !unit.contains(pt)) continue;
        add('sticky', c, `${rowName(row.el)} · ${KIND_WORD(kindOf(c))}`, `the sticky ${footer ? 'footer' : 'header'} ("${unit.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}") sits over this row's ${KIND_WORD(kindOf(c))} ${opt.where || ''}`.trim(), { overlay: desc(unit) });
      }
    }
  }
  return { list: out, ignoredWithTitle: out.ignoredWithTitle || 0, coveredByPopover: out.coveredByPopover || 0, clippedBtn: 0, srOnly: out.srOnly || 0 };
}

// The landing check for one What's missing item, after its link was clicked.
function landing() {
  const vis = el => !!el && el.isConnected && el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && el.getBoundingClientRect().width >= 1;
  const glow = [...document.querySelectorAll('.glow')].filter(vis);
  const a = document.activeElement;
  const ok = el => el && el.matches('input:not([type=hidden]), select, textarea, button, .seg') && !el.disabled && vis(el);
  const desc = el => el ? `${el.tagName.toLowerCase()}${[...el.classList].filter(c => c !== 'glow').slice(0, 3).map(c => `.${c}`).join('')}${el.dataset?.focus ? `[data-focus="${el.dataset.focus.replace(/\b[a-z0-9]{8,}(?=:)/gi, '<id>')}"]` : ''}` : 'nothing';
  const g = glow[0] || null;
  const focusOk = ok(a) && !a.closest('.toast, .pop, .topbar, .subtabs, .tracker, .missing-groups') && !a.matches('a.missing-link, [data-focus="sel"]') && (!g || g.contains(a) || a.contains(g)); // focus left on the toast's own Next button is not a landing
  let verdict = 'ok', detail = '';
  if (!g && !focusOk) { verdict = 'nothing'; detail = `no highlight, focus on ${desc(a)}`; }
  else if (g && g.matches('tr, tr *') && g.tagName === 'TR') { verdict = 'row'; detail = `the whole row lights up (${desc(g)}), focus on ${desc(a)}`; }
  else if (g && !g.querySelector('input:not([type=hidden]), select, textarea, button') && !ok(g)) { verdict = 'nothing'; detail = `highlight on ${desc(g)}, which has no box in it`; }
  else if (g && !focusOk) {
    const inner = g.matches('input, select, textarea, button') ? g : g.querySelector('input:not([type=hidden]), select, textarea, button');
    if (inner && inner.disabled) { verdict = 'disabled'; detail = `the box under the highlight is disabled (${desc(inner)})`; }
    else if (inner && !vis(inner)) { verdict = 'hidden'; detail = `the box under the highlight is hidden (${desc(inner)})`; }
  }
  // The box must also be on top where it sits: not under a sticky bar, a toast or Report this.
  let under = null;
  const tgt = (focusOk ? a : g);
  if (verdict === 'ok' && tgt) {
    const r = tgt.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) { verdict = 'hidden'; detail = `the box is off screen after the jump (${desc(tgt)})`; }
    else {
      const pt = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + Math.min(r.width / 2, 40))), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
      if (pt && !tgt.contains(pt) && !pt.contains(tgt)) { const cover = pt.closest('.toast, .report-this, .topbar, .subtabs, .tracker, .tabs, .bulk-host, .pop, th, thead') || pt; under = `${desc(cover)} ("${(cover.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}")`; }
    }
  }
  const r = (g || a)?.getBoundingClientRect();
  return { verdict, detail, under, target: desc(focusOk ? a : g), rect: r ? { x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } : null };
}

// ---------- Node side ----------
const keyOf = f => (f.check === 'askable' ? `askable|${f.route}|${f.text.replace(/ \(.*$/, '')}` : `${f.check}|${f.route}|${f.selector}|${f.sub || ''}`); // one line per missing item, whichever way in
async function shoot(page, f) {
  const list = shots[f.check];
  if (list.length >= SHOTS_PER_CHECK || !f.rect) return;
  const k = `${f.route}|${f.text}`; // vary the shots: one per screen and item
  if (list.some(s => s.key === k || s.key.split('|')[0] === f.route)) return;
  const file = path.join(OUT, `${f.check}-${list.length + 1}.png`);
  try {
    await page.evaluate(r => { const d = document.createElement('div'); d.id = 'lc-mark'; Object.assign(d.style, { position: 'absolute', left: `${r.x - 3}px`, top: `${r.y - 3}px`, width: `${r.w + 6}px`, height: `${r.h + 6}px`, outline: '3px solid #e000e0', zIndex: 2147483647, pointerEvents: 'none' }); document.body.append(d); }, f.rect);
    const vp = page.viewportSize();
    const scrollY = await page.evaluate(() => scrollY);
    const top = Math.max(0, f.rect.y - scrollY - 160);
    await page.screenshot({ path: file, clip: { x: 0, y: Math.min(top, Math.max(0, vp.height - 200)), width: vp.width, height: Math.min(480, vp.height - Math.min(top, Math.max(0, vp.height - 200))) } });
    list.push({ key: k, file, what: `${f.route} ${f.width} ${f.theme} ${f.client}: ${f.text || f.selector}` });
  } catch { /* a screenshot is a nice-to-have */ }
  await page.evaluate(() => document.getElementById('lc-mark')?.remove()).catch(() => {});
}
async function record(page, meta, res) {
  for (const f of res.list) {
    const row = { check: f.check, route: meta.route, width: meta.width, theme: meta.theme, client: meta.client, selector: f.selector, text: f.text, detail: f.detail, rect: f.rect, sub: f.sub, container: f.container, state: meta.state || '' };
    failures.push(row);
    await shoot(page, row);
  }
  ignored.clippedWithTitle += (res.ignoredWithTitle || 0) + (res.clippedBtn || 0);
  ignored.coveredByPopover += res.coveredByPopover || 0;
  ignored.srOnly += res.srOnly || 0;
}
const settle = (page, ms = 250) => page.waitForTimeout(ms);
async function go(page, route) { await page.evaluate(h => { document.querySelectorAll('.pop').forEach(p => p.remove()); location.hash = h; }, route); await settle(page, 300); await page.evaluate(() => scrollTo(0, 0)); }
async function scanHere(page, meta, checks) {
  const res = await page.evaluate(scan, { checks: checks.filter(c => c !== 'covered') });
  await record(page, meta, res);
  if (checks.includes('covered') || checks.includes('sticky')) {
    // Bars and buttons that stay put: what is under them once the page is scrolled all the way down cannot be reached.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await settle(page, 120);
    const cov = await page.evaluate(scan, { checks: checks.filter(c => c === 'covered' || c === 'sticky'), where: 'with the page scrolled to the bottom' });
    await record(page, meta, cov);
    await page.evaluate(() => scrollTo(0, 0));
  }
  if (checks.includes('sticky')) {
    // Batch 19: each long list part way up the screen, where a sticky header or footer is stuck over its rows.
    const spots = await page.evaluate(() => [...document.querySelectorAll('main table.rows')].filter(t => t.checkVisibility() && t.getBoundingClientRect().height > 160).slice(0, 3)
      .flatMap(t => { const r = t.getBoundingClientRect(); const top = r.top + scrollY; return [Math.max(0, top - innerHeight * 0.35), Math.max(0, top + r.height - innerHeight * 0.5)]; }));
    for (const y of spots) {
      await page.evaluate(v => scrollTo(0, v), y); await settle(page, 100);
      await record(page, meta, await page.evaluate(scan, { checks: ['sticky'], where: 'with a list part way up the screen' }));
    }
    if (spots.length) await page.evaluate(() => scrollTo(0, 0));
  }
}
// Open up to two Details panels on a list screen (and the first one inside an opened category), scanning each.
async function details(page, meta) {
  const carets = page.locator('tr.row td.col-actions button.caret[aria-expanded="false"]');
  const n = Math.min(2, await carets.count());
  for (let i = 0; i < n; i++) {
    const c = page.locator('tr.row td.col-actions button.caret[aria-expanded="false"]').nth(i);
    if (!(await c.count())) break;
    const label = (await c.evaluate(b => b.closest('tr').innerText.replace(/\s+/g, ' ').trim().slice(0, 30)).catch(() => '')) || `row ${i + 1}`;
    await c.scrollIntoViewIfNeeded().catch(() => {});
    await c.click({ timeout: 2000 }).catch(() => {}); await settle(page, 300);
    await scanHere(page, { ...meta, state: `Details open: ${label}` }, STILL);
    // A category opens its lines: open the first line's Details too (where the spending-line boxes are).
    const innerC = page.locator('.cat-lines tr.row td.col-actions button.caret[aria-expanded="false"]').first();
    if (await innerC.count()) {
      const l2 = await innerC.evaluate(b => b.closest('tr').innerText.replace(/\s+/g, ' ').trim().slice(0, 30)).catch(() => 'line');
      await innerC.scrollIntoViewIfNeeded().catch(() => {});
      await innerC.click({ timeout: 2000 }).catch(() => {}); await settle(page, 300);
      await scanHere(page, { ...meta, state: `Details open: ${label} > ${l2}` }, STILL);
    }
  }
}
async function setTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate(t => window.slam?.setPref?.('theme', t), theme);
  await settle(page, 150);
}
async function newContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (OFFLINE) {
    await ctx.route(/cdnjs\.cloudflare\.com.*echarts/, r => r.fulfill({ path: ECHARTS, contentType: 'application/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  }
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/#/home/session`, { waitUntil: 'load' }); await settle(page, 700);
  return { ctx, page };
}
// Fast Track with simple numbers, scanning each step; finish only when asked.
async function fastTrack(page, meta, { finish }) {
  const start = page.locator('button', { hasText: /Start Fast Track|Redo Fast Track/ }).first();
  if (!(await start.count())) { await go(page, '#/net-worth/assets'); }
  await page.locator('button', { hasText: /Start Fast Track|Redo Fast Track/ }).first().click({ timeout: 3000 });
  await settle(page, 300);
  for (let s = 0; s < 12; s++) {
    if (!(await page.locator('.ft-box').count())) break;
    const title = await page.locator('.ft-box h2').first().innerText().catch(() => `step ${s + 1}`);
    if (/done|Every lens|Almost|first picture/.test(title)) { await scanHere(page, { ...meta, route: 'Fast Track: done', state: '' }, STILL); break; }
    // Simple answers: the first choice of every toggle with none picked, the first option of every select, round numbers.
    await page.evaluate(() => {
      for (const seg of document.querySelectorAll('.ft-box .seg, .ft-box .tap-pick')) if (!seg.querySelector('[aria-pressed="true"], .on, [aria-checked="true"]')) seg.querySelector('button')?.click(); // a row of tap chips (batch 13) answers like a toggle
    });
    await settle(page, 120);
    const boxes = page.locator('.ft-box input:not([type=checkbox])');
    for (let i = 0; i < await boxes.count(); i++) {
      const b = boxes.nth(i);
      if (await b.inputValue().catch(() => 'x')) continue;
      const ph = (await b.getAttribute('placeholder')) || '';
      const v = /name/i.test(ph) ? 'Layout' : /year/i.test(ph) ? '1990' : /age/i.test(ph) ? '55' : /payment/i.test(ph) ? '200' : '5000';
      await b.fill(v).catch(() => {}); await b.press('Tab').catch(() => {});
    }
    const sels = page.locator('.ft-box select');
    for (let i = 0; i < await sels.count(); i++) { const sl = sels.nth(i); if (!(await sl.inputValue().catch(() => 'x'))) await sl.selectOption({ index: 1 }).catch(() => {}); }
    await settle(page, 150);
    await scanHere(page, { ...meta, route: `Fast Track: ${title}`, state: '' }, STILL);
    const last = await page.locator('.ft-box .ft-foot button', { hasText: /^Finish/ }).count();
    if (last && !finish) { await page.locator('.ft-box button[aria-label="Close without saving"]').click().catch(() => {}); break; }
    await page.locator('.ft-box .ft-foot button.primary').click({ timeout: 2000 }).catch(() => {}); await settle(page, 250);
  }
  const done = page.locator('.ft-box button', { hasText: /^Done$/ });
  if (await done.count()) { await done.click().catch(() => {}); await settle(page, 300); }
  if (await page.locator('.ft-overlay').count()) await page.keyboard.press('Escape');
}
// askable: click every What's missing line on the screen and see where it lands.
async function askable(page, meta) {
  const openIt = async () => { const b = page.locator('button.caret', { hasText: /What's missing/ }).first(); if ((await b.getAttribute('aria-expanded')) === 'false') { await b.click().catch(() => {}); await settle(page, 150); } };
  const hasList = await page.locator('button.caret', { hasText: /What's missing/ }).count();
  if (hasList) await openIt();
  const names = hasList ? await page.locator('a.missing-link').allInnerTexts() : [];
  let n = 0;
  for (const name of names.slice(0, 30)) {
    await page.evaluate(() => document.querySelector('.toast.arrive button[aria-label="Close"]')?.click());
    await page.evaluate(() => scrollTo(0, 0));
    await openIt();
    const link = page.locator('a.missing-link', { hasText: name }).first();
    if (!(await link.count())) continue;
    await link.click({ timeout: 2000 }).catch(() => {});
    await settle(page, 900); // arrive waits two frames, may open a Details panel, then scrolls smoothly
    const r = await page.evaluate(landing);
    n++;
    const base = { check: 'askable', route: meta.route, width: meta.width, theme: meta.theme, client: meta.client, text: name, rect: r.rect, state: '' };
    if (r.verdict !== 'ok') { const f = { ...base, selector: r.target, detail: `${r.verdict}: ${r.detail}` }; failures.push(f); await shoot(page, f); }
    else if (r.under) { const f = { ...base, check: 'covered', selector: r.target, detail: `after Show me the box is under ${r.under}` }; failures.push(f); await shoot(page, f); }
  }
  await page.evaluate(() => document.querySelector('.toast.arrive button[aria-label="Close"]')?.click());
  // The counters ("0 of 8"): each Fix it in their list must land on a box too.
  const counters = await page.locator('.completion .count-btn, .count-btn').count();
  for (let ci = 0; ci < Math.min(counters, 3); ci++) {
    await go(page, meta.route);
    const btn = page.locator('.completion .count-btn, .count-btn').nth(ci);
    if (!(await btn.count())) break;
    await btn.click({ timeout: 2000 }).catch(() => {}); await settle(page, 200);
    const items = await page.locator('.pop .row-line').evaluateAll(rows => rows.filter(r => r.querySelector('button')).map(r => r.firstElementChild?.textContent.trim()));
    for (let k = 0; k < Math.min(items.length, 12); k++) {
      if (k) { await go(page, meta.route); await page.locator('.completion .count-btn, .count-btn').nth(ci).click({ timeout: 2000 }).catch(() => {}); await settle(page, 200); }
      const fix = page.locator('.pop .row-line button', { hasText: 'Fix it' }).nth(k);
      if (!(await fix.count())) break;
      await fix.click({ timeout: 2000 }).catch(() => {});
      await settle(page, 900);
      const r = await page.evaluate(landing);
      n++;
      const name = `${items[k].replace(/ \((missing|Rough|Guess|no day)\)$/, '')} (from the ${ci ? 'second ' : ''}counter)`;
      const base = { check: 'askable', route: meta.route, width: meta.width, theme: meta.theme, client: meta.client, text: name, rect: r.rect, state: '' };
      if (r.verdict !== 'ok') { const f = { ...base, selector: r.target, detail: `${r.verdict}: ${r.detail}` }; failures.push(f); await shoot(page, f); }
      else if (r.under) { const f = { ...base, check: 'covered', selector: r.target, detail: `after Fix it the box is under ${r.under}` }; failures.push(f); await shoot(page, f); }
      await page.evaluate(() => document.querySelector('.toast.arrive button[aria-label="Close"]')?.click());
    }
    await page.evaluate(() => document.querySelectorAll('.pop').forEach(p => p.remove()));
  }
  // The arrive toast itself ("On this screen: ... Show me, Next"): what every jump opens. Walk it with Show me and Next.
  await go(page, meta.route);
  const toastNames = await page.evaluate(async route => { const m = await import('/js/ui/arrive.js'); const list = m.missingFor(window.slam.ctx, route).map(i => i.name); if (list.length) m.arrive(window.slam, route); await new Promise(r => setTimeout(r, 200)); return list; }, meta.route).catch(() => []);
  const total = toastNames.length;
  for (let k = 0; k < Math.min(Number(total), 30); k++) {
    if (k) { const nx = page.locator('.toast.arrive button', { hasText: /^Next/ }); if (!(await nx.count())) break; await nx.click().catch(() => {}); }
    else await page.locator('.toast.arrive button', { hasText: 'Show me' }).click().catch(() => {});
    await settle(page, 900);
    const name = toastNames[k];
    const r = await page.evaluate(landing);
    if (k === 0) await record(page, { ...meta, state: 'arrive toast open' }, await page.evaluate(scan, { checks: ['covered'], where: 'while the arrive toast is open' }));
    n++;
    const label = `${name || `item ${k + 1}`} (from the arrive toast, item ${k + 1} of ${total})`;
    const base = { check: 'askable', route: meta.route, width: meta.width, theme: meta.theme, client: meta.client, text: label, rect: r.rect, state: '' };
    if (r.verdict !== 'ok') { const f = { ...base, selector: r.target, detail: `${r.verdict}: ${r.detail}` }; failures.push(f); await shoot(page, f); }
    else if (r.under) { const f = { ...base, check: 'covered', selector: r.target, detail: `after Show me the box is under ${r.under}` }; failures.push(f); await shoot(page, f); }
  }
  await page.evaluate(() => document.querySelector('.toast.arrive button[aria-label="Close"]')?.click());
  return n;
}
// A fixed bill with an amount and no due day: the case that asks "Set due day" (the known rule 5 example).
async function fixedBill(page) {
  await go(page, '#/cash-flow/budget');
  const cat = page.locator('tr.row td.col-actions button.caret[aria-expanded="false"]').first();
  if (!(await cat.count())) return;
  await cat.click().catch(() => {}); await settle(page, 300);
  const amt = page.locator('.cat-lines tr.row input[data-focus$=":amount"]').first();
  if (!(await amt.count())) return;
  await amt.fill('1200'); await amt.press('Tab'); await settle(page, 300);
  const det = page.locator('.cat-lines tr.row td.col-actions button.caret[aria-expanded="false"]').first();
  await det.click().catch(() => {}); await settle(page, 300);
  const fixed = page.locator('.cat-lines .seg[aria-label="Amount is"] button', { hasText: /^Fixed$/ }).first();
  if (await fixed.count()) { await fixed.click().catch(() => {}); await settle(page, 300); }
}

async function runClient(page, client) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const theme of THEMES) {
      console.log(`  ${client} at ${width} ${theme}...`);
      await page.goto(`${BASE}/#/home/session`, { waitUntil: 'load' }); await settle(page, 500);
      await setTheme(page, theme);
      for (const route of ROUTES) {
        if (ONLY && !ONLY.some(o => route.includes(o))) continue;
        const meta = { route, width, theme, client };
        try {
          await go(page, route);
          await scanHere(page, meta, [...STILL, 'covered', 'sticky']);
          await details(page, meta);
          if (width === 1440 && theme === 'light') { await go(page, route); await askable(page, meta); }
        } catch (e) { errors.push(`${client} ${route} ${width} ${theme}: ${e.message.split('\n')[0]}`); }
      }
    }
  }
}

// The self-serve journey (start.html): a new person answers the five questions, then every screen is scanned at each
// width and theme, with its folds closed and then open. START_ROUTES is the journey's own list of screens.
const START_ROUTES = ['you', 'numbers/income', 'plan', 'see', 'life', 'drills', 'sharpen', 'tune', 'all', 'summary', 'meet', 'credits'];
async function runStart(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`Start: ${String(e).slice(0, 200)}`));
  await page.goto(`${BASE}/start.html`, { waitUntil: 'load' }); await settle(page, 700);
  await page.locator('.st-chip', { hasText: /^2000s$/ }).click(); await page.locator('.st-years .st-chip', { hasText: /^2001$/ }).click();
  await page.locator('.st-chip', { hasText: 'buy a home' }).click({ force: true }).catch(() => {});
  await page.locator('.st-btn.primary.big').first().click(); await settle(page, 300);
  for (const v of [['4200'], ['3100'], ['500', '1000'], ['18000'], ['3200', '20000']]) { for (let i = 0; i < v.length; i++) await page.fill(`#box-${i}`, v[i]); await page.locator('.st-btn.primary.big').first().click(); await settle(page, 250); }
  for (const width of WIDTHS) for (const theme of THEMES) {
    console.log(`  Start at ${width} ${theme}...`);
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await page.emulateMedia({ colorScheme: theme });
    for (const r of START_ROUTES) {
      if (ONLY && !ONLY.some(o => r.includes(o))) continue;
      const meta = { route: `start.html#/${r}`, width, theme, client: 'Start' };
      try {
        await page.goto(`${BASE}/start.html#/${r}`, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' }); await settle(page, 500);
        await scanHere(page, meta, [...STILL, 'covered', 'sticky']);
        const n = await page.evaluate(() => { let k = 0; document.querySelectorAll('main details:not([open])').forEach(d => { d.open = true; k++; }); return k; });
        if (n) { await settle(page, 200); await scanHere(page, { ...meta, state: 'every fold open' }, STILL); }
      } catch (e) { errors.push(`Start ${r} ${width} ${theme}: ${e.message.split('\n')[0]}`); }
    }
  }
  await ctx.close();
}

// Required from another script (tools/e2e/personas.cjs), it only hands over its checks; run directly, it runs.
module.exports = { scan, landing, ROUTES, CHECKS, STILL, fastTrack, START_ROUTES };
if (require.main === module) (async () => {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (/^(level|clipped|overflow|covered|askable|column|sticky|unlabeled|cramped)-\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT, f));
  console.log(`Layout check: ${ROUTES.length} screens x ${WIDTHS.join('/')} x ${THEMES.join('/')} x ${CLIENTS.length} clients${OFFLINE ? ' (CDN and fonts stood in)' : ''}`);
  const browser = await chromium.launch();
  // The Demo client.
  if (CLIENTS.includes('Demo')) {
    const { ctx, page } = await newContext(browser);
    const demo = page.locator('button', { hasText: /example numbers|Demo/i }).first();
    await demo.click({ timeout: 4000 }); await settle(page, 400);
    for (const r of ['#/cash-flow/budget', '#/net-worth/debt']) { // the "Example numbers loaded" toast is still up: what does it sit on?
      await page.evaluate(h => { location.hash = h; }, r); await settle(page, 300);
      await record(page, { route: r, width: 1440, theme: 'light', client: 'Demo', state: 'just after loading the Demo' }, await page.evaluate(scan, { checks: ['covered'], where: 'while the load toast is up' }));
    }
    await runClient(page, 'Demo');
    await ctx.close();
  }
  if (CLIENTS.includes('Start')) await runStart(browser);
  // A brand-new client: Home > New client > name > Create, then Fast Track with simple numbers.
  if (CLIENTS.includes('New')) {
    const { ctx, page } = await newContext(browser);
    try {
      await page.locator('button', { hasText: /^New client$/ }).first().click({ timeout: 4000 }); await settle(page, 250);
      await page.locator('.new-client-pop input').fill('Layout Test');
      await scanHere(page, { route: 'New client box', width: 1440, theme: 'light', client: 'New' }, ['level', 'clipped', 'covered', 'unlabeled']);
      await page.locator('.new-client-pop button', { hasText: /^Create$/ }).click(); await settle(page, 600);
      // Batch 46: Home for a brand-new client, the plan from an age: before there is an age, then with only an age.
      const freshHome = async state => { for (const width of WIDTHS) for (const theme of THEMES) {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await setTheme(page, theme); await go(page, '#/home/session');
        await scanHere(page, { route: 'Home (new client)', width, theme, client: 'New', state }, [...STILL, 'covered']);
      } };
      await freshHome('no age yet');
      await page.locator('.age-plan input[data-focus="plan:by"]').fill('1990'); await page.locator('.age-plan input[data-focus="plan:by"]').press('Tab'); await settle(page, 400);
      await freshHome('an age only');
      await setTheme(page, 'light');
      for (const width of WIDTHS) { // each step of Fast Track at every width; the real answers go in at the last one
        await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
        await fastTrack(page, { width, theme: 'light', client: 'New' }, { finish: width === WIDTHS[WIDTHS.length - 1] });
      }
      await fixedBill(page).catch(e => errors.push(`fixed bill setup: ${e.message.split('\n')[0]}`));
      await runClient(page, 'New');
    } catch (e) { errors.push(`new client: ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  // Batch 51: a client with shift rows (the dancer persona, through Import): Cash flow › Income with What a shift really
  // pays closed and open, and (batch 60) its Tips and shifts open with the kinds of night, at every width and theme.
  if (CLIENTS.includes('Shift')) {
    const { ctx, page } = await newContext(browser);
    try {
      await go(page, '#/tools/data'); await settle(page, 600);
      const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.locator('button', { hasText: /^Import$/ }).first().click()]);
      await chooser.setFiles(path.join(__dirname, '..', '..', 'fixtures', 'personas', 'dancer.json')); await settle(page, 1200);
      await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
      for (const width of WIDTHS) for (const theme of THEMES) {
        await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await setTheme(page, theme);
        await go(page, '#/cash-flow/income'); await settle(page, 300);
        const meta = { route: '#/cash-flow/income', width, theme, client: 'Shift' };
        await scanHere(page, { ...meta, state: 'What a shift really pays closed' }, [...STILL, 'covered']);
        const caret = page.locator('[data-sec="income:shifts"] button.sec-caret').first();
        if ((await caret.getAttribute('aria-expanded').catch(() => null)) === 'false') { await caret.click().catch(() => {}); await settle(page, 300); }
        await page.locator('[data-sec="income:shifts"]').scrollIntoViewIfNeeded().catch(() => {});
        await scanHere(page, { ...meta, state: 'What a shift really pays open' }, [...STILL, 'covered']);
        if ((await caret.getAttribute('aria-expanded').catch(() => null)) === 'true') { await caret.click().catch(() => {}); await settle(page, 200); }
        // Batch 60: the row's Tips and shifts open, with its two kinds of night (QUESTIONS 422).
        const work = page.locator('button.work-line').first();
        if (await work.count()) {
          await work.click().catch(() => {}); await settle(page, 500);
          await page.locator('.work-nights').first().scrollIntoViewIfNeeded().catch(() => {});
          await scanHere(page, { ...meta, state: 'Tips and shifts open (kinds of night)' }, [...STILL, 'covered']);
          await page.keyboard.press('Escape').catch(() => {}); await settle(page, 200);
        }
      }
    } catch (e) { errors.push(`shift client: ${e.message.split('\n')[0]}`); }
    await ctx.close();
  }
  await browser.close();
  const secs = Math.round((Date.now() - t0) / 1000);

  // Dedupe by check + route + selector: one line per distinct failure, with where else it showed.
  const distinct = new Map();
  for (const f of failures) {
    const k = keyOf(f);
    const d = distinct.get(k) ?? { ...f, seen: [] };
    d.seen.push(`${f.width} ${f.theme} ${f.client}${f.state ? ` (${f.state})` : ''}`);
    distinct.set(k, d);
  }
  const counts = Object.fromEntries(CHECKS.map(c => [c, { raw: failures.filter(f => f.check === c).length, distinct: [...distinct.values()].filter(f => f.check === c).length }]));
  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, seconds: secs, counts, ignored, errors, failures, distinct: [...distinct.values()], screenshots: shots }, null, 1));
  const md = [`# Layout check`, '', `${new Date().toISOString().slice(0, 16)} · ${secs} s · ${ROUTES.length} screens at ${WIDTHS.join(', ')} wide, ${THEMES.join(' and ')}, Demo and a new client. Rules: DESIGN.md.`, '',
    '| Check | Failures | Distinct (route + selector) |', '|---|---|---|', ...CHECKS.map(c => `| ${c} | ${counts[c].raw} | ${counts[c].distinct} |`), '',
    `Ignored: ${ignored.clippedWithTitle} cut-off items that show their full text in a title or tip; ${ignored.srOnly} screen-reader-only labels (1px on purpose); ${ignored.coveredByPopover} spots under an open popover (a popover covers the page by design).`, ''];
  if (errors.length) md.push('## Could not run', '', ...errors.slice(0, 20).map(e => `- ${e}`), '');
  for (const c of CHECKS) {
    const list = [...distinct.values()].filter(f => f.check === c);
    if (!list.length) continue;
    md.push(`## ${c} (${list.length})`, '');
    if (shots[c].length) md.push(...shots[c].map(s => `- Screenshot: ${s.file} (${s.what})`), '');
    for (const f of list) md.push(`- **${f.route}**${f.state ? ` · ${f.state}` : ''} · ${f.text ? `"${f.text}" · ` : ''}${f.detail} · \`${f.selector}\` · seen ${f.seen.length}x: ${[...new Set(f.seen)].slice(0, 4).join('; ')}`);
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
  const total = failures.length;
  console.log(`\n${CHECKS.map(c => `${c}: ${counts[c].raw} (${counts[c].distinct} distinct)`).join(' · ')}`);
  console.log(`Report: ${path.join(OUT, 'report.md')} · ${secs} s`);
  process.exit(total || errors.length ? 1 : 0);
})();
