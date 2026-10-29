// The shell (build phase 4): top bar, five tabs, sub-tabs, breadcrumb, Find, quick add, parking lot,
// undo and redo, time toggle, client view, gear. Each screen shows its first state from Words and states.
import { h, clear, icon } from './ui/dom.js';
import * as S from './ui/staples.js';
import { Store, newHousehold, exportFile, importInto, backupDue, statusOf } from './records.js';
import { localAdapter, memoryAdapter, listClients, loadClient, saveClient, createClient, getPrefs, setPrefs, autosave } from './storage.js';
import { householdFromInputs } from './demo.js';
import { keyNumbers } from './math/metrics.js';
import { TABS, parseRoute, search, routeForPlace } from './nav.js';
import { SCREENS, progressOf } from './screens.js';

const [ref, fields] = await Promise.all([fetch('data/reference-2026.json').then(r => r.json()), fetch('data/fields.json').then(r => r.json())]);

let adapter;
try { localStorage.setItem('slam.test', '1'); localStorage.removeItem('slam.test'); adapter = localAdapter(); }
catch { adapter = memoryAdapter(); } // storage blocked: works for this tab only

const $ = id => document.getElementById(id);
const root = document.documentElement;

const app = {
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
      // A new time view redraws everything; screens without editable lists redraw on any change.
      if (mode !== this.ctx.timeMode || !$('main').querySelector('.list-wrap')) { mode = this.ctx.timeMode; this.renderSoon(); }
      else this.chrome();
    }, { keep: true });
    if (doc) {
      if (save) saveClient(adapter, doc);
      this.saver = autosave(this.store, adapter, { onState: () => this.saveState() });
      this.prefs = setPrefs(adapter, { clientId: doc.id });
    } else this.saver = null;
    this.render();
  },
  newClient(anchor) {
    const input = h('input', { placeholder: 'Client name', 'aria-label': 'Client name' });
    const go = () => { const name = input.value.trim(); if (!name) return; S.closePop(); this.open(createClient(adapter, name, new Date().toISOString())); this.go('#/home/prep'); };
    input.onkeydown = e => { if (e.key === 'Enter') go(); };
    S.popover(anchor, h('div.stack', { style: { gap: '12px' } }, h('strong', {}, 'New client'), h('label.field', {}, input),
      h('div.row-line', {}, S.button('Create', { kind: 'primary', onClick: go }), S.button('Cancel', { onClick: S.closePop }))), { width: 340 });
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
    const undo = S.iconButton('undo', 'Undo', () => this.undo(), { disabled: !this.store.canUndo });
    const redo = S.iconButton('redo', 'Redo', () => this.redo(), { disabled: !this.store.canRedo });
    const cv = S.iconButton('monitor', this.prefs.clientView ? 'Client view is on' : 'Client view', () => this.setPref('clientView', !this.prefs.clientView));
    cv.setAttribute('aria-pressed', String(!!this.prefs.clientView));
    const gear = S.iconButton('gear', 'Coach tools', () => this.go('#/tools/lists'));
    gear.classList.add('coach-only');
    clear($('topbar'), h('div.topbar-in', {},
      h('div.tb-left', {},
        h('a.site-id', { href: '#/home/prep', title: 'Stress Less About Money' }, 'SLAM'), clientBtn,
        h('nav.crumbs', { 'aria-label': 'Breadcrumb', title: `${tab.name} \u203A ${sub.name}` }, h('a', { href: `#/${tab.id}/${tab.subs[0].id}` }, tab.name), h('span.sep', {}, '›'), h('a', { href: `#/${tab.id}/${sub.id}`, 'aria-current': 'page' }, sub.name)),
        h('span.save-state', { id: 'save-state' })),
      h('nav.tabs', { 'aria-label': 'Main tabs' }, TABS.map(t => h('a.tab', { href: `#/${t.id}/${t.subs[0].id}`, 'aria-current': t.id === tab.id ? 'page' : null, title: t.job }, t.name))),
      h('div.tb-right', {},
        h('button.find-btn', { type: 'button', onclick: () => this.find(), 'aria-label': 'Find (press /)' }, icon('search'), h('span.find-word', {}, 'Find'), h('kbd', {}, '/')),
        S.quickAdd(this.ctx, { onAdded: (r, p) => this.go(routeForPlace(p.section)) }),
        S.iconButton('note', 'Parking lot', () => this.openParking()), undo, redo,
        S.timeToggle(this.ctx), cv, gear)));
    const subs = h('div.subtabs-in', {}, tab.subs.map(s => {
      const p = this.hasClient ? progressOf(this.ctx, tab.id, s.id) : null;
      const complete = p && p.of > 0 && p.done === p.of;
      return h('a.subtab', { href: `#/${tab.id}/${s.id}`, 'aria-current': s.id === sub.id ? 'page' : null, class: s.area ? `area-${s.area}` : null },
        s.area ? h('span.dot') : null, s.name,
        p ? h(`span.count${complete ? '.done' : ''}`, { 'aria-label': complete ? 'core done' : `${p.done} of ${p.of} done` }, complete ? '✓' : `${p.done}/${p.of}`) : null);
    }), h('span.spacer'), S.savedNote());
    clear($('subtabs'), subs);
    this.saveState();
    this.banner();
  },
  saveState() {
    const el = $('save-state');
    if (!el) return;
    if (!this.hasClient) { clear(el); return; }
    const st = this.saver?.state;
    el.className = `save-state${st === 'unsaved' ? ' unsaved' : ''}`;
    el.title = st === 'unsaved' ? 'Not saved yet' : st === 'saving' ? 'Saving' : 'Saved';
    clear(el, st === 'unsaved' ? 'Unsaved' : st === 'saving' ? 'Saving' : [icon('check'), h('span.save-word', {}, 'Saved')]);
    if (st === 'unsaved') this.banner();
  },
  banner() {
    const b = $('banner');
    if (!this.hasClient) return clear(b);
    if (this.saver?.state === 'unsaved') {
      return clear(b, h('div', {}, 'Not saved yet. Your last change is safe in this tab; export now to be sure.', S.button('Export', { iconName: 'download', onClick: () => this.exportNow() })));
    }
    const due = backupDue(this.store.doc);
    if (due.due && this.store.records.length) {
      return clear(b, h('div.coach-only', {}, due.days === null ? 'No backup yet.' : `Last backup ${due.days} days ago.`, S.button('Back up now', { iconName: 'download', onClick: () => this.exportNow() })));
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

  // ---------- Find (/) ----------
  find() {
    const input = h('input', { placeholder: "Type any field, like 'HSA'", 'aria-label': 'Find' });
    const list = h('ul.find-results', { role: 'listbox' });
    let results = [], sel = 0;
    const draw = () => {
      results = search(input.value, { fields, records: this.store.records });
      sel = Math.min(sel, Math.max(0, results.length - 1));
      clear(list, input.value.trim() && !results.length ? h('li.muted', {}, 'Nothing by that name yet.') : results.map((r, i) =>
        h('li', {}, h('button', { type: 'button', 'aria-selected': String(i === sel), onclick: () => pick(r) }, h('span', {}, r.label), h('span.where', {}, r.where)))));
    };
    const overlay = h('div.find-overlay', { onclick: e => { if (e.target === overlay) overlay.remove(); } },
      h('div.find-box', { role: 'dialog', 'aria-label': 'Find' }, h('label.field', {}, icon('search'), input), list));
    const pick = r => {
      overlay.remove();
      if (!r.route) return;
      this.go(r.route);
      requestAnimationFrame(() => {
        const row = r.kind === 'record' ? document.querySelector(`tr[data-id="${r.id}"]`) : null;
        (row || $('main').querySelector('h1'))?.classList.add('highlight');
        row?.querySelector('input')?.focus();
        if (r.kind === 'field') S.toast(`${r.label} lives on ${r.where}.`);
      });
    };
    input.oninput = () => { sel = 0; draw(); };
    input.onkeydown = e => {
      if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, results.length - 1); draw(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
      if (e.key === 'Enter' && results[sel]) pick(results[sel]);
      if (e.key === 'Escape') overlay.remove();
    };
    document.body.append(overlay);
    input.focus();
  },

  // ---------- Parking lot (R051) ----------
  openParking() {
    const anchor = document.querySelector('[aria-label="Parking lot"]');
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
  snapshot(label) {
    this.store.snapshot(label, keyNumbers(this.ctx.metrics()));
    saveClient(adapter, this.store.doc);
    S.toast('Snapshot saved.');
    this.render();
  },
  exportNow() {
    const doc = this.store.doc;
    const now = new Date().toISOString();
    const blob = new Blob([JSON.stringify(exportFile(doc, now), null, 1)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `slam-${(doc.client.name || 'client').replace(/\W+/g, '-').toLowerCase()}-${now.slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    doc.lastBackupAt = now;
    saveClient(adapter, doc);
    S.toast('Backup downloaded.');
    this.render();
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
  // Roughly older than 30 days, or any number older than 90 (R061).
  dueForCheck() {
    const now = Date.now(), out = [];
    for (const r of this.store.records) {
      const age = (now - Date.parse(r.updatedAt)) / 86400000;
      const st = r.status || Object.values(r.fieldStatus)[0] || statusOf(r, 'amount');
      if ((st === 'Roughly' && age > 30) || age > 90 || st === 'Not now') out.push({ label: r.name || r.type, status: st, route: routeForPlace(placeOf(r)) });
    }
    return out;
  },
  goToNeed(need) {
    const r = search(need, { fields })[0];
    if (r?.route) this.go(r.route);
  },

  renderSoon() { if (!this._soon) this._soon = requestAnimationFrame(() => { this._soon = null; this.render({ keepPop: true }); }); },
  // ---------- render ----------
  render({ keepPop = false } = {}) {
    const { tab, sub, hash } = parseRoute(location.hash);
    if (tab.id === 'tools' && this.prefs.clientView) { this.go('#/home/prep'); return; } // never in client view
    if (!keepPop) S.closePop();
    this.ctx.clearScreen();
    this.chrome();
    const screen = SCREENS[`${tab.id}/${sub.id}`];
    clear($('main'), screen ? screen(this, this.ctx) : null);
    document.title = `${sub.name} · ${tab.name} · SLAM`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  },
};
const placeOf = r => ({ income: 'My Money › Income', debt: 'My Money › Debt', account: 'My Money › Assets', asset: 'My Money › Assets', bill: 'Spending › Budget' })[r.kind] || 'My Money › Profile';

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
