// SPDX-License-Identifier: AGPL-3.0-only
// The shell (build phase 4): top bar, five tabs, sub-tabs, Find, the More menu (undo, redo, add anything, the
// parking lot), time toggle, client view, gear. Each screen shows its first state from Words and states.
import { h, clear, icon } from './ui/dom.js';
import { reportThis } from './ui/report-this.js';
import { startTips } from './ui/tips.js';
import { timerAfter } from './timer.js';
import * as S from './ui/staples.js';
import { Store, newHousehold, exportFile, importInto, backupDue, statusOf } from './records.js';
import { localAdapter, memoryAdapter, listClients, loadClient, saveClient, createClient, removeClient, getPrefs, setPrefs, autosave } from './storage.js';
import { householdFromInputs } from './demo.js';
import { addPresets } from './presets.js';
import { snapshotNumbers, inSession, programOf, agendaOf } from './program.js';
import { agendaPanel } from './ui/agenda-ui.js';
import { TABS, parseRoute, search, routeForPlace, tabRoute } from './nav.js';
import { SCREENS, progressOf } from './screens.js';
import { startFastTrack } from './ui/fasttrack-ui.js';
import { keepPlace } from './ui/place.js';
import { opened } from './ui/dismiss.js';
import { parseQuickAdd } from './quickadd.js';
import { dueChecks } from './checks.js';

const [ref, fields, flags] = await Promise.all([fetch('data/reference-2026.json').then(r => r.json()), fetch('data/fields.json').then(r => r.json()), fetch('data/flags.json').then(r => r.json())]);

let adapter;
try { localStorage.setItem('slam.test', '1'); localStorage.removeItem('slam.test'); adapter = localAdapter(); }
catch { adapter = memoryAdapter(); } // storage blocked: works for this tab only

const $ = id => document.getElementById(id);
const root = document.documentElement;

const app = {
  flags, // efficiency flags (data/flags.json), read by the FOO
  fields, // every field with where it lives (data/fields.json), for Find
  prefs: getPrefs(adapter),
  store: null, ctx: null, saver: null, hasClient: false,

  open(doc, { save = true } = {}) {
    this.saver?.flush(); this.saver?.stop();
    this.hasClient = !!doc;
    this.store = new Store(doc || newHousehold({ name: null }));
    this.ctx = S.createCtx({ store: this.store, ref });
    this.ctx.goTo = need => this.goToNeed(need);
    let mode = this.ctx.timeMode;
    this.ctx.onRefresh(() => {
      // M10: onboarding timer marks, set once each. Not an undo step: it is about the session, not the money.
      const m = this.ctx.metrics();
      const t = timerAfter(this.store.doc, { metricShown: [m.netWorth, m.surplus, m.savingsRate, m.runwayMonths].some(x => x?.value != null) });
      if (t) { this.store.doc.session ??= {}; this.store.doc.session.timer = t; }
      // A new time view redraws everything; screens without editable lists redraw on any change.
      if (mode !== this.ctx.timeMode || !$('main').querySelector('.list-wrap')) { mode = this.ctx.timeMode; this.renderSoon(); }
      else keepPlace(() => this.chrome());
    }, { keep: true });
    if (doc) {
      if (save) saveClient(adapter, doc);
      this.saver = autosave(this.store, adapter, { onState: () => this.saveState() });
      this.prefs = setPrefs(adapter, { clientId: doc.id });
    } else this.saver = null;
    this.render();
  },
  // A new, empty client (no starter lines), for Start a new client from a spreadsheet.
  newClientNamed(name) { this.open(createClient(adapter, name || 'New client', new Date().toISOString())); this.store.undoStack = []; return this.store; },
  newClient(anchor) {
    const input = h('input', { placeholder: 'Client name', 'aria-label': 'Client name' });
    const go = () => { const name = input.value.trim(); if (!name) return; S.closePop(); this.open(createClient(adapter, name, new Date().toISOString())); addPresets(this.store, ref); this.store.undoStack = []; this.go('#/home/session'); }; // every new client starts with the usual list
    input.onkeydown = e => { if (e.key === 'Enter') go(); };
    S.popover(anchor, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, 'New client'), h('label.field', {}, input),
      h('div.row-line', {}, S.button('Create', { kind: 'primary', onClick: go }), S.button('Cancel', { onClick: S.closePop })),
      h('a', { href: '#/tools/discovery', onclick: () => S.closePop() }, 'From a discovery call ›')), { width: 340 });
  },
  // Discovery table (R180): creates the client, fills each number as Roughly, opens Home.
  newClientFromDiscovery(v) {
    this.open(createClient(adapter, v.name, new Date().toISOString()));
    const s = this.store;
    s.transaction('From discovery', () => {
      const R = 'Roughly';
      if (v.takeHome != null) s.add('income', { name: 'Take-home pay', amount: v.takeHome, per: 'month', status: R, source: 'manual', values: { basis: 'Take-home' } }, { type: 'Job' });
      if (v.rent != null) s.add('bill', { name: 'Rent', amount: v.rent, status: R, values: { category: 'Rent or mortgage', draftt: 'Accommodation', amountType: 'Fixed', timing: 'Fixed date' } });
      if (v.debt != null) s.add('debt', { name: 'Total debt (from discovery)', status: R, values: { balance: v.debt } }, { type: 'Credit card' });
      if (v.savings != null) s.add('account', { name: 'Savings', status: R, values: { group: 'cash', balance: v.savings } }, { type: 'Savings or HYSA' });
      s.setDoc('profile', { whyNow: v.why ?? null, goalWords: v.goal ?? null });
    });
    addPresets(s, ref);
    s.undoStack = [];
    this.go('#/home/session');
    S.toast(`${v.name} is ready. Every number from the call is marked Roughly.`);
  },
  async loadDemo() {
    const demo = await fetch('fixtures/demo.json').then(r => r.json());
    const existing = listClients(adapter).find(c => c.name === 'Demo client');
    this.open(existing ? loadClient(adapter, existing.id) : householdFromInputs(demo.inputs, { name: 'Demo client' }));
    S.toast('Example numbers loaded. The Demo client is made up.');
  },
  go(hash) { if (location.hash === hash) this.render(); else location.hash = hash; },

  // ---------- top bar ----------
  chrome() {
    const { tab, sub } = parseRoute(location.hash);
    const clientName = this.hasClient ? this.store.doc.client.name : 'No client';
    const clientBtn = h('button.client-btn', { type: 'button', 'aria-label': `Client: ${clientName}. Switch client`, title: clientName }, h('span', {}, clientName), icon('down'));
    clientBtn.onclick = () => this.clientMenu(clientBtn);
    // Undo, redo, Add anything and the parking lot sit behind one labeled More button (Phase 3: one calm row).
    const more = h('button.icon-btn.more-btn', { type: 'button', 'aria-label': 'More: undo, redo, add anything, parking lot', 'aria-haspopup': 'dialog', 'data-focus': 'more' }, 'More', icon('down'));
    more.onclick = () => this.moreMenu(more);
    const cv = S.iconButton('monitor', this.prefs.clientView ? 'Client view is on' : 'Client view', () => this.setPref('clientView', !this.prefs.clientView));
    cv.setAttribute('aria-pressed', String(!!this.prefs.clientView));
    const gear = S.iconButton('gear', 'Coach tools', () => this.go('#/tools/lists'));
    gear.classList.add('coach-only');
    const time = h('select', { 'aria-label': 'Show amounts as', title: 'Show amounts as dollars, hours of work or days of FI', 'data-focus': 'time-view' },
      [['$', '$'], ['Hours', 'Hours'], ['FI days', 'FI days']].map(([v, t]) => h('option', { value: v, selected: v === this.ctx.timeMode }, t)));
    time.onchange = () => this.ctx.setTimeMode(time.value);
    const homeHref = tabRoute(TABS[0]);
    clear($('topbar'), h('div.topbar-in', {},
      h('div.tb-left', {},
        h('a.site-id', { href: homeHref, title: 'Stress Less About Money' }, 'SLAM'), clientBtn,
        h('span.save-state', { id: 'save-state' })),
      h('nav.tabs', { 'aria-label': 'Main tabs' }, TABS.map(t => h('a.tab', { href: tabRoute(t), 'aria-current': t.id === tab.id ? 'page' : null, title: t.job }, t.name))),
      h('div.tb-right', {},
        this.findBox(), more,
        h('label.field.time-pick', {}, time), cv, gear)));
    // Home is one screen with one nav row: no sub-tab bar there (About you shows the bar, with the way back).
    $('subtabs').hidden = tab.id === 'home' && (sub.id === 'session' || sub.id === 'review');
    this.agendaBar();
    // A sub-tab whose area the Profile turned off is absent, not greyed (R001).
    const off = this.hasClient && tab.id === 'net-worth' && this.ctx.gates().areas.debt === false ? new Set(['debt']) : new Set();
    // Net worth and Cash flow modes sit beside their sub-tabs: Fast Track is a button, One page a toggle (Navigation: modes are not tabs).
    const paged = ['net-worth', 'cash-flow'].includes(tab.id);
    const onePageKey = `onePage-${tab.id}`;
    const modes = paged && this.hasClient ? h('span.row-line.mm-modes', { style: { gap: '8px', flexWrap: 'nowrap' } },
      S.button('Start Fast Track', { iconName: 'right', onClick: () => startFastTrack(this, this.ctx) }),
      S.toggle([['sections', 'By section'], ['one', 'One page']], this.prefs[onePageKey] ? 'one' : 'sections', v => this.setPref(onePageKey, v === 'one'), { label: `${tab.name} layout` })) : null;
    const subs = h('div.subtabs-in', {}, tab.subs.filter(s => !off.has(s.id) && !s.hidden).map(s => {
      const p = this.hasClient ? progressOf(this.ctx, tab.id, s.id) : null;
      const complete = p && p.of > 0 && p.done === p.of;
      return h('a.subtab', { href: `#/${tab.id}/${s.id}`, 'aria-current': s.id === sub.id ? 'page' : null, class: s.area ? `area-${s.area}` : null },
        s.area ? h('span.dot') : null, s.name,
        p ? h(`span.count${complete ? '.done' : ''}`, { 'aria-label': complete ? 'core done' : `${p.done} of ${p.of} done` }, complete ? '✓' : `${p.done}/${p.of}`) : null);
    }), modes, h('span.spacer'), S.savedNote());
    clear($('subtabs'), subs);
    this.saveState();
    this.banner();
  },
  // Saved, with a small amber dot when a backup is due; clicking it opens Back up now (no full-width banner).
  saveState() {
    const el = $('save-state');
    if (!el) return;
    if (!this.hasClient) { clear(el); return; }
    const st = this.saver?.state;
    const due = backupDue(this.store.doc).due && this.store.records.length > 0;
    const word = st === 'unsaved' ? 'Unsaved' : st === 'saving' ? 'Saving' : 'Saved';
    const btn = h(`button.save-btn${st === 'unsaved' ? '.unsaved' : ''}`, { type: 'button', 'data-focus': 'save-state', 'aria-label': `${st === 'unsaved' ? 'Not saved yet' : word}. ${due ? `${this.backupText()} Back up now` : 'Backup'}`, title: due ? `${word}. ${this.backupText()} Click to back up.` : word },
      st === 'unsaved' || st === 'saving' ? word : icon('check'), due ? h('span.backup-dot.coach-only', { 'aria-hidden': 'true' }) : null);
    btn.onclick = () => S.popover(btn, h('div.stack', { style: { gap: '10px' } }, h('strong', {}, this.backupText()),
      h('span.muted', {}, 'Your work saves in this browser as you go. A backup file keeps it safe anywhere.'),
      h('div.row-line', {}, S.button('Back up now', { kind: 'primary', iconName: 'download', onClick: () => { S.closePop(); this.exportNow(); } }))), { width: 320 });
    clear(el, btn);
    if (st === 'unsaved') this.banner();
  },
  // Only "Not saved yet" stays a banner: rare and urgent.
  banner() {
    const b = $('banner');
    if (this.hasClient && this.saver?.state === 'unsaved') {
      return clear(b, h('div', {}, 'Not saved yet. Your last change is safe in this tab; export now to be sure.', S.button('Export', { iconName: 'download', onClick: () => this.exportNow() })));
    }
    clear(b);
  },
  backupText() {
    const d = backupDue(this.store.doc);
    return d.days === null ? 'No backup yet.' : `Last backup ${d.days} ${d.days === 1 ? 'day' : 'days'} ago.`;
  },

  clientMenu(anchor) {
    const others = listClients(adapter).filter(c => c.id !== this.store.doc.id);
    S.popover(anchor, h('div.client-menu', {}, h('strong', {}, 'Switch client'),
      others.length ? others.map(c => h('button.btn', { type: 'button', onclick: () => { S.closePop(); this.open(loadClient(adapter, c.id), { save: false }); } }, icon('user'), c.name || 'Unnamed'))
        : h('span.muted', {}, 'No other clients yet.'),
      h('div.row-line', {}, S.button('New client', { iconName: 'plus', onClick: () => this.newClient(anchor) }), S.button('Try with example numbers', { onClick: () => { S.closePop(); this.loadDemo(); } }))), { width: 340 });
  },

  // ---------- Find and add in one box (/) ----------
  // Typing finds fields, lines and screens; the last choice adds what you typed ("Netflix 15 a month").
  find() { document.querySelector('[data-focus="find-add"]')?.focus(); },
  findBox() {
    const input = h('input', { placeholder: 'Find or add', 'aria-label': "Find or add: type a field like 'HSA', or 'Netflix 15 a month' to add it", 'data-focus': 'find-add', 'data-quick-add': '', autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false' });
    const wrap = h('div.find-add', {}, h('label.field', {}, icon('search'), input, h('kbd', {}, '/')));
    let list = null, forget = null, items = [], sel = 0;
    const closeList = () => { list?.remove(); list = null; forget?.(); forget = null; input.setAttribute('aria-expanded', 'false'); };
    const pick = it => {
      closeList();
      input.value = '';
      if (it.kind === 'add') return this.quickAdd(it.p);
      input.blur();
      this.goFound(it.r);
    };
    const draw = () => {
      const q = input.value.trim();
      if (!q) { closeList(); return; }
      const found = search(q, { fields, records: this.store.records }).slice(0, 8);
      const add = this.hasClient ? parseQuickAdd(q) : null;
      items = [...found.map(r => ({ kind: 'find', r })), ...(add ? [{ kind: 'add', p: add }] : [])];
      sel = Math.min(sel, Math.max(0, items.length - 1));
      if (!list) {
        list = h('ul.find-results.find-drop', { role: 'listbox', 'aria-label': 'Find or add' });
        wrap.append(list);
        forget = opened({ el: list, anchor: wrap, pop: true, close: closeList });
        input.setAttribute('aria-expanded', 'true');
      }
      clear(list, items.length ? items.map((it, i) => h('li', {}, h('button', { type: 'button', role: 'option', 'aria-selected': String(i === sel), onmousedown: e => e.preventDefault(), onclick: () => pick(it) },
        it.kind === 'find' ? [h('span', {}, it.r.label), h('span.where', {}, it.r.where)]
          : [h('span.add-line', {}, icon('plus'), `Add ${it.p.name || 'it'}${it.p.amount != null ? `, ${it.p.amount}${it.p.per ? ` a ${it.p.per}` : ''}` : ''}`), h('span.where', {}, `to ${it.p.section}`)])))
        : h('li.muted', {}, this.hasClient ? 'Nothing by that name yet.' : 'Nothing by that name yet. Open a client to add.'));
    };
    input.oninput = () => { sel = 0; draw(); };
    input.onkeydown = e => {
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); draw(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
      if (e.key === 'Enter' && list && items[sel]) { e.preventDefault(); pick(items[sel]); }
      if (e.key === 'Escape') { input.value = ''; closeList(); }
    };
    return wrap;
  },
  quickAdd(p) {
    const { kind, type, section, summary, ...rest } = p;
    this.store.add(kind, rest, { type });
    this.go(routeForPlace(section));
    S.toast(`Added to ${section}.`, { undo: () => this.store.undo() });
  },
  goFound(r) {
    if (!r.route) return;
    this.go(r.route);
    requestAnimationFrame(() => {
      const row = r.kind === 'record' ? document.querySelector(`tr[data-id="${r.id}"]`) : null;
      if (row?.hidden) document.querySelector(`tr.group[data-group="${CSS.escape(row.dataset.group)}"] button.fold`)?.click(); // open its folded group
      (row || $('main').querySelector('h1'))?.classList.add('highlight');
      row?.querySelector('input')?.focus({ preventScroll: true });
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' }); // smooth only for Find and One page jumps
      if (r.kind === 'field') S.toast(`${r.label} lives on ${r.where}.`);
    });
  },

  // ---------- The More menu: undo, redo, add anything, the parking lot ----------
  moreMenu(anchor) {
    const item = (label, iconName, onClick, { disabled = false } = {}) => h('button.btn', { type: 'button', disabled, onclick: () => { S.closePop(); onClick(); } }, icon(iconName), label);
    S.popover(anchor, h('div.stack.more-menu', { style: { gap: '8px' } },
      item(this.store.canUndo && !this.prefs.clientView ? `Undo: ${this.store.undoStack.at(-1).label}` : 'Undo', 'undo', () => this.undo(), { disabled: !this.store.canUndo }), // the label names the coach's last move: not in Client view
      item('Redo', 'redo', () => this.redo(), { disabled: !this.store.canRedo }),
      item('Add anything', 'plus', () => this.addAnything(anchor), { disabled: !this.hasClient }),
      this.prefs.clientView ? null : item('Parking lot', 'note', () => this.openParking(anchor), { disabled: !this.hasClient }), // coach only
      h('span.muted.small', {}, 'Ctrl+Z undoes, Ctrl+Shift+Z redoes, / finds or adds.')), { width: 300 });
  },
  addAnything(anchor) {
    S.popover(anchor, h('div.stack', { style: { gap: '8px' } }, h('strong', {}, 'Add anything'), h('span.muted.small', {}, 'A name, an amount and how often, then Enter: "Netflix 15 a month"'),
      S.quickAdd(this.ctx, { onAdded: (r, p) => this.go(routeForPlace(p.section)) })), { width: 320 });
    setTimeout(() => document.querySelector('.pop [data-quick-add]')?.focus());
  },

  // ---------- Parking lot (R051) ----------
  openParking(anchor = document.querySelector('[data-focus="more"]')) {
    if (!this.hasClient) { S.toast('Open a client first; notes belong to a client.'); return; }
    const box = h('div');
    const text = h('textarea.note-input', { placeholder: 'Jot what the client said', 'aria-label': 'Note' });
    const add = () => { const t = text.value.trim(); if (!t) return; this.store.addNote(t); text.value = ''; draw(); text.focus(); };
    text.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); } };
    const draw = () => clear(box, h('strong', {}, 'Parking lot'), text,
      h('div.row-line', { style: { marginTop: '8px' } }, S.button('Add note', { kind: 'primary', onClick: add })),
      this.store.doc.parking.length ? h('ul.notes', {}, [...this.store.doc.parking].reverse().map(n => h(`li${n.filedTo ? '.filed' : ''}`, {},
        h('span.text', {}, n.text),
        n.filedTo ? h('a', { href: routeForPlace(fields.find(f => f.id === n.filedTo)?.livesOn || '') || '#' }, fields.find(f => f.id === n.filedTo)?.field || n.filedTo)
          : h('button.btn.small', { type: 'button', onclick: e => this.fileNote(n, e.currentTarget, draw) }, 'File it'),
        S.iconButton('trash', 'Delete', () => { this.store.removeNote(n.id); draw(); S.toast('Deleted.', { undo: () => { this.store.undo(); } }); }, { tiny: true }))))
        : h('p.muted', { style: { marginTop: '12px' } }, 'No notes yet.'));
    draw();
    S.popover(anchor, box, { width: 420 });
    text.focus();
  },
  fileNote(note, anchor, redraw) {
    const input = h('input', { placeholder: 'Which field?', 'aria-label': 'Which field' });
    const list = h('div.stack');
    input.oninput = () => clear(list, search(input.value, { fields }).filter(r => r.kind === 'field').slice(0, 6)
      .map(r => h('button.btn.small', { type: 'button', onclick: () => { this.store.fileNote(note.id, r.id); this.openParking(); } }, `${r.label} (${r.where})`)));
    S.popover(anchor, h('div.stack', {}, h('strong', {}, 'File this note to a field'), h('label.field', {}, icon('search'), input), list), { width: 400 });
  },

  // ---------- Undo, settings, data ----------
  undo() { const l = this.store.undo(); if (l) S.toast(`Undone: ${l}`); },
  redo() { const l = this.store.redo(); if (l) S.toast(`Redone: ${l}`); },
  setPref(k, v) { this.prefs = setPrefs(adapter, { [k]: v }); this.applyPrefs(); this.render(); },
  applyPrefs() {
    if (this.prefs.theme === 'light' || this.prefs.theme === 'dark') root.dataset.theme = this.prefs.theme; else delete root.dataset.theme;
    root.dataset.density = this.prefs.density === 'compact' ? 'compact' : 'comfortable';
    root.dataset.clientView = this.prefs.clientView ? 'on' : 'off';
    root.dataset.font = this.prefs.font || 'inter';
  },
  // ---------- The agenda bar: on every tab while a session runs, collapsed to one line (coach only) ----------
  _bar: { open: false, back: null, rev: null, A: null },
  trackerBack(hash) { if (hash && hash !== '#/home/review' || !this._bar.back) this._bar.back = hash; }, // remember where a jump left from
  agendaBar() {
    const el = $('tracker');
    if (!el) return;
    const on = this.hasClient && inSession(this.store.doc) && !this.prefs.clientView;
    el.hidden = !on;
    if (!on) { clear(el); return; }
    const b = this._bar;
    if (b.rev !== this.store.doc._rev || !b.A) { b.A = agendaOf(this.store.doc, ref, { now: this.ctx.now(), flags: this.flags, P: programOf(this.store.doc, ref, { now: this.ctx.now(), flags: this.flags }) }); b.rev = this.store.doc._rev; }
    const A = b.A;
    const back = b.back && b.back !== location.hash ? S.button('Back to where we were', { size: 'small', iconName: 'left', onClick: () => { const to = b.back; b.back = null; this.go(to); } }) : null;
    const head = h('div.tracker-head', {}, h('strong', {}, `Session ${A.n} · ${A.done} of ${A.of} done`), h('span.muted.small', {}, A.name), h('span.spacer'), back,
      S.button(b.open ? 'Hide the agenda' : 'Agenda', { size: 'small', iconName: b.open ? 'down' : 'up', onClick: () => { b.open = !b.open; this.agendaBar(); } }));
    clear(el, head, b.open ? h('div.tracker-body', {}, agendaPanel(this, this.ctx, A, { compact: true })) : null);
  },
  snapshot(label, extra = {}) {
    this.store.snapshot(label, snapshotNumbers(this.store.doc, ref, { now: this.ctx.now(), flags: this.flags }), extra);
    saveClient(adapter, this.store.doc);
    S.toast('Snapshot saved.');
    this.render();
  },
  saveNow() { saveClient(adapter, this.store.doc); },
  exportNow({ quiet = false } = {}) {
    const doc = this.store.doc;
    const now = new Date().toISOString();
    const blob = new Blob([JSON.stringify(exportFile(doc, now), null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `slam-${(doc.client.name || 'client').replace(/\W+/g, '-').toLowerCase()}-${now.slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    doc.lastBackupAt = now;
    saveClient(adapter, doc);
    if (!quiet) { S.toast('Backup downloaded.'); this.render(); }
  },
  importFile() {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.onchange = async () => {
      try {
        const text = await input.files[0].text();
        if (!this.hasClient) { const doc = JSON.parse(text).household; this.open(doc); S.toast('Imported.'); return; }
        importInto(this.store, text);
        S.toast('Imported. A snapshot was taken first.', { undo: () => this.store.undo() });
      } catch (e) { S.toast(e.message || 'That file could not be read.'); }
    };
    input.click();
  },
  resetClient(anchor) {
    const name = this.store.doc.client.name;
    const input = h('input', { placeholder: name, 'aria-label': 'Type the client name' });
    S.popover(anchor, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, `Clear everything for ${name}? Type the name to confirm.`), h('label.field', {}, input),
      h('div.row-line', {}, S.button('Reset client', { kind: 'danger', onClick: () => {
        if (input.value.trim() !== name) { S.toast('The name does not match.'); return; }
        S.closePop();
        this.store.snapshot('Before reset', keyNumbers(this.ctx.metrics())); // R083
        this.store.transaction('Reset client', () => { this.store.doc.records = []; this.store.doc.parking = []; this.store.doc.profile = {}; });
        S.toast('Client reset. A snapshot was taken first.', { undo: () => this.store.undo() });
      } }), S.button('Keep everything', { onClick: S.closePop }))), { width: 380 });
  },
  // Delete a whole client: type the name to confirm; Undo puts it back for 10 seconds.
  deleteClient(anchor) {
    const doc = this.store.doc;
    const name = doc.client.name || 'this client';
    const input = h('input', { placeholder: name, 'aria-label': 'Type the client name' });
    S.popover(anchor, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, `Delete ${name} and everything in it? Type the name to confirm.`), h('label.field', {}, input),
      h('div.row-line', {}, S.button('Delete client', { kind: 'danger', iconName: 'trash', onClick: () => {
        if (input.value.trim() !== name) { S.toast('The name does not match.'); return; }
        S.closePop();
        this.saver?.flush(); this.saver?.stop(); this.saver = null;
        const kept = JSON.parse(JSON.stringify(doc));
        removeClient(adapter, doc.id);
        const next = listClients(adapter)[0];
        this.open(next ? loadClient(adapter, next.id) : null, { save: false });
        this.prefs = setPrefs(adapter, { clientId: next?.id ?? null });
        this.go('#/home/session');
        S.toast(`Deleted ${name}.`, { undo: () => { saveClient(adapter, kept); this.open(loadClient(adapter, kept.id), { save: false }); S.toast(`${name} is back.`); } });
      } }), S.button('Keep', { onClick: S.closePop }))), { width: 380 });
  },
  // Roughly older than 30 days, or any number older than 90 (R061).
  dueForCheck() { // the rough or aged numbers due for a check today (js/checks.js)
    return dueChecks(this.store.doc, ref).filter(c => c.rec).map(c => ({ label: c.label, status: c.status, route: routeForPlace(placeOf(c.rec)) }));
  },
  goToNeed(need) {
    const r = search(need, { fields })[0];
    if (r?.route) this.go(r.route);
  },

  renderSoon() { if (!this._soon) this._soon = requestAnimationFrame(() => { this._soon = null; this.render({ keepPop: true }); }); },
  // ---------- render ----------
  render({ keepPop = false } = {}) {
    const { tab, sub, hash } = parseRoute(location.hash);
    if (tab.id === 'tools' && this.prefs.clientView) { this.go('#/home/session'); return; } // never in client view
    if (!keepPop) S.closePop();
    this.ctx.clearScreen();
    const screen = SCREENS[`${tab.id}/${sub.id}`];
    const draw = () => { this.chrome(); clear($('main'), screen ? screen(this, this.ctx) : null); };
    // A redraw of the same screen never loses your place (R165): scroll, list scroll and the control you were on.
    if (this._lastHash === hash) keepPlace(draw); else draw();
    // One page: a sub-tab click scrolls to its part (only when the place changes, not on every redraw).
    if (this.prefs[`onePage-${tab.id}`] && this._lastHash !== hash && this._lastHash?.startsWith(`#/${tab.id}/`)) document.getElementById(`part-${sub.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    this._lastHash = hash;
    document.title = `${sub.name} · ${tab.name} · SLAM`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  },
};
const placeOf = r => ({ income: 'Cash flow › Income', benefit: 'Cash flow › Income', debt: 'Net worth › Debt', account: 'Net worth › Assets', asset: 'Net worth › Assets', coverage: 'Net worth › Protection', bill: 'Cash flow › Budget' })[r.kind] || 'Home › About you';

// Keyboard (R168): / = Find, Ctrl+Z undo, Ctrl+Shift+Z redo (outside text boxes, so typing undo still works).
document.addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
  if (e.key === '/' && !typing) { e.preventDefault(); app.find(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? app.redo() : app.undo(); }
});
window.addEventListener('hashchange', () => app.render());
window.addEventListener('beforeunload', e => { // R084: warn before closing with unsaved work
  app.saver?.flush();
  if (app.saver?.state === 'unsaved') { e.preventDefault(); e.returnValue = ''; }
});

app.applyPrefs();
const last = app.prefs.clientId ? loadClient(adapter, app.prefs.clientId) : null;
app.open(last, { save: false });
window.slam = app; // for the console and the screenshot script
startTips(document.body); // B8: plain-language tooltips
reportThis(app); // B9: Report this on every screen
