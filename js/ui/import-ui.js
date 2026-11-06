// SPDX-License-Identifier: AGPL-3.0-only
// Batch 22: Import this month from Rocket Money, Monarch or your bank. The button (Cash flow > Month end, Coach tools >
// Data), the column picks for a CSV SLAM does not know, and the review before anything is saved (like Bring a
// spreadsheet back): grouped by spending group with its total, the unmatched first, each row a tap to pick its line and
// one more tap for "Always put this merchant here". The reading and matching are js/import/apps.js; this file only
// shows them.
import { h, icon } from './dom.js';
import { button, checkbox, select, toggle, toast } from './staples.js';
import { overlayOf } from './sheet-ui.js';
import { readFile, readTransactions, matchAll, reviewOf, acceptAllMatched, pickFor, saveImport, monthsIn, pickMonth, formatWords, headerKey, linesOf, merchantKey, lastImport, KINDS } from '../import/apps.js';
import { categoryKeyOf, categoryName, CATEGORIES } from '../math/spending.js';
import { monthName } from '../month.js';
import { money } from '../format.js';

export const IMPORT_WORDS = {
  button: 'Import this month from Rocket Money, Monarch or your bank',
  short: 'Import transactions (CSV)',
  line: 'Drop in the month\'s CSV export. You see every row, grouped by category, before anything is saved.',
  tip: 'Rocket Money: Transactions, Export. Monarch: Settings, Data, Download transactions. A bank: download the month as CSV.',
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const shortDate = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const SPECIAL_PICKS = [['@income', 'Paycheck or money in'], ['@transfer', 'Transfer between accounts'], ['@debt', 'Card or loan payment'], ['@ignore', 'Leave out']];
const KIND_OF_PICK = { '@income': 'income', '@transfer': 'transfer', '@debt': 'debt', '@ignore': 'ignore' };

// The button and its one line. ym: the month to bring in when the file has it. onSaved(ym): after a save.
export function importButton(app, { ym = null, onSaved = null, short = false } = {}) {
  const b = button(short ? IMPORT_WORDS.short : IMPORT_WORDS.button, { iconName: 'upload', onClick: () => startImport(app, { ym, onSaved }) });
  b.dataset.focus = 'import-tx'; b.title = IMPORT_WORDS.tip; // a title, not data-tip: the long tip would run past a phone screen
  const last = app.hasClient ? lastImport(app.store.doc) : null;
  return h('div.btn-line.import-line', {}, b, h('span.muted.small', { title: IMPORT_WORDS.tip }, last ? `Last import: ${last.bank ?? 'a CSV'}, ${monthName(last.ym)}, ${plural(last.count, 'row')}.` : IMPORT_WORDS.line));
}

export function startImport(app, opts = {}) {
  if (!app.hasClient) { toast('Open a client first: the month is saved to the open client.'); return; }
  const input = h('input', { type: 'file', accept: '.csv,text/csv' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try { openFile(app, await file.text(), file.name, opts); } catch (e) { toast(e.message || 'That file could not be read.'); }
  };
  input.click();
}
// From the text of a file (the tests and the browser checks call this straight).
export function openFile(app, text, fileName, opts = {}) {
  const res = readFile(text, app.ctx.ref, { doc: app.store.doc });
  if (res.problem) { toast(res.problem); return null; }
  if (!res.fmt.id) return pickColumns(app, res, fileName, opts);
  if (!res.transactions.length) { toast('No rows with a date and an amount in that file.'); return null; }
  return review(app, res, fileName, opts);
}

// A CSV SLAM does not know: which column is which, once (kept for files with the same header row).
function pickColumns(app, res, fileName, opts) {
  let close;
  const map = { ...res.fmt.map };
  const opt = res.headers.map((hd, i) => [String(i), hd || `Column ${i + 1}`]);
  const pick = (role, label) => h('div.stack.imp-col', {}, h('span.label', {}, label),
    select(opt, map[role] == null ? null : String(map[role]), v => { map[role] = v == null ? null : Number(v); }, { label, hint: 'Not in this file', width: 180 }));
  const box = h('div.ft-box.imp-box', {},
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, 'Which column is which?'), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: () => close() })),
    h('p.muted', {}, formatWords(res.fmt, 0)),
    h('div.imp-cols', {}, pick('date', 'Date'), pick('description', 'Description'), pick('amount', 'Amount (money out is minus)'), pick('debit', 'Or money out'), pick('credit', 'And money in')),
    h('div.ft-foot', {}, button('Next: review the rows', { kind: 'primary', iconName: 'right', onClick: () => {
      if (map.date == null || (map.amount == null && map.debit == null && map.credit == null)) { toast('Pick the date column and an amount column.'); return; }
      const fmt = { id: 'bank', name: 'Bank CSV', map: { ...map, merchant: map.description != null ? [map.description] : [] }, sign: 'out-negative' };
      const transactions = readTransactions(res.rows, fmt, app.ctx.ref);
      close();
      if (!transactions.length) { toast('No rows with a date and an amount with those columns.'); return; }
      review(app, { ...res, fmt, transactions }, fileName, { ...opts, bankMap: { key: headerKey(res.headers), map: { date: map.date, description: map.description, amount: map.amount, debit: map.debit, credit: map.credit, hasHeader: true } } });
    } }), button('Cancel', { onClick: () => close() })));
  close = overlayOf('Which column is which', box);
  return box;
}

// The review. Nothing is saved until Save; Save is one undo step.
export function review(app, res, fileName, { ym = null, onSaved = null, bankMap = null } = {}) {
  const ref = app.ctx.ref, now = app.ctx.now();
  const months = monthsIn(res.transactions);
  const S = { ym: pickMonth(res.transactions, ym), rules: {}, mapEdits: {}, picking: null, open: new Set(['unmatched']), picks: new Map(), accepted: new Map(), first: new Set() };
  let close, list = [];
  const lines = linesOf(app.store.doc, ref);
  const lineName = id => { const l = lines.find(x => x.id === id); return l ? (l.name || l.values?.category || 'Line') : null; };
  // Match with the rules and map edits made on this screen, then put back what the coach picked and accepted.
  const rematch = () => {
    const d = app.store.doc;
    const own = { ...(d.settings?.importCategoryMap || {}) };
    if (res.fmt.id) own[res.fmt.id] = { ...(own[res.fmt.id] || {}), ...S.mapEdits };
    const doc = { ...d, settings: { ...d.settings, merchantRules: { ...(d.settings?.merchantRules || {}), ...S.rules }, importCategoryMap: own } };
    list = matchAll(res.transactions.filter(t => t.date.startsWith(S.ym)), { doc, ref, fmt: res.fmt, now })
      .map(t => { const p = S.picks.get(t.hash); const x = p ? pickFor(t, p, lines) : t; return { ...x, accepted: S.accepted.get(t.hash) ?? false, keepFirst: S.first.has(t.hash) }; });
  };
  const setAccepted = (rows, v) => { for (const t of rows) if (!t.duplicate) S.accepted.set(t.hash, v); };
  const body = h('div.imp-body');
  const save = button('Save', { kind: 'primary', iconName: 'check', onClick: () => doSave() });
  const footAccept = button('Accept the matched too', { iconName: 'check', onClick: () => { setAccepted(list.filter(t => t.sure === 'Matched'), true); rematch(); draw(); } });
  const status = h('span.muted.small', { 'aria-live': 'polite' });
  const otherMonths = months.filter(m => m !== S.ym);

  const tagOf = t => h(`span.tag${t.sure === 'Matched' ? '.good' : t.sure === 'Guessed' ? '.guess' : '.plain'}`, { title: t.why }, t.sure);
  const targetWords = t => (t.kind === 'spend' ? (t.lineId ? lineName(t.lineId) : t.newCategory ? `${t.newCategory} (new line)` : 'Pick a line') : KINDS[t.kind]);
  const amountWords = t => (t.amount > 0 ? `+${money(t.amount, { cents: true })}` : money(-t.amount, { cents: true }));
  function picker(t) {
    const byCat = {};
    for (const l of lines) (byCat[categoryKeyOf(l)] ??= []).push(l);
    const choose = target => { if (t.sure === 'Not matched' || t.keepFirst) S.first.add(t.hash); S.picks.set(t.hash, target); S.accepted.set(t.hash, true); S.picking = null; rematch(); draw(); };
    return h('div.imp-picker', { role: 'group', 'aria-label': `Where ${t.merchant} goes` },
      ...CATEGORIES.filter(k => byCat[k]).map(k => h('div.imp-pick-group', {}, h('span.label', {}, categoryName(k)),
        h('div.imp-chips', {}, byCat[k].map(l => h(`button.btn.small${t.lineId === l.id ? '.on' : ''}`, { type: 'button', 'aria-pressed': String(t.lineId === l.id), onclick: () => choose(l.id) }, l.name || l.values?.category || 'Line'))))),
      h('div.imp-pick-group', {}, h('span.label', {}, 'Not spending'), h('div.imp-chips', {}, SPECIAL_PICKS.map(([v, text]) => h('button.btn.small', { type: 'button', 'aria-pressed': String(t.kind === KIND_OF_PICK[v] && !t.lineId), onclick: () => choose(v) }, text)))));
  }
  function rowOf(t) {
    const key = merchantKey(t.merchant);
    const target = t.kind === 'spend' ? t.lineId : Object.entries(KIND_OF_PICK).find(([, k]) => k === t.kind)?.[0];
    const ruled = S.rules[key] != null;
    const canRule = !t.duplicate && key && target && (S.picks.has(t.hash) || ruled); // only once the coach placed it by hand (slim by default)
    const acc = h(`button.btn.small.imp-accept${t.accepted ? '.on' : ''}`, { type: 'button', 'aria-pressed': String(!!t.accepted), disabled: t.duplicate || (t.kind === 'spend' && !t.lineId && !t.newCategory),
      title: t.duplicate ? 'Brought in before' : t.kind === 'spend' && !t.lineId && !t.newCategory ? 'Pick a line first' : null,
      onclick: () => { setAccepted([t], !t.accepted); rematch(); draw(); } }, icon('check'), t.accepted ? 'Accepted' : 'Accept');
    const chip = h('button.per-chip.imp-target', { type: 'button', 'aria-expanded': String(S.picking === t.hash), disabled: t.duplicate, title: t.why,
      onclick: () => { S.picking = S.picking === t.hash ? null : t.hash; draw(); } }, targetWords(t), icon('down'));
    return h(`div.imp-row${t.duplicate ? '.muted' : ''}`, { 'data-hash': t.hash },
      h('div.imp-main', {}, t.duplicate ? h('span.imp-acc-slot') : acc,
        h('span.imp-date.small', {}, shortDate(t.date)),
        h('span.imp-what', {}, h('strong', {}, t.merchant || t.description || '(no name)'), h('span.muted.small', {}, t.why)),
        h('span.num.imp-amt', {}, amountWords(t)),
        h('span.imp-right', {}, chip, t.duplicate ? h('span.tag.plain', {}, 'Already imported') : tagOf(t))),
      S.picking === t.hash ? picker(t) : null,
      canRule ? h('div.imp-rule', {}, checkbox(`Always put ${t.merchant} here`, ruled, v => { if (v) S.rules[key] = target; else delete S.rules[key]; rematch(); draw(); }, { key: `imp:rule:${t.hash}` })) : null);
  }
  function groupBox(g) {
    const d = h('details.review-group.imp-group', { open: S.open.has(g.id) });
    d.ontoggle = () => { if (d.open) S.open.add(g.id); else S.open.delete(g.id); };
    const left = g.rows.filter(t => !t.accepted && !t.duplicate && !(t.kind === 'spend' && !t.lineId && !t.newCategory));
    d.append(h('summary', {}, h('strong', {}, g.title), h('span.muted', {}, `  ${g.total != null ? `${money(g.total, { cents: true })} · ` : ''}${g.id === 'unmatched' ? `${g.left} of ${plural(g.rows.length, 'row')} left` : plural(g.rows.length, 'row')}`),
      g.outside && g.id !== 'dupes' ? h('span.muted.small', {}, '  kept out of spending') : null),
    h('div.review-body', {}, left.length && g.id !== 'dupes' ? h('div.row-line', { style: { margin: '6px 0' } }, button(`Accept these ${left.length}`, { size: 'small', onClick: () => { setAccepted(left, true); rematch(); draw(); } })) : null,
      ...g.rows.map(rowOf)));
    return d;
  }
  function mapBox() {
    if (!['rocket', 'monarch'].includes(res.fmt.id)) return null;
    const cats = [...new Set(list.map(t => t.appCategory).filter(Boolean))].sort();
    if (!cats.length) return null;
    const own = app.store.doc.settings?.importCategoryMap?.[res.fmt.id] || {};
    const base = ref.importCategories[res.fmt.id] || {};
    const lineCats = [...new Set(lines.map(l => l.values?.category).filter(Boolean))].sort();
    const options = [...lineCats.map(c => [c, c]), ...SPECIAL_PICKS];
    const valueOf = c => (Object.hasOwn(S.mapEdits, c) ? S.mapEdits[c] : Object.hasOwn(own, c) ? own[c] : base[c] ?? null);
    const d = h('details.review-group.imp-group', { open: S.open.has('map') });
    d.ontoggle = () => { if (d.open) S.open.add('map'); else S.open.delete('map'); };
    d.append(h('summary', {}, h('strong', {}, `How ${res.fmt.name}'s categories land`), h('span.muted', {}, `  ${plural(cats.length, 'category', 'categories')} in this file, kept for this client`)),
      h('div.review-body.imp-map', {}, cats.map(c => h('div.imp-map-row', {}, h('span', {}, c),
        select(options, valueOf(c), v => { S.mapEdits[c] = v; rematch(); draw(); }, { label: `Where ${c} lands`, hint: 'Not matched', width: 270 })))));
    return d;
  }
  function draw() {
    const rv = reviewOf(list, { ref, lines });
    const savable = list.filter(t => t.accepted && !t.duplicate && !(t.kind === 'spend' && !t.lineId && !t.newCategory));
    save.lastChild.textContent = `Save ${savable.length} as ${monthName(S.ym)} actuals`;
    save.disabled = !savable.length;
    const matched = list.filter(t => !t.duplicate && t.sure === 'Matched' && !t.accepted).length;
    // Batch 37 (Rocket Surgery): a first-time coach placed the 2 Not matched rows and pressed Save, and only those 2 went
    // in. The footer says what stays out and offers the matched ones in one tap, beside Save.
    const left = rv.newRows - savable.length;
    status.textContent = !rv.newRows ? 'Nothing new: every row this month was imported before.' : left ? `${savable.length} of ${rv.newRows} accepted; the other ${left} stay out until accepted.` : `All ${rv.newRows} accepted.`;
    footAccept.hidden = !matched;
    footAccept.lastChild.textContent = `Accept the ${matched} matched too`;
    body.replaceChildren(...[
      h('div.imp-summary', {}, h('span', {}, h('strong', {}, money(rv.spending, { cents: true })), ' spending'),
        h('span.muted', {}, `${rv.counts.Matched} matched · ${rv.counts.Guessed} guessed · ${rv.counts['Not matched']} not matched${rv.duplicates ? ` · ${rv.duplicates} already imported` : ''}`),
        h('span', { style: { flex: 1 } }),
        button(matched ? `Accept all matched (${matched})` : 'All matched accepted', { size: 'small', iconName: 'check', disabled: !matched, onClick: () => { setAccepted(list.filter(t => t.sure === 'Matched'), true); rematch(); draw(); } })),
      ...rv.groups.filter(g => g.rows.length || g.id === 'unmatched').map(g => (g.id === 'unmatched' && !g.rows.length ? h('p.muted.small.imp-none', {}, 'Every row found a place.') : groupBox(g))),
      mapBox()].filter(Boolean));
  }
  function doSave() {
    const r = saveImport(app.store, ref, list, { ym: S.ym, fmt: res.fmt, fileName, rules: S.rules, mapEdits: S.mapEdits, bankMap, now });
    close();
    if (!r.saved) { toast('Rules saved. No rows were saved.', { undo: () => app.store.undo() }); return; }
    toast(`${plural(r.saved, 'row')} saved as ${monthName(S.ym)} actuals${r.newLines ? `, ${plural(r.newLines, 'new line')}` : ''}.`, { undo: () => app.store.undo(), action: onSaved ? null : { label: 'See Month end', run: () => app.go('#/cash-flow/close') } });
    onSaved?.(S.ym);
  }
  rematch();
  const monthPick = months.length > 1 ? h('div.row-line.imp-months', {}, h('span.label', {}, 'Month'),
    toggle(months.map(m => [m, monthName(m, 'short')]), S.ym, v => { if (!v) return; S.ym = v; S.picks.clear(); S.accepted.clear(); S.first.clear(); rematch(); draw(); }, { label: 'Month to bring in' })) : null;
  const box = h('div.ft-box.imp-box', {},
    h('div.ft-head', {}, icon('upload'), h('h2', { style: { margin: 0 } }, 'Review before saving'), h('span', { style: { flex: 1 } }), button('Cancel', { onClick: () => close() })),
    h('p.muted.imp-found', {}, `${formatWords(res.fmt, res.transactions.length)} ${otherMonths.length ? 'One month comes in at a time.' : ''} Nothing is saved until you press Save.`),
    monthPick, body,
    h('div.ft-foot', {}, footAccept, save, button('Cancel', { onClick: () => close() }), status, h('span.muted.small', {}, 'Undo puts the whole import back.')));
  draw();
  close = overlayOf('Review the import', box);
  return box;
}
